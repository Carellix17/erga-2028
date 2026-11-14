/**
 * 🌲 P24 — nome "parlante" di un corso: senza estensione né prefissi emoji.
 * Usato dal banner (PathHero), dal selettore percorsi e da StudioView.
 */
export const cleanCourseName = (name: string): string =>
  name
    .replace(/\.(pdf|docx|doc|txt|md|pptx?|xlsx?|jpe?g|png|webp|heic|heif)$/i, "")
    .replace(/^🌐\s*/, "")
    .trim();

const foldCourseQuery = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Ricerca percorsi: il nome pulito contiene il testo, senza maiuscole né accenti. */
export const courseNameMatches = (fileName: string, query: string): boolean => {
  const needle = foldCourseQuery(query.trim());
  if (!needle) return true;
  return foldCourseQuery(cleanCourseName(fileName)).includes(needle);
};
