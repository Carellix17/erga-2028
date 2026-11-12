/**
 * Segnalibro dell'ultimo percorso aperto in Studio.
 * Sul dispositivo è sincrono: rientrare nella sezione non aspetta il cloud.
 * Manca la chiave finché non l'abbiamo mai letto o scritto per quell'utente.
 */

const KEY_PREFIX = "erga-last-studio-context:";

export interface LastStudioContext {
  known: boolean;
  id: string | null;
}

function storageKey(userId: string) {
  return KEY_PREFIX + userId;
}

export function readLastStudioContext(userId: string | null): LastStudioContext {
  if (!userId) return { known: false, id: null };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw === null) return { known: false, id: null };
    return { known: true, id: raw || null };
  } catch {
    return { known: false, id: null };
  }
}

export function writeLastStudioContext(userId: string | null, contextId: string | null) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), contextId ?? "");
  } catch {
    // Storage piena o bloccata: la visita corrente resta corretta lo stesso.
  }
}

/** Un solo percorso non ha bisogno del segnalibro: non c'è ambiguità. */
export function isStudioBookmarkReady(loaded: boolean, courseCount: number) {
  return loaded || courseCount === 1;
}

export function resolveStudioContextId(input: {
  selectedId?: string | null;
  chosenId?: string | null;
  rememberedId?: string | null;
  bookmarkReady: boolean;
  courseIds: readonly string[];
}): string | null {
  const has = (id: string | null | undefined): id is string => !!id && input.courseIds.includes(id);
  if (has(input.selectedId)) return input.selectedId;
  if (has(input.chosenId)) return input.chosenId;
  if (has(input.rememberedId)) return input.rememberedId;
  if (input.bookmarkReady) return input.courseIds[0] ?? null;
  return null;
}
