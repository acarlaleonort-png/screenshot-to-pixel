import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { displayTotal } from "@/lib/social-proof";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const getLandingData = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [settings, benefits, faqs, plans, previews, links, counters, real] = await Promise.all([
    sb.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("benefits").select("*").eq("active", true).order("sort_order"),
    sb.from("faqs").select("*").eq("active", true).order("sort_order"),
    sb.from("plans").select("*").eq("active", true).order("sort_order"),
    sb.from("content_previews").select("*, thumb:media!content_previews_thumbnail_media_id_fkey(bucket,storage_path)").eq("active", true).order("sort_order"),
    sb.from("social_links").select("id,title,description,url,icon,highlighted").eq("active", true).order("sort_order"),
    sb.from("social_proof_counters").select("counter_key,label,display_base,show_plus").eq("active", true).order("sort_order"),
    sb.rpc("social_proof_real_counts"),
  ]);
  const realMap = new Map((real.data ?? []).map((r) => [r.counter_key, Number(r.real_count)]));
  const st = settings.data;
  const mediaIds = [st?.avatar_media_id, st?.cover_media_id].filter((x): x is string => !!x);
  const { data: settingsMedia } = mediaIds.length
    ? await sb.from("media").select("id,bucket,storage_path").in("id", mediaIds)
    : { data: [] as { id: string; bucket: string; storage_path: string }[] };
  const prevs = previews.data ?? [];
  // Uploaded files (public-media bucket) take precedence over legacy typed-in links.
  const paths = [
    ...(settingsMedia ?? []).filter((m) => m.bucket === "public-media").map((m) => m.storage_path),
    ...prevs.map((p) => (p.thumb?.bucket === "public-media" ? p.thumb.storage_path : null)).filter((x): x is string => !!x),
  ];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await sb.storage.from("public-media").createSignedUrls([...new Set(paths)], 60 * 60 * 12);
    const internal = process.env["SUPABASE_URL"]?.replace(/\/+$/, "");
    const browser = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.replace(/\/+$/, "");
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, internal && browser ? d.signedUrl.replace(internal, browser) : d.signedUrl);
  }
  const urlFor = (id: string | null | undefined) => {
    const m = settingsMedia?.find((x) => x.id === id);
    return m ? signed.get(m.storage_path) ?? null : null;
  };
  return {
    settings: st ? { ...st, avatar_url: urlFor(st.avatar_media_id) ?? st.avatar_url, cover_url: urlFor(st.cover_media_id) ?? st.cover_url } : st,
    benefits: benefits.data ?? [],
    faqs: faqs.data ?? [],
    plans: plans.data ?? [],
    links: links.data ?? [],
    counters: (counters.data ?? []).map((c) => ({ key: c.counter_key, label: c.label, show_plus: c.show_plus, value: displayTotal(c.display_base, realMap.get(c.counter_key) ?? 0) })),
    previews: prevs.map(({ thumb, ...p }) => ({ ...p, thumbnail_url: (thumb ? signed.get(thumb.storage_path) : null) ?? p.thumbnail_url })),
  };
});
