import { splitSourcePaths, pickPdfPath } from "@/lib/sourcePaths";

/**
 * 🧪 P19 — Collaudo delle rotaie sorgente (il baco della lista-con-virgola).
 */
describe("splitSourcePaths / pickPdfPath (P19)", () => {
  it("null, undefined e stringa vuota → nessuna rotaia", () => {
    expect(splitSourcePaths(null)).toEqual([]);
    expect(splitSourcePaths(undefined)).toEqual([]);
    expect(splitSourcePaths("")).toEqual([]);
    expect(pickPdfPath(null)).toBeNull();
    expect(pickPdfPath(undefined)).toBeNull();
    expect(pickPdfPath("")).toBeNull();
  });

  it("PDF singolo (il mondo pre-P17) → il PDF", () => {
    expect(pickPdfPath("uid/1234_manuale.pdf")).toBe("uid/1234_manuale.pdf");
  });

  it("PDF primo di una lista → il PDF (guasto n.1 sanato)", () => {
    expect(pickPdfPath("uid/a.pdf,uid/b.docx")).toBe("uid/a.pdf");
  });

  it("PDF in coda alla lista → il PDF (guasto n.2 sanato: niente più 404 da 'a.txt,b.pdf')", () => {
    expect(pickPdfPath("uid/b.txt,uid/a.pdf")).toBe("uid/a.pdf");
  });

  it("estensione maiuscola (.PDF) → lo trova lo stesso", () => {
    expect(pickPdfPath("uid/foto.jpg,uid/DISPENSA.PDF")).toBe("uid/DISPENSA.PDF");
  });

  it("lista di soli testuali/foto → null (figure da altre rotaie)", () => {
    expect(pickPdfPath("uid/a.txt,uid/b.md")).toBeNull();
    expect(pickPdfPath("uid/9_photos_0_primo.jpg,uid/9_photos_1_secondo.jpg")).toBeNull();
  });

  it("percorso web (miniature wiki_img) → null", () => {
    expect(pickPdfPath("uid/7_wiki_img_0__bastiglia.jpg,uid/7_wiki_img_1__mappa.png")).toBeNull();
  });

  it("più PDF: vince il PRIMO (il capostipite del percorso)", () => {
    expect(pickPdfPath("uid/primo.pdf,uid/secondo.pdf")).toBe("uid/primo.pdf");
  });

  it("spazi e segmenti vuoti vengono assorbiti", () => {
    expect(splitSourcePaths(" uid/a.pdf , , uid/b.pdf ")).toEqual(["uid/a.pdf", "uid/b.pdf"]);
    expect(pickPdfPath("uid/a.docx, ,uid/z.pdf")).toBe("uid/z.pdf");
  });
});
