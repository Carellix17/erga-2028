/**
 * 🖼️ P24 — Sanitizza il nome file di un corso in una QUERY di ricerca pulita
 * per l'API di Wikipedia.
 *
 * Regole (direttive Capo):
 * 1. Rimuove l'estensione (.pdf, .docx, .txt, .png, …);
 * 2. Sostituisce underscore e trattini con spazi;
 * 3. Rimuove keyword di sistema ("appunti", "bozza", "v1", "capitolo", "copia"…);
 * 4. Restituisce il titolo pulito (es. "Appunti_Di_Storia_Romana_v2.pdf" → "Storia Romana").
 */

const FILE_EXT_RE = /\.(pdf|docx?|txt|md|pptx?|xlsx?|jpe?g|png|webp|heic|heif)$/i;

// Keyword di sistema da rimuovere (case-insensitive, anche con varianti "v2"/"finale")
const NOISE_WORDS =
  /\b(appunti|appunto|bozza|bozze|copia|dispensa|riassunto|riassunti|capitolo|cap\b|capitoli|lezione|lezioni|v[0-9]+|finale|final|definitivo|definitiva|nuovo|nuova|versione|ver\b|scheda|schede|materiale|materiali|testo|testi|slides|slide|pdf)\b/gi;

// Stopwords italiane comuni (preposizioni/articoli) che sporcano la query
const STOPWORDS =
  /\b(di|del|dello|della|dei|degli|delle|il|lo|la|i|gli|le|un|uno|una|un'|e|ed|con|per|su|in|a|da|al|allo|alla|ai|agli|alle|dal|dallo|dalla|dai|dagli|dalle|che|piu'|più|nel|nello|nella|nei|negli|nelle)\b/gi;

export function cleanSubjectTitleForSearch(fileName: string): string {
  if (!fileName) return "";

  // 1) rimuovi l'estensione
  let out = fileName.replace(FILE_EXT_RE, "");

  // 2) separatori → spazi (underscore, trattini, punti multipli, doppi spazi)
  out = out
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 3) rimuovi le keyword di sistema (parole intere)
  out = out.replace(NOISE_WORDS, " ").replace(/\s+/g, " ").trim();

  // 4) rimuovi stopwords italiane e numeri isolati
  out = out
    .replace(STOPWORDS, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return out;
}
