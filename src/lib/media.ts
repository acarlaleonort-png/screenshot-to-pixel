import { supabase } from "@/integrations/supabase/client";

/** Bucket for avatar, cover and sales-page previews (readable by everyone through signed URLs). */
export const PUBLIC_BUCKET = "public-media";
/** Bucket for subscriber-only files. Read access is decided by the database (plan of the active subscription). */
export const PROTECTED_BUCKET = "protected-content";
export type MediaBucket = typeof PUBLIC_BUCKET | typeof PROTECTED_BUCKET;
export type MediaRef = { bucket: string; storage_path: string } | null | undefined;
export type MediaSource = { kind: "storage"; bucket: string; path: string } | { kind: "legacy"; url: string } | null;

/** Stored file wins; otherwise fall back to the old typed-in link. */
export function pickMediaSource(media: MediaRef, legacyUrl: string | null | undefined): MediaSource {
  if (media?.bucket && media.storage_path) return { kind: "storage", bucket: media.bucket, path: media.storage_path };
  if (legacyUrl && /^https?:\/\//i.test(legacyUrl)) return { kind: "legacy", url: legacyUrl };
  return null;
}

export function mediaTypeFromMime(mime: string): "image" | "video" | "audio" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

export function buildStoragePath(folder: string, fileName: string, id: string = crypto.randomUUID()) {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${folder}/${id}${ext ? `.${ext}` : ""}`;
}

async function readDimensions(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/")) {
      const img = new Image();
      await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
      return { width: img.naturalWidth, height: img.naturalHeight };
    }
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      await new Promise((ok, fail) => { v.onloadedmetadata = ok; v.onerror = fail; v.src = url; });
      return { width: v.videoWidth, height: v.videoHeight, duration: Math.round(v.duration) };
    }
  } catch { /* metadata is optional */ } finally { URL.revokeObjectURL(url); }
  return {};
}

/** Admin only (enforced by storage + table policies). Uploads the file and records its metadata. */
export async function uploadMedia(file: File, bucket: MediaBucket, folder: string, altText?: string) {
  const path = buildStoragePath(folder, file.name);
  const up = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const dims = await readDimensions(file);
  const { data, error } = await supabase.from("media").insert({
    bucket, storage_path: path, file_name: file.name, mime_type: file.type,
    media_type: mediaTypeFromMime(file.type), size: file.size, alt_text: altText ?? null, ...dims,
  }).select().single();
  if (error) { await supabase.storage.from(bucket).remove([path]); throw new Error(error.message); }
  return data;
}

/** Turns sources into displayable URLs. Storage files get short-lived signed URLs (only issued if the policy allows). */
export async function resolveSources(sources: MediaSource[], expiresIn = 3600): Promise<(string | null)[]> {
  const byBucket = new Map<string, string[]>();
  for (const s of sources) if (s?.kind === "storage") byBucket.set(s.bucket, [...(byBucket.get(s.bucket) ?? []), s.path]);
  const signed = new Map<string, string>();
  await Promise.all([...byBucket].map(async ([bucket, paths]) => {
    const { data } = await supabase.storage.from(bucket).createSignedUrls([...new Set(paths)], expiresIn);
    for (const d of data ?? []) if (d.signedUrl && d.path) signed.set(`${bucket}/${d.path}`, d.signedUrl);
  }));
  return sources.map((s) => (!s ? null : s.kind === "legacy" ? s.url : signed.get(`${s.bucket}/${s.path}`) ?? null));
}
