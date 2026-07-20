/**
 * 🗺️ LA MAPPA DELLE PAGINE — pacco P6 ("il cartografo").
 *
 * Problema: il testo estratto dai PDF può superare di molto quello che una
 * singola chiamata AI riesce a "tenere d'occhio" (~80k caratteri). Prima di P6
 * il generatore troncava ciecamente in coda: dai libri lunghi nascevano
 * indici di lezioni che coprivano solo l'inizio, e le lezioni dei capitoli
 * finali non esistevano proprio.
 *
 * Soluzione: il testo è già diviso in pagine dai marcatori "=== PAGINA N ==="
 * (scritti da extract-pdf). Questo modulo, puro e senza dipendenze, offre:
 *  - parsePages        → spezza il testo in pagine numerate
 *  - buildPageOutline  → la MAPPA: per ogni pagina una riga di anteprima,
 *                        abbastanza piccola da stare in UNA chiamata AI
 *  - sliceByPageRange  → lo "scaffale giusto": solo le pagine di una lezione
 *  - sampleAcrossPages → un assaggio distribuito su TUTTO il libro (test finale)
 *  - maxPageNumber     → l'ultima pagina reale del documento (0 se nessuna)
 *
 * È condiviso sia dalle edge function (Deno) sia dai test di collaudo (Node).
 */

export interface PdfPage {
  num: number;
  /** Testo della pagina SENZA il marker (già ripulito ai bordi). */
  text: string;
}

const PAGE_MARKER_RE = /=== PAGINA (\d+) ===/g;

/**
 * Spezza il contenuto in pagine usando i marcatori "=== PAGINA N ===".
 * Il testo prima del primo marker viene ignorato (copertina/prefazioni fuori
 * mappa). Le pagine restano nell'ordine in cui compaiono; i numeri possono
 * avere buchi (extract-pdf salta le pagine senza testo).
 */
export function parsePages(content: string): PdfPage[] {
  if (!content) return [];
  const markers: { num: number; index: number; length: number }[] = [];
  PAGE_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAGE_MARKER_RE.exec(content)) !== null) {
    const num = parseInt(m[1], 10);
    if (!isNaN(num)) markers.push({ num, index: m.index, length: m[0].length });
  }
  const pages: PdfPage[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index + markers[i].length;
    const end = i + 1 < markers.length ? markers[i + 1].index : content.length;
    pages.push({ num: markers[i].num, text: content.slice(start, end).trim() });
  }
  return pages;
}

/** L'ultimo numero di pagina presente nei marcatori (0 se non ce ne sono). */
export function maxPageNumber(content: string): number {
  let max = 0;
  PAGE_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PAGE_MARKER_RE.exec(content)) !== null) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return max;
}

/** Il documento è "lungo" se ha marcatori E non entra in una sola chiamata. */
export function isLongDocument(content: string, maxSingleCallChars: number): boolean {
  return content.length > maxSingleCallChars && maxPageNumber(content) >= 2;
}

/**
 * Righe significative di una pagina: saltiamo numeri di pagina isolati e
 * frammenti corti. Il text-layer di pdfjs spesso è un blocco unico senza
 * a-capo: in quel caso prendiamo semplicemente l'inizio del blocco.
 */
function meaningfulPreview(text: string, maxLines: number): string {
  const picked: string[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (line.length < 8) continue;
    if (/^\d{1,4}$/.test(line)) continue; // numero di pagina isolato
    picked.push(line);
    if (picked.length >= maxLines) break;
  }
  if (picked.length === 0) {
    // Fallback per il text-layer a blocco unico di pdfjs — ma con la STESSA
    // regola di significatività: se la pagina contiene solo un numero o
    // briciole, è onestamente da marcare come "poco testo" (preso dai collaudi).
    const block = text.trim().replace(/\s+/g, " ");
    if (block.length >= 8 && !/^\d{1,4}$/.test(block)) picked.push(block);
  }
  return picked.join(" — ");
}

/**
 * La MAPPA pagina-per-pagina per il cartografo AI:
 *   "P7: La repubblica oligarchica veneziana — Il Maggior Consiglio"
 * `perPageChars` calibra la compattezza (documenti enormi → righe più corte).
 * Le pagine con poco testo restano in elenco (marcate), così la numerazione
 * P resta completa e senza sorprese.
 */
export function buildPageOutline(pages: PdfPage[], perPageChars = 240): string {
  if (pages.length === 0) return "";
  const maxLines = pages.length > 150 ? 1 : 2;
  const lines: string[] = [];
  for (const p of pages) {
    let preview = meaningfulPreview(p.text, maxLines);
    if (!preview) preview = "[poco testo: figure/immagini]";
    if (preview.length > perPageChars) {
      preview = preview.slice(0, Math.max(1, perPageChars - 1)).trimEnd() + "…";
    }
    lines.push(`P${p.num}: ${preview}`);
  }
  return lines.join("\n");
}

/**
 * Lo "scaffale giusto": estrae SOLO le pagine comprese fra start e end
 * (inclusi), riscrivendo i marcatori come nell'originale. Se le pagine
 * mancano del tutto, restituisce "" (il chiamante ricade sul testo intero).
 * Il cap evita di consegnare all'AI una fetta comunque troppo grande.
 */
export function sliceByPageRange(
  content: string,
  start: number,
  end: number,
  cap: number,
): string {
  const pages = parsePages(content);
  if (pages.length === 0) return "";
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const blocks: string[] = [];
  let total = 0;
  for (const p of pages) {
    if (p.num < lo || p.num > hi) continue;
    const block = `=== PAGINA ${p.num} ===\n${p.text}`;
    if (blocks.length > 0 && total + block.length > cap) break;
    blocks.push(block);
    total += block.length + 2;
  }
  return blocks.join("\n\n");
}

/**
 * Un assaggio distribuito su TUTTE le pagine (per il test finale): a ogni
 * pagina tocca una fettina proporzionale, quindi anche le pagine FINALI del
 * libro entrano nel contesto. Senza marcatori ricade sulla troncatura classica.
 */
export function sampleAcrossPages(content: string, cap: number): string {
  if (content.length <= cap) return content;
  const pages = parsePages(content);
  if (pages.length < 2) return content.substring(0, cap);
  // Ogni blocco paga un "pedaggio" (marker + separatore, ~22 caratteri): lo
  // scontiamo PRIMA di dividere le fettine, così resta posto anche per
  // l'ULTIMA pagina del libro — che è esattamente il punto di questa funzione.
  const perPage = Math.max(120, Math.floor((cap - pages.length * 22) / pages.length));
  const blocks: string[] = [];
  let total = 0;
  for (const p of pages) {
    const block = `=== PAGINA ${p.num} ===\n${p.text.slice(0, perPage)}`;
    if (blocks.length > 0 && total + block.length > cap) break;
    blocks.push(block);
    total += block.length + 2;
  }
  return blocks.join("\n\n");
}
