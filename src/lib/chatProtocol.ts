/**
 * 🔌 Il traduttore dei protocolli della chat (pacco P7).
 *
 * La macchina cloud e l'app si parlano con piccoli "segnali" cuciti nel testo
 * o nel flusso SSE. Questo modulo puro (nessuna dipendenza, testabile) li
 * riconosce e li ripulisce:
 *
 *  - [IMG: query]          → l'AI chiede un'immagine reale per quella risposta
 *  - ```erga_actions … ``` → l'agente propone azioni da eseguire (con conferma)
 *  - evento SSE {sources}  → le fonti espandibili sotto la risposta
 *  - evento SSE {warning}  → il tubo si è rotto a metà (sentinella anti-pianto)
 */

/* ── Fonti ─────────────────────────────────────────────────────────────── */
export interface ChatSource {
  /** Nome del documento da cui proviene il brano. */
  file: string;
  /** Numeri di pagina (dai marcatori P6) o null se il documento non ne ha. */
  pageStart: number | null;
  pageEnd: number | null;
  /** Il brano esatto mostrato quando l'utente espande la fonte. */
  excerpt: string;
}

/* ── Agente ────────────────────────────────────────────────────────────── */
export type AgentActionKind =
  | "add_event"
  | "propose_review"
  | "add_goal"
  | "goto_quiz"
  | "goto_lesson";

export interface AgentAction {
  kind: AgentActionKind;
  /** Campi liberi a seconda dell'azione (title, date, subject, query…). */
  [key: string]: unknown;
}

const ACTION_KINDS: AgentActionKind[] = [
  "add_event",
  "propose_review",
  "add_goal",
  "goto_quiz",
  "goto_lesson",
];

/* ── La scope ───────────────────────────────────────────────────────────── */
/**
 * Dopo aver tolto un segnale restano spazi orfani ("Roma  e Napoli !"):
 * qui li rassetta (preso dai collaudi, che l'hanno beccato subito).
 */
function tidyText(s: string): string {
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ── Immagini: tag [IMG: query] ─────────────────────────────────────────── */
/**
 * Trova la RICHIESTA D'IMMAGINE e la toglie dalla vista: il testo torna
 * pulito per la bolla, la query serve alla macchinetta Wikipedia.
 * Massimo una per messaggio: se l'AI esagera, teniamo la prima e spazziamo via le altre.
 */
export function extractImageTag(text: string): { cleanText: string; imageQuery: string | null } {
  if (!text) return { cleanText: text, imageQuery: null };
  const match = text.match(/\[IMG:\s*([^\]\n]{2,120})\]/i);
  const cleanText = tidyText(text.replace(/\[IMG:[^\]\n]*\]/gi, ""));
  return { cleanText, imageQuery: match ? match[1].trim() : null };
}

/* ── Agente: blocco ```erga_actions … ``` ──────────────────────────────── */
/**
 * Dal JSON grezzo alle azioni valide: stessa cernita usata sia per il blocco
 * scritto dall'AI sia per le azioni FORZATE dalla macchina (Piano B): chiavi
 * sconosciute si buttano, formati strani non rompono mai la chat.
 */
function sanitizeActionItems(parsed: unknown): AgentAction[] {
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const actions: AgentAction[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const { action, ...rest } = raw as Record<string, unknown>;
    if (typeof action === "string" && (ACTION_KINDS as string[]).includes(action)) {
      actions.push({ kind: action as AgentActionKind, ...rest });
    }
  }
  return actions;
}

/**
 * Estrae il blocco azioni (sempre alla fine del messaggio, per istruzioni)
 * e lo rimuove dal testo visibile. Azioni sconosciute o un JSON rotto NON
 * rompono la chat: vengono semplicemente ignorate.
 */
export function extractActions(text: string): { cleanText: string; actions: AgentAction[] } {
  if (!text) return { cleanText: text, actions: [] };
  const actions: AgentAction[] = [];
  const cleanText = tidyText(
    text.replace(/```erga_actions\s*([\s\S]*?)```/gi, (_full, json: string) => {
      try {
        actions.push(...sanitizeActionItems(JSON.parse(json)));
      } catch {
        // Blocco malformato: non è un disastro, lo togliamo comunque dalla vista.
      }
      return "";
    }),
  );
  return { cleanText: tidyText(cleanText), actions };
}

/* ── Eventi SSE speciali ────────────────────────────────────────────────── */
/**
 * Nel flusso server→client viaggiano anche eventi JSON SENZA choices:
 *  - {"sources": [...]}         subito prima della fine
 *  - {"forced_actions": [...]}  la carta azione costruita dalla MACCHINA (Piano B)
 *  - {"warning": "interrupted"} se il tubo si è rotto a metà
 * Questa funzione li distingue dai normali pezzetti di testo.
 */
export function parseSpecialEvent(parsed: unknown):
  | { type: "sources"; sources: ChatSource[] }
  | { type: "forced_actions"; actions: AgentAction[] }
  | { type: "warning"; warning: string }
  | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.forced_actions)) {
    // 🎯 Piano B: stessa cernita delle azioni scritte dall'AI, massimo 2 carte.
    return { type: "forced_actions", actions: sanitizeActionItems(obj.forced_actions).slice(0, 2) };
  }
  if (Array.isArray(obj.sources)) {
    const sources: ChatSource[] = obj.sources
      .filter((s): s is ChatSource =>
        !!s && typeof s === "object" &&
        typeof (s as ChatSource).file === "string" &&
        typeof (s as ChatSource).excerpt === "string")
      .slice(0, 3);
    return { type: "sources", sources };
  }
  if (typeof obj.warning === "string") return { type: "warning", warning: obj.warning };
  return null;
}

/* ── Pulizia finale del testo prima di salvarlo/mostrarlo ─────────────── */
/**
 * Applica IN ORDINE tutte le spugne: prima le azioni, poi il tag immagine.
 * Così il testo salvato nella cronologia resta sempre leggibile e pulito.
 */
export function cleanAssistantText(text: string): {
  cleanText: string;
  actions: AgentAction[];
  imageQuery: string | null;
} {
  const a = extractActions(text);
  const b = extractImageTag(a.cleanText);
  return { cleanText: b.cleanText, actions: a.actions, imageQuery: b.imageQuery };
}
