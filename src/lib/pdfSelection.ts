/** Keep the original PDF (including its text and figures) unless a subset is requested. */
export async function selectPdfPages(file: File, pages: number[] | undefined): Promise<File> {
  if (!pages) return file;
  if (pages.length === 0) throw new Error(`Seleziona almeno una pagina di ${file.name}.`);
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.load(await file.arrayBuffer());
  const unique = [...new Set(pages)].sort((a, b) => a - b);
  if (unique.some(page => !Number.isInteger(page) || page < 1 || page > source.getPageCount())) {
    throw new Error("La selezione contiene una pagina non valida.");
  }
  if (unique.length === source.getPageCount()) return file;
  const document = await PDFDocument.create();
  for (const page of await document.copyPages(source, unique.map(page => page - 1))) document.addPage(page);
  const bytes = await document.save();
  return new File([new Uint8Array(bytes)], file.name.replace(/\.pdf$/i, "-selezione.pdf"), { type: "application/pdf" });
}
