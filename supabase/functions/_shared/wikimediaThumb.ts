/**
 * 🧭 THUMB WIKIMEDIA → ORIGINALE — pacco P19 (seconda rotaia della "scala").
 *
 * Le miniature Wikimedia hanno una forma fissa:
 *   https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Nome.jpg/1280px-Nome.jpg?…
 * e l'originale si ricava regolarmente: via "/thumb", via il segmento
 * finale "<larghezza>px-Nome". Serve quando la miniatura fallisce e vogliamo
 * provare l'originale (dopo sonda HEAD di taglia). Puro, senza dipendenze:
 * lo importa la edge web-search e lo collaudano i test Node.
 */

/** Dall'URL di una miniatura ricava l'URL dell'originale; null se non è una thumb. */
export function originalUrlFromThumb(url: string): string | null {
  if (!url || !url.includes("/thumb/")) return null;
  const clean = url.split("?")[0];
  const idx = clean.indexOf("/thumb/");
  const head = clean.slice(0, idx);
  const rest = clean.slice(idx + "/thumb/".length); // "4/4e/Nome.jpg/1280px-Nome.jpg"
  const slash = rest.lastIndexOf("/");
  if (slash <= 0) return null;
  const orig = `${head}/${rest.slice(0, slash)}`;
  return /^https:\/\//i.test(orig) ? orig : null;
}

/** Etichetta corta di un URL per i resoconti (ultima parte, senza query, ≤48). */
export function shortImageLabel(url: string): string {
  const clean = (url || "").split("?")[0];
  const tail = clean.split("/").pop() || clean;
  try {
    return decodeURIComponent(tail).slice(-48);
  } catch {
    return tail.slice(-48);
  }
}
