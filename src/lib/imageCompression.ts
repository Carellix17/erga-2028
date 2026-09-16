/**
 * Ricodifica lato client delle foto prima dell'upload.
 * Lato lungo max 2000 px, JPEG qualità 0.82, orientamento EXIF rispettato.
 * Una foto da smartphone (8–20 MB) scende tipicamente sotto i 300 KB.
 */

export const MAX_IMAGE_SIDE = 2000;
export const IMAGE_QUALITY = 0.82;

export interface CompressionResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
}

/** "1,8 MB" / "742 KB" — formato italiano. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Decodifica rispettando l'orientamento EXIF (createImageBitmap) con fallback <img>. */
async function decode(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        release: () => bitmap.close?.(),
      };
    } catch {
      /* fallback sotto */
    }
  }

  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    release: () => URL.revokeObjectURL(url),
  };
}

/**
 * Ricodifica una singola immagine. Se qualcosa va storto (formato esotico,
 * canvas non disponibile) restituisce il file originale: non si blocca mai
 * il caricamento dell'utente.
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const originalBytes = file.size;
  try {
    const source = await decode(file);
    const { width, height } = source;
    if (!width || !height) throw new Error("empty image");

    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.fillStyle = "#ffffff"; // niente trasparenza nera nei PNG convertiti in JPEG
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingQuality = "high";
    source.draw(ctx, targetW, targetH);
    source.release();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY)
    );
    if (!blob || blob.size === 0) throw new Error("encode failed");

    // Se la ricodifica non aiuta (foto già piccola), tieni l'originale.
    if (blob.size >= originalBytes) {
      return { file, originalBytes, compressedBytes: originalBytes };
    }

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    const compressed = new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    return { file: compressed, originalBytes, compressedBytes: compressed.size };
  } catch {
    return { file, originalBytes, compressedBytes: originalBytes };
  }
}

export async function compressImages(files: File[]): Promise<CompressionResult[]> {
  const out: CompressionResult[] = [];
  for (const f of files) out.push(await compressImage(f)); // sequenziale: meno memoria su telefono
  return out;
}
