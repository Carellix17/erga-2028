// 🏭 P10b — LA LIBRERIA DEI MODULI.
// Un percorso di lezioni è diviso in MODULI da MODULE_SIZE lezioni ciascuno,
// come i vagoni di un treno: quando apri la prima lezione di un vagone ancora
// da costruire, la fabbrica (edge function generate-lessons, azione
// "generateModule") costruisce TUTTO il vagone e ti avvisa con una notifica.
// ⚠️ MODULE_SIZE deve restare allineato con il server
//    (supabase/functions/generate-lessons/index.ts) e con il sentiero
//    zig-zag (LessonsList importa la costante da qui).

export const MODULE_SIZE = 4;

/** Forma minima di una lezione ai fini dei calcoli sui moduli. */
export interface ModuleLessonLike {
  is_generated: boolean;
  lesson_order?: number;
}

/** Indice del modulo che contiene la lezione (lezioni 0-3 → modulo 0, 4-7 → modulo 1, …). */
export const moduleIndexOf = (lessonIndex: number): number =>
  Math.floor(lessonIndex / MODULE_SIZE);

/** Intervallo [start, end] (inclusi) delle lezioni del modulo. */
export const moduleRange = (moduleIndex: number): { start: number; end: number } => ({
  start: moduleIndex * MODULE_SIZE,
  end: moduleIndex * MODULE_SIZE + MODULE_SIZE - 1,
});

/** Quanti moduli servono per N lezioni (l'ultimo può essere più corto). */
export const moduleCount = (totalLessons: number): number =>
  totalLessons <= 0 ? 0 : Math.ceil(totalLessons / MODULE_SIZE);

/** Vero se la lezione è la prima del suo modulo (il "cancello" del vagone). */
export const isFirstOfModule = (lessonIndex: number): boolean =>
  lessonIndex % MODULE_SIZE === 0;

/** Le lezioni del modulo, in ordine (usa lesson_order se presente, altrimenti la posizione nell'array). */
export function lessonsInModule<T extends ModuleLessonLike>(lessons: T[], moduleIndex: number): T[] {
  const { start, end } = moduleRange(moduleIndex);
  return lessons.filter((l, pos) => {
    const order = l.lesson_order ?? pos;
    return order >= start && order <= end;
  });
}

/** Le lezioni del modulo ancora da generare. */
export const missingInModule = <T extends ModuleLessonLike>(moduleLessons: T[]): T[] =>
  moduleLessons.filter((l) => !l.is_generated);

/** Vero se NESSUNA lezione del modulo è stata generata (vagone tutto da costruire). */
export const isModuleFullyMissing = <T extends ModuleLessonLike>(moduleLessons: T[]): boolean =>
  moduleLessons.length > 0 && moduleLessons.every((l) => !l.is_generated);

// ── 🔒 P10c IL CANCELLO DEL VAGONE ──
// Mentre la fabbrica costruisce un modulo (moduleIndex != null), SOLO la prima
// lezione di quel modulo resta apribile e conduce alla sala d'attesa; le altre
// restano chiuse anche se già tornite, finché TUTTO il vagone non è pronto.

/** Vero se la lezione appartiene al modulo attualmente in fabbrica. */
export const isInGatedModule = (lessonIndex: number, gatedModuleIndex: number | null | undefined): boolean =>
  gatedModuleIndex != null && moduleIndexOf(lessonIndex) === gatedModuleIndex;

/** La "porta" del vagone in fabbrica: la prima lezione del modulo (unica apribile). */
export const isGateLesson = (lessonIndex: number, gatedModuleIndex: number | null | undefined): boolean =>
  isInGatedModule(lessonIndex, gatedModuleIndex) && isFirstOfModule(lessonIndex);
