/**
 * 🖼️ P24 — Recupero immagine di copertina per i corsi da Wikipedia (PageImages).
 *
 * - `fetchCourseImage(subjectTitle)` interroga it.wikipedia.org e restituisce
 *   l'URL della thumbnail (o null se non trovata / errore di rete).
 * - Cache su localStorage (chiave = titolo pulito): evita di ripetere la
 *   chiamata a ogni render, anche quando la colonna DB non è ancora pronta.
 * - NON blocca mai la UI: le card chiamano in modo asincrono e mostrano il
 *   fallback a gradiente finché l'immagine non arriva.
 */

const CACHE_PREFIX = "erga-course-img:";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni
const WIKI_URL = (title: string) =>
  `https://it.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title,
  )}&prop=pageimages&format=json&pithumbsize=600&origin=*`;

interface CacheEntry {
  url: string | null;
  ts: number;
}

function readCache(key: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.url;
  } catch {
    return null;
  }
}

function writeCache(key: string, url: string | null) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ url, ts: Date.now() } satisfies CacheEntry),
    );
  } catch {
    // storage pieno/non disponibile: fallisce in silenzio
  }
}

/** Estrae l'URL della thumbnail dalla risposta dell'API PageImages. */
function extractThumb(raw: unknown): string | null {
  try {
    const anyRaw = raw as {
      query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
    };
    const pages = anyRaw?.query?.pages ?? {};
    for (const page of Object.values(pages)) {
      const src = page?.thumbnail?.source;
      if (src) return src;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCourseImage(subjectTitle: string): Promise<string | null> {
  const key = subjectTitle.trim().toLowerCase();
  if (!key) return null;

  // cache locale (localStorage)
  const cached = readCache(key);
  if (cached !== null) return cached; // null cache è valido: evita ripetute miss

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    const res = await fetch(WIKI_URL(subjectTitle), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    window.clearTimeout(timeout);
    if (!res.ok) {
      writeCache(key, null);
      return null;
    }
    const json = await res.json();
    const url = extractThumb(json);
    writeCache(key, url);
    return url;
  } catch {
    // rete assente / timeout / CORS: fallback, niente crash
    writeCache(key, null);
    return null;
  }
}

/** Legge la cache senza fare rete (per i render). */
export function getCachedCourseImage(subjectTitle: string): string | null {
  return readCache(subjectTitle.trim().toLowerCase());
}
