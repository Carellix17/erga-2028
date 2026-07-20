import { describe, it, expect } from "vitest";
import {
  parsePages,
  buildPageOutline,
  sliceByPageRange,
  sampleAcrossPages,
  maxPageNumber,
  isLongDocument,
} from "../../supabase/functions/_shared/pagemap";

// ── Officina del libro finto ────────────────────────────────────────────────
// Costruisce un "libro" con marcatori === PAGINA N === come quelli scritti
// da extract-pdf. Ogni pagina ha un contenuto riconoscibile per le asserzioni.
function makeBook(pages: { num: number; text: string }[]): string {
  return pages.map((p) => `=== PAGINA ${p.num} ===\n${p.text}`).join("\n\n");
}

function makeLongBook(numPages: number, charsPerPage: number): string {
  const pages = [];
  for (let i = 1; i <= numPages; i++) {
    const seed = `CONTENUTO-UNIVOCO-PAGINA-${i} `;
    const filler = `Capitolo ${Math.ceil(i / 10)} parla di argomenti importanti. `.repeat(
      Math.ceil(charsPerPage / 50),
    );
    pages.push({ num: i, text: (seed + filler).slice(0, charsPerPage) });
  }
  return makeBook(pages);
}

describe("parsePages — lo smistatore", () => {
  it("senza marcatori non trova pagine", () => {
    expect(parsePages("")).toEqual([]);
    expect(parsePages("testo libero senza marcatori")).toEqual([]);
  });

  it("divide le pagine in ordine con numeri e testo giusti", () => {
    const book = makeBook([
      { num: 1, text: "Introduzione alla storia romana" },
      { num: 2, text: "La fondazione di Roma" },
      { num: 3, text: "La repubblica" },
    ]);
    const pages = parsePages(book);
    expect(pages).toHaveLength(3);
    expect(pages[0]).toEqual({ num: 1, text: "Introduzione alla storia romana" });
    expect(pages[2].num).toBe(3);
    expect(pages[2].text).toContain("repubblica");
  });

  it("ignora il testo prima del primo marker (copertina fuori mappa)", () => {
    const pages = parsePages("Prefazione fuori mappa\n=== PAGINA 1 ===\nContenuto vero");
    expect(pages).toHaveLength(1);
    expect(pages[0].text).toBe("Contenuto vero");
  });

  it("tollera numerazione a buchi (extract-pdf salta le pagine vuote)", () => {
    const book = makeBook([
      { num: 1, text: "Prima" },
      { num: 3, text: "Terza (la 2 era vuota)" },
      { num: 7, text: "Settima" },
    ]);
    expect(parsePages(book).map((p) => p.num)).toEqual([1, 3, 7]);
  });
});

describe("buildPageOutline — la mappa del cartografo", () => {
  it("una riga per pagina con prefisso P<numero>", () => {
    const outline = buildPageOutline(
      parsePages(makeBook([
        { num: 1, text: "Il sistema solare è formato da otto pianeti" },
        { num: 2, text: "Mercurio è il pianeta più vicino al Sole" },
      ])),
      240,
    );
    const lines = outline.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^P1: Il sistema solare/);
    expect(lines[1]).toMatch(/^P2: Mercurio/);
  });

  it("salta i numeri di pagina isolati e prende le righe vere", () => {
    const outline = buildPageOutline(
      parsePages(makeBook([{ num: 4, text: "42\n\nLa fotosintesi clorofilliana è il processo chiave" }])),
      240,
    );
    expect(outline).toBe("P4: La fotosintesi clorofilliana è il processo chiave");
  });

  it("blocco unico senza a-capo (pdfjs) → uso l'inizio del blocco", () => {
    const bigBlock = "La Rivoluzione francese iniziò nel 1789 con la presa della Bastiglia ".repeat(5);
    const outline = buildPageOutline(parsePages(makeBook([{ num: 9, text: bigBlock }])), 120);
    expect(outline.startsWith("P9: La Rivoluzione francese")).toBe(true);
    expect(outline.length).toBeLessThanOrEqual(120 + 5); // "P9: " + ellissi
  });

  it("pagina senza parole vere → marcata come poco testo, ma resta in elenco", () => {
    const outline = buildPageOutline(
      parsePages(makeBook([
        { num: 1, text: "Contenuto abbastanza lungo da essere una riga vera" },
        { num: 2, text: "12" },
      ])),
      240,
    );
    expect(outline.split("\n")).toHaveLength(2);
    expect(outline).toContain("P2: [poco testo: figure/immagini]");
  });

  it("sopra le 150 pagine passa a una riga sola per pagina (compattezza)", () => {
    const texts = Array.from({ length: 160 }, (_, i) => ({
      num: i + 1,
      text: "Prima riga significativa della pagina\nSeconda riga che non deve comparire",
    }));
    const outline = buildPageOutline(parsePages(makeBook(texts)), 240);
    expect(outline.split("\n")).toHaveLength(160);
    expect(outline).not.toContain("Seconda riga");
  });
});

describe("sliceByPageRange — lo scaffale giusto", () => {
  const book = makeBook([
    { num: 1, text: "Capitolo uno" },
    { num: 2, text: "Capitolo due" },
    { num: 3, text: "Capitolo tre segreto" },
    { num: 4, text: "Capitolo quattro" },
  ]);

  it("estrae SOLO l'intervallo chiesto, ricostruendo i marcatori", () => {
    const slice = sliceByPageRange(book, 2, 3, 80000);
    expect(slice).not.toContain("Capitolo uno");
    expect(slice).toContain("=== PAGINA 2 ===\nCapitolo due");
    expect(slice).toContain("=== PAGINA 3 ===\nCapitolo tre segreto");
    expect(slice).not.toContain("Capitolo quattro");
  });

  it("intervallo unico pagina → quella pagina sola", () => {
    const slice = sliceByPageRange(book, 4, 4, 80000);
    expect(slice).toBe("=== PAGINA 4 ===\nCapitolo quattro");
  });

  it("intervallo invertito (per sbaglio) → si comporta bene lo stesso", () => {
    const slice = sliceByPageRange(book, 3, 2, 80000);
    expect(slice).toContain("Capitolo due");
    expect(slice).toContain("Capitolo tre segreto");
  });

  it("pagine assenti → stringa vuota (il chiamante ripiega sul testo intero)", () => {
    expect(sliceByPageRange("nessun marker qui", 1, 5, 80000)).toBe("");
    expect(sliceByPageRange(book, 90, 99, 80000)).toBe("");
  });

  it("il cap ferma la consegna ma non spezza la PRIMA pagina dell'intervallo", () => {
    const hugeBook = makeBook([
      { num: 10, text: "A".repeat(1000) },
      { num: 11, text: "B".repeat(1000) },
    ]);
    const slice = sliceByPageRange(hugeBook, 10, 11, 300);
    expect(slice).toContain("A".repeat(100)); // la prima pagina c'è tutta
    expect(slice).not.toContain("BBB"); // la seconda non entra nel cap
  });
});

describe("sampleAcrossPages — l'assaggio di tutto il libro", () => {
  it("contenuto corto → restituito com'è", () => {
    const short = "testo breve senza problemi";
    expect(sampleAcrossPages(short, 80000)).toBe(short);
  });

  it("senza marcatori → troncatura classica di sicurezza", () => {
    const plain = "x".repeat(1000);
    expect(sampleAcrossPages(plain, 300)).toHaveLength(300);
  });

  it("LA PROVA DELLE NOVE: il libro lungo contribuisce con la PRIMA e l'ULTIMA pagina", () => {
    // 30 pagine × ~3000 caratteri ≈ 90k > cap 80k → la vecchia troncatura
    // avrebbe perso le pagine finali; l'assaggio no.
    const book = makeLongBook(30, 3000);
    const sampled = sampleAcrossPages(book, 80000);
    expect(sampled).toContain("CONTENUTO-UNIVOCO-PAGINA-1");
    expect(sampled).toContain("CONTENUTO-UNIVOCO-PAGINA-30");
    expect(sampled.length).toBeLessThanOrEqual(80000);
    expect(sampled).toContain("=== PAGINA 30 ===");
  });
});

describe("maxPageNumber & isLongDocument — il metro della fabbrica", () => {
  it("trova l'ultima pagina reale o 0", () => {
    expect(maxPageNumber(makeBook([{ num: 1, text: "a" }, { num: 12, text: "b" }]))).toBe(12);
    expect(maxPageNumber("niente marcatori")).toBe(0);
  });

  it("documento lungo = marcatori + oltre il tetto di una chiamata", () => {
    const longBook = makeLongBook(60, 2000); // ~120k caratteri
    expect(isLongDocument(longBook, 80000)).toBe(true);
    const shortBook = makeBook([
      { num: 1, text: "breve" },
      { num: 2, text: "breve anche questa" },
    ]);
    expect(isLongDocument(shortBook, 80000)).toBe(false);
    const plainLong = "y".repeat(120000);
    expect(isLongDocument(plainLong, 80000)).toBe(false); // senza marcatori: strada classica
  });
});
