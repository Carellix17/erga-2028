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
