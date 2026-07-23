/**
 * 🎯 IL PIANO B DELL'AGENTE (deterministico).
 *
 * Il capocantiere ha provato due volte: l'AI "bluffa" — dice "ho annotato nel
 * diario" ma NON emette il blocco azioni, quindi non succede nulla. Affidarsi
 * solo alle buone maniere di un modello linguistico non basta.
 *
 * Questo modulo (PURO, senza dipendenze: gira nella macchina Deno e nei test)
 * fa due cose:
 *
 *  1. detectActionIntent: fiuto da cane da tartufo. La richiesta dell'utente
 *     PROFUMA di "aggiungi qualcosa al diario"? Se sì, la macchina chiederà a
 *     un secondo AI di estrarre i dati dell'evento in JSON (senza che il
 *     testo della risposta ne dipenda).
 *
 *  2. parseForcedAction: la macchina NON si fida ciecamente del JSON
 *     dell'AI: lo pulisce, lo valida (whitelist) e mette toppe dove serve
 *     (data di domani se manca/rotta, "Ripasso:" all'inizio dei ripassi…).
 *
 * Risultato: la carta azione col bottone "Esegui" arriva PER COSTRUZIONE,
 * anche quando l'AI chiacchiera e basta.
 */

/** Le uniche azioni che la macchina può forzare: scritture nel diario. */
const FORCED_KINDS = new Set(["add_event", "propose_review", "add_goal"] as const);
const EVENT_TYPES = new Set(["study", "test", "assignment"] as const);

const EVAL_TYPES = new Set(["scritta", "orale", "interrogazione", "pratica", "compito"] as const);

export type EvalType = "scritta" | "orale" | "interrogazione" | "pratica" | "compito";

export interface ForcedActionItem {
  action: "add_event" | "propose_review" | "add_goal";
  title: string;
  date: string; // YYYY-MM-DD
  event_type: "study" | "test" | "assignment";
  subject: string;
  /** Tipo preciso della valutazione (P8): "interrogazione" per le interrogazioni, ecc. */
  eval_type?: EvalType;
  /** Voto obiettivo 1-10, se lo studente l'ha detto ("...puntando al 9"). */
  goal?: number;
}

/* Verbo d'azione + sostantivo da diario, vicini ("mettimi in diario una
 * verifica", "ricordami il compito di matematica", "aggiungi un evento"). */
const VERB_NOUN_RE =
  /\b(aggiungi|aggiungere|inserisci|inserire|metti|mettimi|mettere|segna|segnami|segnare|annota|annotare|programma|programmami|programmare|pianifica|pianificare|crea|creare|fissa|fissare|ricordami|ricorda|salva|salvare|add|schedule|remind me)\b.{0,80}?\b(diario|evento|eventi|verifica|verifiche|compito|compiti|ripasso|ripassi|obiettivo|obiettivi|interrogazione|esame|esami|scadenza|calendario|event|homework|reminder)\b/isu;

/* Sostantivo da diario + data ravvicinata ("verifica di storia per domani",
 * "ripasso lunedì", "esame il 23/07"). Può dare falsi positivi: è voluto,
 * tanto poi l'estrattore AI fa da cancello fine e può rispondere "none". */
const NOUN_DATE_RE =
  /\b(verifica|verifiche|compito|compiti|ripasso|interrogazione|esame)\b.{0,60}?\b(per domani|domani|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|tomorrow|next week|\d{1,2}[/\-]\d{1,2}([/\-]\d{2,4})?)/iu;

/**
 * Fiuto: la richiesta merita una chiamata all'estrattore?
 * Falso positivo = una chiamata AI in più che risponde "none": pazienza.
 * Falso negativo = carta che non arriva: da evitare (per questo due reti).
 */
export function detectActionIntent(text: string): boolean {
  const t = (text || "").slice(0, 600);
  if (!t.trim()) return false;
  return VERB_NOUN_RE.test(t) || NOUN_DATE_RE.test(t);
}

/** Domani in formato YYYY-MM-DD rispetto a una data di riferimento. */
function tomorrowOf(todayISO: string): string {
  const t = Date.parse(`${todayISO}T00:00:00Z`);
  const base = Number.isNaN(t) ? Date.now() : t;
  return new Date(base + 86400000).toISOString().slice(0, 10);
}

/**
 * Pulisce e valida la risposta JSON dell'estrattore. Mai fidarsi ciecamente:
 * se qualcosa non torna, si aggiusta; se è irrecuperabile, null (niente carta).
 */
export function parseForcedAction(raw: string, todayISO: string): ForcedActionItem | null {
  if (!raw) return null;

  // L'AI a volte infiocchetta il JSON con ```json … ``` o testo attorno:
  // prendiamo il primo oggetto {…} che troviamo e ignoriamo il resto.
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;
  const action = typeof obj.action === "string" ? obj.action : "";
  // Azioni fuori whitelist (compresa "none") → niente carta.
  if (!FORCED_KINDS.has(action as ForcedActionItem["action"])) return null;

  let title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim().slice(0, 120)
      : "Evento di studio";
  if (action === "propose_review" && !/^ripasso\b/i.test(title.trim())) {
    title = `Ripasso: ${title}`.slice(0, 120);
  }

  const dateRaw = typeof obj.date === "string" ? obj.date.trim() : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : tomorrowOf(todayISO);

  let eventType: ForcedActionItem["event_type"] =
    typeof obj.event_type === "string" &&
    EVENT_TYPES.has(obj.event_type as ForcedActionItem["event_type"])
      ? (obj.event_type as ForcedActionItem["event_type"])
      : "study";
  if (action === "add_goal") eventType = "test";

  const subject =
    typeof obj.subject === "string" && obj.subject.trim()
      ? obj.subject.trim().slice(0, 60)
      : "Generale";

  // 🎓 P8 — tipo di valutazione preciso (verifica scritta/orale, interrogazione,
  // compito) e voto obiettivo: la carta-modulo li usera' per precompilare i campi.
  let evalType = typeof obj.eval_type === "string" && EVAL_TYPES.has(obj.eval_type as EvalType)
    ? (obj.eval_type as EvalType)
    : undefined;
  // Incroci di coerenza: "compito" e l'evento assignment sono la stessa cosa;
  // qualsiasi valutazione (scritta/orale/…) e' una verifica (event_type=test).
  if (evalType === "compito") eventType = "assignment";
  else if (evalType) eventType = "test";
  if (eventType === "assignment" && !evalType) evalType = "compito";
  else if (eventType === "test" && !evalType && action === "add_event") {
    evalType = "scritta"; // una "verifica" generica nasce come scritta; la carta la fa cambiare
  }

  let goal: number | undefined;
  if (typeof obj.goal === "number" && Number.isFinite(obj.goal)) {
    const g = Math.round(obj.goal);
    if (g >= 1 && g <= 10) goal = g;
  }

  const item: ForcedActionItem = {
    action: action as ForcedActionItem["action"],
    title,
    date,
    event_type: eventType,
    subject,
  };
  if (evalType) item.eval_type = evalType;
  if (goal !== undefined) item.goal = goal;
  return item;
}
