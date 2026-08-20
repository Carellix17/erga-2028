/**
 * Accesso a localStorage a prova di crash.
 *
 * Perché esiste: leggere `window.localStorage` può *lanciare* — Safari in
 * navigazione privata, iframe con storage di terze parti bloccato, quota
 * esaurita, policy aziendali. Farlo a livello di modulo (come faceva
 * App.tsx per il persister di react-query) significa che l'intera app,
 * landing pubblica compresa, non arriva nemmeno al primo render.
 *
 * Qui il rischio è isolato una volta sola, con fallback in memoria: si perde
 * la persistenza tra sessioni, non la pagina.
 */

export type SafeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  key: (index: number) => string | null;
  readonly length: number;
};

function createMemoryStorage(): SafeStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

/**
 * Anche dopo un probe riuscito ogni singola scrittura può fallire (quota).
 * Per questo ogni metodo resta avvolto: nessun ramo dell'app deve poter
 * morire per una scrittura di cache.
 */
function wrapNative(native: Storage): SafeStorage {
  return {
    getItem: (key) => {
      try {
        return native.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        native.setItem(key, value);
      } catch {
        /* quota piena o storage negato: si procede senza persistenza */
      }
    },
    removeItem: (key) => {
      try {
        native.removeItem(key);
      } catch {
        /* noop */
      }
    },
    key: (index) => {
      try {
        return native.key(index);
      } catch {
        return null;
      }
    },
    get length() {
      try {
        return native.length;
      } catch {
        return 0;
      }
    },
  };
}

function resolveStorage(): { storage: SafeStorage; persistent: boolean } {
  try {
    const native = window.localStorage;
    const probeKey = "__erga_storage_probe__";
    native.setItem(probeKey, "1");
    native.removeItem(probeKey);
    return { storage: wrapNative(native), persistent: true };
  } catch {
    return { storage: createMemoryStorage(), persistent: false };
  }
}

const resolved = resolveStorage();

/** Storage sempre utilizzabile: localStorage se disponibile, memoria altrimenti. */
export const safeStorage: SafeStorage = resolved.storage;

/** false quando stiamo scrivendo in memoria (niente persistenza tra sessioni). */
export const storageIsPersistent: boolean = resolved.persistent;
