/**
 * P50 — «DOV'ERO RIMASTO?» (dentro la lezione, non solo tra le lezioni).
 *
 * Oggi il database salva solo l'INDICE della lezione aperta: se chiudi a metà
 * della slide 7 e riapri, ricominci dalla prima. Questa piccola memoria vive
 * sul dispositivo (localStorage) e non tocca il database — quindi non serve
 * nessuna migrazione e nessun permesso nuovo.
 *
 * Regole di comportamento:
 *  - si salva solo oltre la prima slide (step 0 = niente da riprendere);
 *  - la memoria scade dopo 30 giorni (non vogliamo riaprire un ripasso di
 *    un mese fa a metà);
 *  - un dato corrotto o assente non fa mai esplodere la lezione: si torna
 *    all'inizio in silenzio.
 */

const KEY_PREFIX = "erga:lesson-resume:";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface LessonResume {
  /** Indice della slide (0-based) a cui eri arrivato. */
  step: number;
  /** Quando è stato salvato (ms epoch). */
  savedAt: number;
}

/** Storage disponibile? (Safari in navigazione privata può lanciare) */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function keyFor(lessonId: string): string {
  return `${KEY_PREFIX}${lessonId}`;
}

/** Legge la posizione salvata. Restituisce null se assente, scaduta o corrotta. */
export function readLessonResume(lessonId: string, now: number = Date.now()): LessonResume | null {
  if (!lessonId) return null;
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(keyFor(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LessonResume>;
    const step = parsed?.step;
    const savedAt = parsed?.savedAt;
    if (typeof step !== "number" || !Number.isFinite(step) || step <= 0) return null;
    if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) return null;
    if (now - savedAt > TTL_MS) {
      store.removeItem(keyFor(lessonId));
      return null;
    }
    return { step: Math.floor(step), savedAt };
  } catch {
    return null;
  }
}

/** Salva la posizione corrente (no-op oltre i limiti o senza storage). */
export function saveLessonResume(lessonId: string, step: number, now: number = Date.now()): void {
  if (!lessonId || !Number.isFinite(step) || step <= 0) return;
  const store = storage();
  if (!store) return;
  try {
    store.setItem(keyFor(lessonId), JSON.stringify({ step: Math.floor(step), savedAt: now }));
  } catch {
    /* disco pieno o storage negato: la lezione funziona lo stesso */
  }
}

/** Dimentica la posizione (percorso completato o "ricomincia da capo"). */
export function clearLessonResume(lessonId: string): void {
  if (!lessonId) return;
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(keyFor(lessonId));
  } catch {
    /* niente da fare: pazienza */
  }
}
