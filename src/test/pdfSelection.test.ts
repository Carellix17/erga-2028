// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { selectPdfPages } from "@/lib/pdfSelection";

async function fixture() {
  const document = await PDFDocument.create();
  for (const width of [200, 300, 400]) document.addPage([width, 500]);
  return new File([new Uint8Array(await document.save())], "appunti.pdf", { type: "application/pdf" });
}

describe("PDF page selection", () => {
  it("keeps the original file when all pages are used", async () => {
    const file = await fixture();
    expect(await selectPdfPages(file, undefined)).toBe(file);
    expect(await selectPdfPages(file, [1, 2, 3])).toBe(file);
  });
  it("copies only the requested pages, in document order and without duplicates", async () => {
    const file = await fixture();
    const selected = await selectPdfPages(file, [3, 1, 3]);
    const document = await PDFDocument.load(await selected.arrayBuffer());
    expect(document.getPages().map(page => page.getWidth())).toEqual([200, 400]);
    expect(selected.name).toBe("appunti-selezione.pdf");
    expect((await PDFDocument.load(await file.arrayBuffer())).getPageCount()).toBe(3);
  });
  it("rejects empty, invalid and fractional selections before uploading", async () => {
    const file = await fixture();
    for (const pages of [[], [0], [4], [1.5]]) {
      await expect(selectPdfPages(file, pages)).rejects.toThrow();
    }
  });
});
