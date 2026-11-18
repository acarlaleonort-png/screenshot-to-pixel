import { describe, expect, it } from "vitest";
import { buildStoragePath, mediaTypeFromMime, pickMediaSource } from "./media";

describe("media source", () => {
  it("new content stored in Storage uses the stored file", () => {
    expect(pickMediaSource({ bucket: "protected-content", storage_path: "content/a.jpg" }, "https://old.example/a.jpg"))
      .toEqual({ kind: "storage", bucket: "protected-content", path: "content/a.jpg" });
  });
  it("legacy content with only a link keeps working", () => {
    expect(pickMediaSource(null, "https://old.example/a.jpg")).toEqual({ kind: "legacy", url: "https://old.example/a.jpg" });
  });
  it("nothing to show when there is no file and no valid link", () => {
    expect(pickMediaSource(null, "")).toBeNull();
    expect(pickMediaSource(undefined, "javascript:alert(1)")).toBeNull();
  });
  it("detects media type from file type", () => {
    expect(mediaTypeFromMime("video/mp4")).toBe("video");
    expect(mediaTypeFromMime("image/png")).toBe("image");
    expect(mediaTypeFromMime("application/pdf")).toBe("file");
  });
  it("storage path never reuses the original file name", () => {
    expect(buildStoragePath("content", "Minha Foto.JPG", "abc")).toBe("content/abc.jpg");
  });
});
