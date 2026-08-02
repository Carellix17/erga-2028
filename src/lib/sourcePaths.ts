/**
 * 🛤️ LE ROTTAIE DEI FILE SORGENTE — pacco P19.
 *
 * Da P17 il ripostiglio può custodire PIÙ file per percorso: la colonna
 * file_path è una LISTA separata da virgole ("uid/a.pdf,uid/b.docx").
 * Chi la leggeva "alla vecchia" (tutta intera) si rompeva: il postino
 * delle figure chiedeva un oggetto chiamato letteralmente "a.pdf,b.txt"
 * (404) o rinunciava in silenzio. Questo aiutino puro sa leggere la
 * lista — lo usa useLessonFigures e lo collaudiamo in Node.
 */

/** Spezza la lista sorgente in percorsi singoli (tollerante con spazi e vuoti). */
export function splitSourcePaths(filePath: string | null | undefined): string[] {
  return (filePath ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Dalla lista pesca il percorso del PDF "giusto" per il rendering figure:
 * il PRIMO che finisce in .pdf. null se non c'è (percorso web, foto,
 * documenti testuali: le loro figure seguono altre rotaie).
 */
export function pickPdfPath(filePath: string | null | undefined): string | null {
  return splitSourcePaths(filePath).find((p) => p.toLowerCase().endsWith(".pdf")) ?? null;
}
