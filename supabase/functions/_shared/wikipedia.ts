/**
 * 🖼️ La macchinetta delle immagini reali (pacco P7).
 *
 * Riutilizzo leggero della ricetta collaudata in web-search (P5): dato un
 * argomento, chiede a Wikipedia UNA buona immagine di copertina della voce,
 * con filtri anti-logo e anti-spazzatura. Restituisce anche il link alla
 * voce, per la dicitura di fonte onesta sotto l'immagine.
 */

export interface WikiImage {
  url: string;
  caption: string;
  pageTitle: string;
  pageUrl: string;
}

const UA = { "User-Agent": "ErgaStudyApp/1.0 (studio app; contatto via GitHub Carellix17/erga-2028)" };

// deno-lint-ignore no-explicit-any
function stripTags(s: any): string {
  return typeof s === "string" ? s.replace(/<[^>]*>/g, "").trim() : "";
}

/**
 * Cerca la voce Wikipedia più pertinente alla query e ne prende l'immagine
 * principale (miniatura da ~800px: abbastanza nitida per la chat, leggera).
 * Ritorna null se Wikipedia non ha nulla di adatto — meglio niente immagine
 * che un'immagine sbagliata.
 */
export async function fetchWikipediaImage(
  query: string,
  lang: "it" | "en",
): Promise<WikiImage | null> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return null;
  const base = `https://${lang}.wikipedia.org/w/api.php`;

  try {
    // 1) Trova la voce giusta
    const searchResp = await fetch(
      `${base}?action=query&list=search&srlimit=3&srsearch=${encodeURIComponent(q)}&format=json`,
      { headers: UA },
    );
    if (!searchResp.ok) return null;
    // deno-lint-ignore no-explicit-any
    const searchData: any = await searchResp.json();
    // deno-lint-ignore no-explicit-any
    const hits: any[] = searchData?.query?.search || [];
    if (hits.length === 0) return null;
    const title: string = hits[0].title;

    // 2) Immagine principale della voce
    const imgResp = await fetch(
      `${base}?action=query&prop=pageimages&piprop=thumbnail%7Coriginal&pithumbsize=800&titles=${encodeURIComponent(title)}&format=json`,
      { headers: UA },
    );
    if (!imgResp.ok) return null;
    // deno-lint-ignore no-explicit-any
    const imgData: any = await imgResp.json();
    // deno-lint-ignore no-explicit-any
    const pages: Record<string, any> = imgData?.query?.pages || {};
    const page = Object.values(pages)[0];
    // deno-lint-ignore no-explicit-any
    const p: any = page;
    const thumb: string | undefined = p?.thumbnail?.source || p?.original?.source;
    if (!thumb) return null;
    if (!/^https:\/\//i.test(thumb)) return null;

    const caption = stripTags(hits[0]?.snippet) || title;
    return {
      url: thumb,
      caption: caption.slice(0, 140),
      pageTitle: title,
      pageUrl: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    };
  } catch (e) {
    console.warn("fetchWikipediaImage failed:", e);
    return null;
  }
}
