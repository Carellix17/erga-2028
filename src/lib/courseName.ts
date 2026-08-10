/**
 * 🌲 P24 — nome "parlante" di un corso: senza estensione né prefissi emoji.
 * Usato dal banner (PathHero), dal selettore percorsi e da StudioView.
 */
export const cleanCourseName = (name: string): string =>
  name
    .replace(/\.(pdf|docx|doc|txt|md|pptx?|xlsx?|jpe?g|png|webp|heic|heif)$/i, "")
    .replace(/^🌐\s*/, "")
    .trim();
