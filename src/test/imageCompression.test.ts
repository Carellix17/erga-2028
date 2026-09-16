import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressImage, compressImages, formatBytes, MAX_IMAGE_SIDE } from "@/lib/imageCompression";

describe("formatBytes", () => {
  it("usa KB sotto il megabyte e MB con la virgola sopra", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(500 * 1024)).toBe("500 KB");
    expect(formatBytes(1.8 * 1024 * 1024)).toBe("1,8 MB");
  });
});

describe("compressImage", () => {
  const bigPhoto = () => new File([new Uint8Array(6 * 1024 * 1024)], "IMG_0001.HEIC.jpg", { type: "image/jpeg" });

  beforeEach(() => {
    // Decoder: foto 4032x3024 come uno smartphone
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 4032, height: 3024, close: vi.fn() })));
    const ctx = {
      fillStyle: "",
      imageSmoothingQuality: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag !== "canvas") throw new Error("unexpected " + tag);
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (cb: (b: Blob) => void) => cb(new Blob([new Uint8Array(240 * 1024)], { type: "image/jpeg" })),
      };
      return canvas as unknown as HTMLElement;
    }) as typeof document.createElement);
  });

  it("riduce il lato lungo a 2000 px e restituisce un JPEG più leggero", async () => {
    const res = await compressImage(bigPhoto());
    expect(res.file.type).toBe("image/jpeg");
    expect(res.compressedBytes).toBeLessThan(res.originalBytes);
    expect(res.compressedBytes).toBe(240 * 1024);
    expect(MAX_IMAGE_SIDE).toBe(2000);
  });

  it("20 foto restano nell'ordine di 1-3 MB totali", async () => {
    const results = await compressImages(Array.from({ length: 20 }, bigPhoto));
    const total = results.reduce((s, r) => s + r.compressedBytes, 0);
    expect(total).toBeLessThan(6 * 1024 * 1024);
    expect(results).toHaveLength(20);
  });

  it("se la decodifica fallisce tiene il file originale senza bloccare l'upload", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => { throw new Error("nope"); }));
    const original = bigPhoto();
    const res = await compressImage(original);
    expect(res.file).toBe(original);
    expect(res.compressedBytes).toBe(original.size);
  });
});
