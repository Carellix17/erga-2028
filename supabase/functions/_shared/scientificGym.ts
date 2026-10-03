/**
 * 🏋️ PERCORSI 2.0 — LA PALESTRA SCIENTIFICA (logica pura).
 *
 * A differenza dei libri di scuola — che danno esercizio e risultato e
 * basta — qui ogni esercizio numerico porta con sé la SOLUZIONE PASSO-PASSO
 * (mostrabile) e SUGGERIMENTI progressivi. La chat socratica (modulo
 * socraticTutor.ts) accompagna senza mai dare la risposta.
 *
 * Questo modulo è la fonte di verità condivisa tra server (edge function
 * scientific-gym) e client (la vista): tipi, prompt di generazione,
 * estrazione+validazione del JSON dell'AI e il controllo della risposta
 * con tolleranza. Modulo PURO (zero Deno): collaudabile da vitest.
 */

export interface ScientificExercise {
  id: string;
  /** "drill" = esercizio breve di applicazione · "problem" = problema a passi. */
  kind: "drill" | "problem";
  /** Argomento/lezione da cui nasce (mostrato come badge). */
  topic: string;
  /** Testo dell'esercizio, può contenere LaTeX $…$ e $$…$$. */
  text: string;
  /** Risposta numerica attesa. */
  answerValue: number;
  /** Unità di misura ("" se nessuna). */
  answerUnit: string;
  /** Tolleranza assoluta sul confronto. */
  tolerance: number;
  /** Soluzione passo-passo (3-7 passi), mostrabile a richiesta. */
  steps: string[];
  /** Suggerimenti progressivi (0-3). */
  hints: string[];
}

// ── VALIDAZIONE ─────────────────────────────────────────────────────────────

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Tolleranza sana: default 2% del valore, mai negativa, mai esagerata. */
function saneTolerance(t: unknown, answerValue: number): number {
  const t0 = num(t);
  const fallback = Math.max(0.01, Math.abs(answerValue) * 0.02);
  if (t0 === null || t0 < 0) return fallback;
  return Math.min(t0, Math.abs(answerValue) * 0.25 + 1);
}

function sanitizeOne(raw: unknown, index: number): ScientificExercise | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const answerValue = num(o.answer ?? o.answerValue);
  if (answerValue === null) return null; // senza risposta numerica non è un esercizio nostro

  const text = str(o.text ?? o.question, 1500);
  if (text.length < 10) return null;

  const kind = o.kind === "problem" ? "problem" : "drill";
  const topic = str(o.topic, 80) || "—";
  const answerUnit = str(o.unit ?? o.answerUnit, 12);

  const stepsRaw = Array.isArray(o.steps) ? o.steps : [];
  const steps = stepsRaw
    .map((s) => str(s, 500))
    .filter((s) => s.length > 0)
    .slice(0, 8);

  const hintsRaw = Array.isArray(o.hints) ? o.hints : [];
  const hints = hintsRaw
    .map((h) => str(h, 300))
    .filter((h) => h.length > 0)
    .slice(0, 3);

  return {
    id: `ex-${index + 1}`,
    kind,
    topic,
    text,
    answerValue,
    answerUnit,
    tolerance: saneTolerance(o.tolerance, answerValue),
    steps: steps.length > 0 ? steps : [String(answerValue)],
    hints,
  };
}

/**
 * Estrae l'array di esercizi dalla risposta AI (tollera recinti di codice e
 * testo attorno), li valida uno a uno e ne restituisce al massimo `max`.
 * Mai in errore: se non c'è niente di buono, restituisce [].
 */
export function parseExerciseSet(raw: string, max = 8): ScientificExercise[] {
  if (typeof raw !== "string" || !raw.trim()) return [];

  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { parsed = JSON.parse(arrMatch[0]); } catch { /* continua */ }
    }
    if (parsed === null) {
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]) as Record<string, unknown>;
          parsed = Array.isArray(obj.exercises) ? obj.exercises : null;
        } catch { /* continua */ }
      }
    }
  }

  if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
    const maybe = (parsed as Record<string, unknown>).exercises;
    parsed = Array.isArray(maybe) ? maybe : null;
  }
  if (!Array.isArray(parsed)) return [];
  const out: ScientificExercise[] = [];
  for (const item of parsed) {
    if (out.length >= max) break;
    const ex = sanitizeOne(item, out.length);
    if (ex) out.push(ex);
  }
  return out;
}

/** Il confronto tollerante fra la risposta dello studente e quella attesa. */
export function checkAnswer(studentValue: number, ex: ScientificExercise): boolean {
  if (!Number.isFinite(studentValue)) return false;
  // L'epsilon assorbe l'errore di virgola mobile sul limite (es. 9,86 − 9,81).
  return Math.abs(studentValue - ex.answerValue) <= ex.tolerance + 1e-9;
}

// ── PROMPT DI GENERAZIONE ───────────────────────────────────────────────────

export const GYM_SYSTEM_MESSAGE =
  "Sei un docente di materie scientifiche che prepara esercizi di allenamento per le superiori. Generi esercizi con UNA risposta numerica univoca, dati concreti e realistici, testo asciutto. Le formule in LaTeX ($…$ inline). Rispondi ESCLUSIVAMENTE con un array JSON valido nel formato richiesto: niente testo fuori dal JSON.";

export interface GymPromptInput {
  /** Materia specifica (es. "Fisica"). */
  subject: string;
  /** Elenco degli argomenti del modulo (titoli + concetti). */
  topicsSummary: string;
  /** Fetta di materiale di studio (può essere vuota). */
  materialSlice: string;
  /** Quanti esercizi preparare. */
  count: number;
  /** Personalizzazione cognitiva (Esagono), già formattata. */
  profileContext: string;
  /** Etichetta del modulo (es. "Modulo 2 — Le forze"). */
  moduleLabel: string;
}

export function buildGymPrompt(input: GymPromptInput): string {
  return `Prepara ${input.count} esercizi di ALLENAMENTO per ${input.subject} (${input.moduleLabel}), sugli argomenti elencati qui sotto.

${input.profileContext}

ARGOMENTI:
${input.topicsSummary}
${input.materialSlice ? `
STRALCIO DEL MATERIALE DI STUDIO (per dati, valori e contesto — non citarlo letteralmente):
"""
${input.materialSlice}
"""` : ""}

REGOLE TASSATIVE:
1. Ogni esercizio ha UNA SOLA risposta numerica univoca. Se la domanda può avere più risposte, specifica quale chiedi (es. "la radice minore", "l'energia in joule", "il tempo in secondi").
2. Alterna ESERCIZI brevi di applicazione diretta ("kind": "drill") e PROBLEMI a più passi con una piccola storia concreta ("kind": "problem"). Circa metà e metà.
3. Dati concreti e realistici, coerenti con gli argomenti. Mai riferimenti a "il testo dice".
4. "tolerance" è la tolleranza assoluta ammissibile (per risposte arrotondate: es. 0.01 se la risposta è esatta, 0.5 se chiedi un arrotondamento).
5. "steps" è la soluzione PASSO-PASSO (3-7 passi brevi, ognuno con l'operazione e il suo risultato; formule in LaTeX $…$).
6. "hints" sono 2-3 suggerimenti PROGRESSIVI: il primo orienta (quale grandezza/formula serve), l'ultimo avvia il calcolo SENZA completarlo. MAI il risultato.
7. Difficoltà crescente dentro la serie; gli ultimi 1-2 esercizi devono unire due concetti.
8. "text" massimo 120 parole. Se serve una formula, scrivila in LaTeX.

Formato esatto (array JSON, nient'altro):
[
  {
    "kind": "drill",
    "topic": "argomento breve",
    "text": "Calcola … La risposta è … (unità)",
    "answer": 12.5,
    "unit": "m/s",
    "tolerance": 0.01,
    "steps": ["…", "…", "…"],
    "hints": ["…", "…"]
  }
]`;
}
