/**
 * 🔔 PACCHETTO 1 — notifiche oneste per la fabbrica dei percorsi.
 *
 * Prima di oggi la notifica diceva sempre "Modulo pronto 📚" anche quando
 * la generazione si era fermata a metà (errore AI, limite beta): lo
 * studente apriva l'app e trovava il modulo incompleto. Questi
 * costruttori scelgono il messaggio in base a COSA è successo davvero:
 *   · tutto generato      → "pronto"
 *   · generato in parte   → "parzialmente pronto" (con i numeri veri)
 *   · niente di generato  → "non completato" + invito a riprovare
 *
 * Modulo PURO (zero Deno): collaudabile dai test vitest come pagemap.ts.
 */

export interface PushMessage {
  title: string;
  body: string;
}

/** Toglie l'estensione dal nome file ("Fisica.pdf" → "Fisica"). */
export function cleanMaterialName(fileName: string | null | undefined): string {
  const base = String(fileName || "").replace(/\.[^.]+$/, "").trim();
  return base || "il tuo materiale";
}

export interface ModulePushInput {
  /** Lezioni davvero generate (0…total). */
  done: number;
  /** Lezioni che la fabbrica doveva generare. */
  total: number;
  /** Indice del modulo (0-based, come nel DB). */
  moduleIndex: number;
  fileName?: string | null;
}

/** Notifica di fine fabbrica del modulo — dice la verità sui fatti. */
export function buildModulePush(input: ModulePushInput): PushMessage {
  const { done, total, moduleIndex } = input;
  const name = cleanMaterialName(input.fileName);
  const moduleNumber = moduleIndex + 1;

  if (total > 0 && done === total) {
    return {
      title: `Modulo ${moduleNumber} pronto 📚`,
      body: `Le nuove lezioni di «${name}» ti aspettano sul sentiero: apri e riparti da dove eri!`,
    };
  }

  if (done > 0) {
    return {
      title: `Modulo ${moduleNumber} parzialmente pronto`,
      body: `Di «${name}» sono pronte ${done} lezioni su ${total}: aprile quando vuoi, le altre si preparano al volo.`,
    };
  }

  return {
    title: `Modulo ${moduleNumber} non completato`,
    body: `La generazione di «${name}» si è interrotta. Apri il percorso e riprova: ci ripartiamo da dove si era fermata.`,
  };
}

export interface PathPushInput {
  /** Lezioni del primo modulo davvero "calde" (0…warmCount). */
  warmDone: number;
  /** Lezioni che il primo modulo doveva avere. */
  warmCount: number;
  fileName?: string | null;
}

/** Notifica di fine costruzione del percorso (indice + primo modulo caldo). */
export function buildPathPush(input: PathPushInput): PushMessage {
  const { warmDone, warmCount } = input;
  const name = cleanMaterialName(input.fileName);

  if (warmCount > 0 && warmDone === warmCount) {
    return {
      title: "Percorso pronto 🚀",
      body: `Il sentiero di «${name}» è pronto e le prime lezioni sono già calde: inizia subito!`,
    };
  }

  if (warmDone > 0) {
    return {
      title: "Percorso pronto 🚀",
      body: `Il sentiero di «${name}» è pronto e le prime ${warmDone} lezioni sono già calde: inizia subito!`,
    };
  }

  return {
    title: "Percorso pronto 🚀",
    body: `Il sentiero di «${name}» è pronto: apri il percorso per preparare la prima lezione.`,
  };
}
