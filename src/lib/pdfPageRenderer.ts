import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

const MAX_PAGES = 50;
const RENDER_SCALE = 1.5; // Good quality without being too large

/**
 * Renders PDF pages as PNG blobs from a File object.
 * Returns an array of { pageNum, blob } for each rendered page.
 */
export async function renderPdfPages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNum: number; blob: Blob }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = Math.min(pdf.numPages, MAX_PAGES);
  const results: { pageNum: number; blob: Blob }[] = [];

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i, numPages);
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.85
        );
      });

      results.push({ pageNum: i, blob });
      
      // Cleanup
      canvas.width = 0;
      canvas.height = 0;
    } catch (err) {
      console.warn(`Failed to render page ${i}:`, err);
    }
  }

  return results;
}

/**
 * Renders a specific range of pages from a PDF (downloaded as bytes).
 * Returns base64-encoded JPEGs (without data: prefix) ready for AI vision.
 */
export async function renderPdfPagesRangeAsBase64(
  pdfBytes: ArrayBuffer | Uint8Array,
  startPage: number,
  endPage: number,
  scale = 1.4,
): Promise<{ pageNum: number; b64: string }[]> {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const results: { pageNum: number; b64: string }[] = [];
  const last = Math.min(endPage, pdf.numPages);
  for (let i = startPage; i <= last; i++) {
    try {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      const b64 = dataUrl.split(",")[1] || "";
      results.push({ pageNum: i, b64 });
      canvas.width = 0;
      canvas.height = 0;
    } catch (err) {
      console.warn(`Failed to render page ${i}:`, err);
    }
  }
  return results;
}

/**
 * Crops a region (in % coords 0-100) from a single PDF page using Canvas.
 * Returns base64 JPEG of ONLY the cropped region (no `data:` prefix).
 * Strategy A: physical client-side crop — the file uploaded to Storage is the
 * actual figure, not the whole page.
 */
export async function renderPdfPageCropAsBase64(
  pdfBytes: ArrayBuffer | Uint8Array,
  pageNum: number,
  bbox: { x: number; y: number; width: number; height: number },
  scale = 2.0,
): Promise<string | null> {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    if (pageNum < 1 || pageNum > pdf.numPages) return null;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // 1. Render the full page to an off-screen canvas
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = viewport.width;
    fullCanvas.height = viewport.height;
    const fullCtx = fullCanvas.getContext("2d")!;
    await page.render({ canvasContext: fullCtx, viewport }).promise;

    // 2. Compute crop rect in pixels from % bbox (clamped)
    const x = Math.max(0, Math.min(100, bbox.x)) / 100 * viewport.width;
    const y = Math.max(0, Math.min(100, bbox.y)) / 100 * viewport.height;
    const w = Math.max(1, Math.min(100 - bbox.x, bbox.width)) / 100 * viewport.width;
    const h = Math.max(1, Math.min(100 - bbox.y, bbox.height)) / 100 * viewport.height;

    // 3. Draw the crop region into a smaller canvas
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.round(w);
    cropCanvas.height = Math.round(h);
    const cropCtx = cropCanvas.getContext("2d")!;
    cropCtx.drawImage(
      fullCanvas,
      x, y, w, h,        // source rect
      0, 0, cropCanvas.width, cropCanvas.height, // dest rect
    );

    const dataUrl = cropCanvas.toDataURL("image/jpeg", 0.88);
    const b64 = dataUrl.split(",")[1] || null;

    // Cleanup
    fullCanvas.width = 0;
    fullCanvas.height = 0;
    cropCanvas.width = 0;
    cropCanvas.height = 0;

    return b64;
  } catch (err) {
    console.warn(`Failed to crop page ${pageNum}:`, err);
    return null;
  }
}
