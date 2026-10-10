/**
 * 🧺 PERCORSI 2.0 — IL CESTO DELLA LEZIONE (P1 + P3, 7 ottobre 2026).
 *
 * Due attrezzi puri (zero Deno: collaudabili da vitest come humanities.ts):
 *
 *  1. extractJsonRobust — il riparatore di JSON "che sa leggere il LaTeX".
 *     I modelli AI scrivono le formule con i backslash (\sqrt, \frac, \beta…)
 *     e DENTRO una stringa JSON quei backslash sono escape: alcuni sono
 *     invalidi (\s di \sqrt → errore di parse = «Impossibile estrarre JSON»),
 *     altri sono validi per caso e corrompono la formula in silenzio (\frac →
 *     form-feed + "rac{…}"). Il riparatore lavora su due piani:
 *       · PRIMA del parse (solo se il parse diretto fallisce): raddoppia gli
 *         escape INVALIDI, così \sqrt resta \sqrt;
 *       · DOPO il parse (in normalizeLessonPayload): rimappa i caratteri di
 *         controllo che in realtà erano comandi LaTeX (\f → \f, \b → \b…),
 *         senza toccare i veri a-capo (\n\n = paragrafi).
 *     In più: estrazione BILANCIATA (la prima { o [ completa, non la fetta
 *         greedy dalla prima all'ultima), recupero degli array troncati e
 *         chiusura delle parentesi penzolanti — tutto quello che faceva il
 *         vecchio extractJson di generate-lessons, ma in versione testabile.
 *
 *  2. normalizeLessonPayload — LA CERNIERA (P1): una risposta AI senza
 *     contenuto utile NON è una lezione. Se non c'è abbastanza testo da
 *     leggere, restituisce null: il chiamante deve ritentare o dirlo
 *     all'utente, mai salvare una lezione vuota marcandola "generata".
 */

export const JSON_FAIL_MESSAGE = "Impossibile estrarre JSON dalla risposta AI. Riprova.";

/** Soglia minima di contenuto perché una lezione sia una lezione (P1). */
const MIN_LESSON_CHARS = 120;

// ── IL PIANO "PRIMA DEL PARSE": RADDOPPIA GLI ESCAPE INVALIDI ───────────────

const VALID_JSON_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

function isHexQuartet(s: string, from: number): boolean {
  return /^[0-9a-fA-F]{4}$/.test(s.slice(from, from + 4));
}

/**
 * Raddoppia SOLO i backslash che JSON non accetta (\s di \sqrt, \p di \phi…).
 * Gli escape validi (\n, \t, \", \\, \uXXXX) restano com'erano: i veri a-capo
 * e le vere tabulazioni del contenuto devono sopravvivere. I newline LITERALI
 * dentro le stringhe (vietati da JSON ma che i modelli scrivono) diventano \n.
 * Va applicata solo come TENTATIVO DI RIPARAZIONE, mai al posto del parse
 * diretto: su un JSON già valido non serve, e su della prosa con apici
 * potrebbe fare pasticci (il tentativo fallisce e si passa al prossimo).
 */
function fixInvalidEscapes(s: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (!inStr) {
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inStr = false;
      out += ch;
      continue;
    }
    if (ch === "\\") {
      const next = s[i + 1];
      if (next === undefined) {
        out += "\\\\"; // backslash in coda (stringa troncata)
        continue;
      }
      if (VALID_JSON_ESCAPES.has(next) && !(next === "u" && !isHexQuartet(s, i + 2))) {
        out += ch + next;
        i++;
      } else {
        out += "\\\\" + next; // \sqrt → \\sqrt : LaTeX preservato
        i++;
      }
      continue;
    }
    if (ch === "\n") {
      out += "\\n";
      continue;
    }
    if (ch === "\r") {
      out += "\\r";
      continue;
    }
    if (ch === "\t") {
      out += "\\t";
      continue;
    }
    out += ch;
  }
  return out;
}

// ── IL PIANO "DOPO IL PARSE": I CARATTERI DI CONTROLLO ERANO LATEX ──────────

/**
 * \frac in una stringa JSON è un escape VALIDO (form-feed): il parse riesce
 * ma la formula arriva mutilata (form-feed + "rac{…}"). Stesso destino per
 * \beta (→ backspace), \rho (→ CR), \times (→ tab). Qui si rimappa il
 * carattere di controllo al comando LaTeX che era davvero. I veri a-capo
 * (\n) NON si toccano: sono i paragrafi della lezione.
 */
const LATEX_CONTROL_REPAIR: Record<string, string> = {
  "\b": "\\b",
  "\f": "\\f",
  "\r": "\\r",
  "\t": "\\t",
};

export function repairLatexControlChars(text: string): string {
  return text.replace(/[\b\f\r\t]/g, (ch) => LATEX_CONTROL_REPAIR[ch] ?? ch);
}

/** Applica la riparazione LaTeX a ogni stringa dentro un valore arbitrario (esercizi). */
function repairDeep(value: unknown): unknown {
  if (typeof value === "string") return repairLatexControlChars(value);
  if (Array.isArray(value)) return value.map(repairDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = repairDeep(v);
    return out;
  }
  return value;
}

// ── L'ESTRATTORE BILANCIATO ─────────────────────────────────────────────────

/** La prima { o [ COMPLETA e bilanciata (sensibile alle stringhe), o null. */
function sliceBalanced(s: string, start: number): string | null {
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { if (inStr) esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/** Recupero di un array TRONCATO: salva gli oggetti completi, scarta l'ultimo a metà. */
function salvageTruncatedArray(cleaned: string): unknown[] | null {
  const arrStart = cleaned.indexOf("[");
  if (arrStart === -1) return null;
  const items: string[] = [];
  let i = arrStart + 1;
  while (i < cleaned.length) {
    while (i < cleaned.length && /[\s,]/.test(cleaned[i])) i++;
    if (i >= cleaned.length || cleaned[i] === "]") break;
    if (cleaned[i] !== "{") { i++; continue; }
    const objStart = i;
    let depth = 0, inStr = false, esc = false;
    for (; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) { i++; break; } }
    }
    if (depth === 0) items.push(cleaned.slice(objStart, i));
    else break; // troncato a metà oggetto → si scarta
  }
  if (items.length === 0) return null;
  const joined = "[" + items.join(",") + "]";
  for (const attempt of [joined, fixInvalidEscapes(joined)]) {
    try { return JSON.parse(attempt) as unknown[]; } catch { /* prossimo */ }
  }
  return null;
}

/** Chiude le parentesi rimaste aperte, con uno STACK (LIFO): `[{…` → `[{…}]`,
 * non `[{…]}` — l'ordine di chiusura deve essere l'inverso dell'apertura. */
function closeDanglingBrackets(s: string): string {
  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { if (inStr) esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  // Risposta tagliata DENTRO una stringa: prima si chiude la stringa
  // (togliendo un eventuale backslash orfano), poi le parentesi.
  let out = s;
  if (inStr) out = (esc ? out.slice(0, -1) : out) + '"';
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === "{" ? "}" : "]";
  return out;
}

// ── 1) IL RIPARATORE ────────────────────────────────────────────────────────

export function extractJsonRobust(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Il ROOT è la PRIMA parentesi del documento: se è "[" il payload è un
  // array (e le "{" dentro sono ITEM, non root), se è "{" è un oggetto.
  const objStart = cleaned.indexOf("{");
  const arrStart = cleaned.indexOf("[");
  const rootIsArray = arrStart !== -1 && (objStart === -1 || arrStart < objStart);

  const candidates: string[] = [cleaned, fixInvalidEscapes(cleaned)];

  const positionsOf = (ch: string): number[] => {
    const out: number[] = [];
    for (let i = 0; i < cleaned.length && out.length < 64; i++) if (cleaned[i] === ch) out.push(i);
    return out;
  };
  const pushBalancedSlices = (positions: number[]) => {
    for (const p of positions) {
      const slice = sliceBalanced(cleaned, p);
      if (slice) candidates.push(slice, fixInvalidEscapes(slice));
    }
  };
  const lastResortOf = (base: string) => closeDanglingBrackets(
    fixInvalidEscapes(
      // eslint-disable-next-line no-control-regex -- pulizia voluta dei caratteri di controllo nel recupero dell'ultima spiaggia
      base.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""),
    ),
  );

  if (rootIsArray) {
    // Protocollo ARRAY: si provano solo le fette "[". Le "{" interne sono
    // ITEM: estrarre il primo restituirebbe UN elemento invece dell'array
    // (bug del primo giro: l'array troncato dei titoli diventava un titolo).
    pushBalancedSlices(positionsOf("["));
  } else {
    // Protocollo OGGETTO: fette "{" prima della prima "[" (una "{" che sta
    // dopo una "[" vive dentro un array: è un item). Così la prosa con
    // graffe («la formula {a+b}… ecco la lezione: {…}») non condanna
    // l'estrazione: si prova la graffa della prosa, poi quella del JSON.
    const limit = arrStart === -1 ? cleaned.length : arrStart;
    pushBalancedSlices(positionsOf("{").filter((p) => p < limit));
    // La vecchia strategia greedy resta: cattura il caso "prosa dopo il JSON".
    const greedyObj = cleaned.match(/\{[\s\S]*\}/);
    if (greedyObj) candidates.push(greedyObj[0], fixInvalidEscapes(greedyObj[0]));
    // Ultima spiaggia per oggetti troncati: chiusura a stack delle parentesi.
    candidates.push(lastResortOf(greedyObj?.[0] ?? cleaned));
    // Il payload potrebbe però essere un ARRAY dopo prosa con graffe: lo
    // provano le fette "[" — DOPO il recupero dell'oggetto, così un array
    // nella prosa non rapina un oggetto troncato a fine testo.
    pushBalancedSlices(positionsOf("["));
    const greedyArr = cleaned.match(/\[[\s\S]*\]/);
    if (greedyArr) candidates.push(greedyArr[0], fixInvalidEscapes(greedyArr[0]));
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    try { return JSON.parse(candidate); } catch { /* si prova il prossimo */ }
  }

  // Array troncati (root "[" oppure prosa con graffe prima dell'array): si
  // salvano gli item completi, si scarta l'ultimo a metà.
  const salvaged = salvageTruncatedArray(cleaned);
  if (salvaged !== null) return salvaged;

  // Ultima spiaggia del protocollo array: greedy + chiusura a stack.
  if (rootIsArray) {
    const greedyArr = cleaned.match(/\[[\s\S]*\]/);
    try { return JSON.parse(lastResortOf(greedyArr?.[0] ?? cleaned)); } catch { /* fatto */ }
  }

  throw new Error(JSON_FAIL_MESSAGE);
}

// ── 2) LA CERNIERA (P1) ─────────────────────────────────────────────────────

export interface NormalizedLessonPayload {
  concept: string;
  /** Spiegazione finale: JSON delle parti (formato del lettore) o testo semplice. */
  explanation: string;
  /** Parti già ripulite e valide; null se la risposta era nel formato legacy a testo. */
  explanationParts: { part_title: string; content: string }[] | null;
  example: string;
  exercises: unknown[];
}

/**
 * Una risposta AI diventa una lezione SOLO se c'è dentro abbastanza roba:
 * parti con contenuto vero (o, nel formato legacy, una spiegazione di
 * sostanza). Altrimenti null — niente più lezioni vuote marcate "generate".
 */
export function normalizeLessonPayload(data: unknown): NormalizedLessonPayload | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, unknown>;

  const concept = typeof obj.concept === "string" ? repairLatexControlChars(obj.concept).trim() : "";
  const example = typeof obj.example === "string" ? repairLatexControlChars(obj.example).trim() : "";
  const exercises = repairDeep(Array.isArray(obj.exercises) ? obj.exercises : []) as unknown[];

  const rawParts = Array.isArray(obj.explanation_parts) ? obj.explanation_parts : [];
  const parts: { part_title: string; content: string }[] = [];
  for (const raw of rawParts) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const p = raw as Record<string, unknown>;
    const content = typeof p.content === "string" ? repairLatexControlChars(p.content).trim() : "";
    if (!content) continue; // le parti vuote non fanno numero
    const title = typeof p.part_title === "string" && p.part_title.trim()
      ? p.part_title.trim()
      : `Parte ${parts.length + 1}`;
    parts.push({ part_title: title, content });
  }

  if (parts.length > 0) {
    const totalChars = parts.reduce((n, p) => n + p.content.length, 0);
    if (totalChars < MIN_LESSON_CHARS) return null;
    return {
      concept,
      explanation: JSON.stringify(parts),
      explanationParts: parts,
      example,
      exercises,
    };
  }

  // Formato legacy: spiegazione a testo semplice (accettata solo se sostanziosa).
  const legacy = typeof obj.explanation === "string" ? repairLatexControlChars(obj.explanation).trim() : "";
  if (legacy.length >= MIN_LESSON_CHARS) {
    return { concept, explanation: legacy, explanationParts: null, example, exercises };
  }

  return null;
}
