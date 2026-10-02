import type { Exercise } from "@/components/studio/exercises/ExerciseRenderer";

/**
 * P50 — LA POSIZIONE DELLA RISPOSTA NON È PIÙ UN INDIZIO.
 *
 * Problema (analisi del 3 ottobre): nella Pratica esisteva già un filtro che
 * mescola le opzioni (`exerciseQuality.normalizeExercises`), ma nel percorso
 * delle mini-lezioni NON veniva mai usato — e comunque quel filtro lavora su
 * un'altra forma di esercizio (risposta per VALORE), mentre le lezioni salvano
 * `correct_index` (risposta per POSIZIONE). Risultato: nel quiz della lezione
 * la risposta corretta restava sempre dove l'AI l'aveva scritta.
 *
 * Qui la cura, in due regole:
 *  1. MESCOLAMENTO DETERMINISTICO — l'ordine dipende dall'impronta
 *     dell'esercizio, non dal momento: riaprire la lezione, tornare indietro
 *     con la freccia o rileggere il test finale mostra SEMPRE lo stesso
 *     ordine. Niente opzioni che ballano sotto il dito, e test verificabili.
 *  2. GARANZIA DI SPOSTAMENTO — se il caso lascia l'ordine identico a quello
 *     dell'AI, si ruota di uno: la risposta corretta non resta mai al suo
 *     posto originale.
 *
 * Fallback pulito: esercizi veri/falso, tipi diversi, opzioni assenti o
 * `correct_index` fuori intervallo tornano IMMUTATI (zero perdite di dati).
 */

/** PRNG deterministico (mulberry32): stesso seme → stessa sequenza. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a: stringa → intero a 32 bit (seme del mescolamento). */
export function seedFromString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Impronta stabile dell'esercizio: due esercizi diversi non si influenzano a
 * vicenda, e lo stesso esercizio ha sempre lo stesso ordine anche se cambia
 * di posizione nella lista.
 */
function fingerprint(exercise: Exercise): string {
  const text =
    exercise.question ??
    exercise.statement ??
    exercise.sentence_with_blank ??
    "";
  return `${exercise.type}|${text}`.slice(0, 160);
}

/** Mescola gli INDICI con Fisher–Yates (l'array originale resta intatto). */
function shuffledIndices(length: number, rng: () => number): number[] {
  const idx = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/**
 * Prepara UN esercizio per la visualizzazione.
 * - scelta multipla valida → opzioni mescolate, `correct_index` rimappato
 *   (la risposta resta quella giusta, cambia solo dove si trova);
 * - tutto il resto → restituito immutato.
 *
 * @param salt distingue contesti diversi (es. "test-finale") e, insieme
 *   all'indice passato da `prepareLessonExercises`, evita che due esercizi
 *   identici nella stessa lezione ricevano lo stesso ordine.
 */
export function prepareExercise(exercise: Exercise, salt = ""): Exercise {
  if (!exercise || exercise.type !== "multiple_choice") return exercise;

  const options = Array.isArray(exercise.options) ? exercise.options : [];
  const correct = exercise.correct_index;
  const isValidIndex =
    typeof correct === "number" && Number.isInteger(correct) && correct >= 0 && correct < options.length;

  if (options.length < 2 || !isValidIndex) return exercise;

  const rng = mulberry32(seedFromString(`${salt}|${fingerprint(exercise)}`));
  let order = shuffledIndices(options.length, rng);

  // Garanzia di spostamento: l'ordine iniziale è per definizione [0,1,2,3].
  if (order.every((value, i) => value === i)) {
    order = order.map((_, i) => (i + 1) % order.length);
  }

  const remappedCorrect = order.indexOf(correct);

  return {
    ...exercise,
    options: order.map((i) => options[i]),
    correct_index: remappedCorrect,
  };
}

/** Prepara la lista completa degli esercizi di una lezione (o del test finale). */
export function prepareLessonExercises(
  exercises: Exercise[] | undefined | null,
  salt = "",
): Exercise[] {
  if (!Array.isArray(exercises)) return [];
  return exercises.map((ex, i) => prepareExercise(ex, `${salt}#${i}`));
}
