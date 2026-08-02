/**
 * 📄➡️📝 DOCX → MARKDOWN — pacco P18 ("il DOCX parla Markdown").
 *
 * Prima di P18 il lettore universale spremeva i DOCX a forza di regex sui tag
 * XML di word/document.xml: il testo arrivava, ma titoli, elenchi e TABELLE
 * venivano appiattiti — e il cuoco AI ama la struttura (lui stesso risponde
 * in Markdown: titoli, elenchi, tabelle...). Un DOCX ben strutturato ora
 * resta ben strutturato fino alla dispensa, e le mini-lezioni migliorano.
 *
 * La catena: mammoth (libreria nobile, caricata dalla edge via esm.sh)
 * trasforma il DOCX in HTML semplice; QUESTO modulo traduce quell'HTML in
 * Markdown per il caveau:
 *   # titoli · **grassetto** · *corsivo* · - elenchi · 1. numerati ·
 *   | tabelle | pipe | · [link](url)
 *
 * Regole di bottega:
 *  - PURO e senza dipendenze: lo importano sia la edge (Deno) sia i test di
 *    collaudo (Node). Vietato importare da URL qui dentro!
 *  - Le <img> di mammoth sono data-uri base64 (megabyte!): vengono TAGLIATE.
 *    Il testo ci basta; le figure dei PDF hanno già la loro catena dedicata.
 *  - Liste annidate e celle colspan: gestione "da manuale semplice"
 *    (appiattita); i documenti da studio tipici non le usano.
 */

/** Punto d'ingresso: HTML prodotto da mammoth → Markdown pulito. */
export function mammothHtmlToMarkdown(html: string): string {
  if (!html) return "";

  const tables: string[] = [];
  let s = String(html);

  // 0. Commenti e immagini: via subito (le img mammoth sono data-uri enormi).
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<img\b[^>]*\/?>/gi, "");

  // 1. Tabelle: estratte e parcheggiate con un segnaposto, così i passi
  //    successivi (entità, newline) non toccano le pipe.
  s = s.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner: string) => {
    const md = tableToMarkdown(inner);
    if (!md) return "\n\n";
    tables.push(md);
    return `\n\n⟦TABELLA_${tables.length - 1}⟧\n\n`;
  });

  // 2. Inline: grassetti e corsivi PRIMA dei link (così restano dentro le []).
  s = s.replace(/<\/?(?:strong|b)\b[^>]*>/gi, "**");
  s = s.replace(/<\/?(?:em|i)\b[^>]*>/gi, "*");

  // 3. Link → [testo](url).
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

  // 4. Elenchi: blocco intero → righe Markdown ("- " oppure "1. 2. 3.").
  s = s.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, tag: string, inner: string) => {
    return "\n\n" + listToMarkdown(inner, tag.toLowerCase() === "ol") + "\n\n";
  });

  // 5. Titoli: apertura → "\n\n### ", chiusura → "\n\n".
  s = s.replace(/<h([1-6])\b[^>]*>/gi, (_m, n: string) => "\n\n" + "#".repeat(Number(n)) + " ");
  s = s.replace(/<\/h[1-6]>/gi, "\n\n");

  // 6. A-capo e paragrafi.
  s = s.replace(/<br\b[^>]*\/?>/gi, "\n");
  s = s.replace(/<p\b[^>]*>/gi, "");
  s = s.replace(/<\/p>/gi, "\n\n");

  // 7. Ogni altro tag residuo sparisce.
  s = s.replace(/<[^>]+>/g, "");

  // 8. Entità HTML: prima le specifiche, &amp; per ULTIMA (ordine corretto:
  //    "&amp;lt;" deve restare "&lt;", non diventare "<").
  s = decodeEntities(s);

  // 9. Pulizia spaziature.
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // 10. Rimonto le tabelle parcheggiate.
  s = s.replace(/⟦TABELLA_(\d+)⟧/g, (_m, i: string) => tables[Number(i)] ?? "");
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

/** Elenco puntato/numerato: ogni <li> diventa una riga Markdown. */
function listToMarkdown(inner: string, ordered: boolean): string {
  // Dentro i <li> mammoth può infilare <p>: qui lo contiamo come spazio.
  const cleaned = inner.replace(/<\/?p\b[^>]*>/gi, " ");
  const items: string[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) items.push(m[1]);
  return items
    .map((txt, i) => `${ordered ? `${i + 1}.` : "-"} ${txt.replace(/<[^>]+>/g, "").trim()}`)
    .filter((row) => !/^(?:-|\d+\.)\s*$/.test(row))
    .join("\n");
}

/** Tabella → pipe Markdown. La PRIMA riga fa da intestazione (sempre). */
function tableToMarkdown(inner: string): string {
  const rows: string[][] = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(inner)) !== null) {
    const cells: string[] = [];
    const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rm[1])) !== null) cells.push(cellText(cm[1]));
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => r.concat(Array(cols - r.length).fill("")));
  const lines = [
    `| ${norm[0].join(" | ")} |`,
    `| ${Array(cols).fill("---").join(" | ")} |`,
    ...norm.slice(1).map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n");
}

/** Testo di una cella: inline "di cortesia", niente a-capo, pipe escapate. */
function cellText(raw: string): string {
  let t = raw
    .replace(/<\/?(?:strong|b)\b[^>]*>/gi, "**")
    .replace(/<\/?(?:em|i)\b[^>]*>/gi, "*")
    .replace(/<br\b[^>]*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "");
  t = decodeEntities(t).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  return t;
}

/** Decodifica entità HTML. &amp; va per ULTIMA, e i codepoint impossibili
 *  (es. &#99999999;) vengono silentati invece di far esplodere tutto. */
function decodeEntities(t: string): string {
  const safeCp = (n: number): string =>
    Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  return t
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => safeCp(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => safeCp(parseInt(h, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}
