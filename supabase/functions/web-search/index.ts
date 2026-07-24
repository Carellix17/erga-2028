import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";
import { normalizeLanguage, languageDirective, languageName } from "../_shared/language.ts";

/**
 * RICERCA WEB VERA (P5).
 *
 * Prima di questa versione la funzione non usciva mai su Internet: chiedeva
 * al modello AI di scrivere un "manuale" dalla sua memoria di addestramento.
 * Conseguenze: contenuti non verificabili/databili e ZERO immagini possibili.
 *
 * Ora la funzione cerca DAVVERO sul web, usando le API pubbliche e gratuite
 * di Wikipedia (nessuna chiave richiesta):
 *   1. cerca la voce più pertinente all'argomento (lingua dell'app: it/en)
 *   2. scarica il testo integrale + la data dell'ultima revisione (fonte dichiarata)
 *   3. scarica fino a 3 immagini reali della voce e le archivia (come per le foto)
 *      → diventeranno figure delle lezioni grazie a extract-lesson-figures
 *
 * Se Wikipedia non copre l'argomento, resta il vecchio percorso (manuale AI),
 * ma con intestazione ONESTA che dichiara la provenienza.
 */

const UA = { "User-Agent": "ErgaStudyApp/1.0 (strumento di studio scolastico)" };
const MAX_WIKI_CHARS = 100000;
const MAX_IMAGES = 3;
const MIN_IMAGE_BYTES = 15 * 1024;   // sotto i 15KB è quasi sempre un'icona
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

interface WikiImage {
  url: string;
  width: number;
  height: number;
  mime: string;
  description: string;
}

interface WikiResult {
  title: string;
  extract: string;
  revTs?: string;
  images: WikiImage[];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Trasforma una didascalia in uno slug sicuro da infilare nel nome del file. */
function slugify(s: string): string {
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // segni diacritici combinanti (à → a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

// deno-lint-ignore no-explicit-any
async function wikiFetchJson(url: string): Promise<any> {
  const resp = await fetch(url, { headers: UA });
  if (!resp.ok) throw new Error(`Wikipedia HTTP ${resp.status}`);
  return resp.json();
}

/** Cerca su Wikipedia: voce migliore + testo integrale + data revisione + immagini. */
async function searchWikipedia(topic: string, lang: "it" | "en"): Promise<WikiResult | null> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;

  // 1. Trova la voce più pertinente: guardiamo i primi 3 candidati e SALTIAMO
  // le pagine di disambiguazione ("Disambiguazione"/"disambiguation"): portano
  // a elenchi di significati, non a un articolo studiabile.
  const search = await wikiFetchJson(
    `${base}?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=3&srnamespace=0&format=json`,
  );
  // deno-lint-ignore no-explicit-any
  const candidates: any[] = search?.query?.search ?? [];
  const isDisambig = (c: { title?: string; snippet?: string }) =>
    /disambigu/i.test(stripTags(c?.snippet || "")) ||
    /\((disambigua|disambiguation)\)\s*$/i.test(c?.title || "");
  const chosen = candidates.find((c) => c?.title && !isDisambig(c)) ?? candidates[0];
  const title: string | undefined = chosen?.title;
  if (!title) return null;

  // 2. Testo integrale + data ultima revisione (una chiamata sola)
  // 🌐 P11b BUG RINVIO: senza "redirects=1" Wikipedia risponde con l'estratto
  // VUOTO per i titoli-traghetto (es. "II Guerra Mondiale" → "Seconda guerra
  // mondiale") e la ricerca ripiegava silenziosamente sul manuale AI.
  const pageData = await wikiFetchJson(
    `${base}?action=query&prop=extracts%7Crevisions&explaintext=1&exsectionformat=plain&rvprop=timestamp&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
  );
  // deno-lint-ignore no-explicit-any
  const page: any = Object.values(pageData?.query?.pages || {})[0];
  const extract: string = page?.extract || "";
  if (!extract || extract.length < 500) return null;
  const revTs: string | undefined = page?.revisions?.[0]?.timestamp;
  // Dopo il rinvio il titolo VERO è quello della pagina risolta (lo usiamo per
  // la didascalia dell'immagine principale e per l'intestazione della fonte).
  const resolvedTitle: string = page?.title || title;

  const images: WikiImage[] = [];

  // 3. Immagine principale della voce (quasi sempre la più significativa)
  try {
    const mainImg = await wikiFetchJson(
      `${base}?action=query&prop=pageimages&piprop=original&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
    );
    // deno-lint-ignore no-explicit-any
    const mpage: any = Object.values(mainImg?.query?.pages || {})[0];
    const orig = mpage?.original;
    if (orig?.source && orig.width >= 240 && orig.height >= 160 && /\.(jpe?g|png)(\?|$)/i.test(orig.source)) {
      images.push({
        url: orig.source,
        width: orig.width,
        height: orig.height,
        mime: /\.png(\?|$)/i.test(orig.source) ? "image/png" : "image/jpeg",
        description: resolvedTitle,
      });
    }
  } catch (e) {
    console.warn("main image fetch failed:", e);
  }

  // 4. Altre immagini della voce (dimensioni decenti, niente loghi/icone)
  try {
    const more = await wikiFetchJson(
      `${base}?action=query&generator=images&gimlimit=30&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
    );
    // deno-lint-ignore no-explicit-any
    const gpages: Record<string, any> = more?.query?.pages || {};
    const candidates = Object.values(gpages)
      // deno-lint-ignore no-explicit-any
      .map((p: any) => p?.imageinfo?.[0])
      .filter(
        // deno-lint-ignore no-explicit-any
        (ii: any) =>
          ii &&
          (ii.mime === "image/jpeg" || ii.mime === "image/png") &&
          ii.width >= 280 && ii.height >= 200 &&
          !/icon|logo|symbol|disambig|commons-/i.test(ii.descriptionurl || ""),
      );
    // deno-lint-ignore no-explicit-any
    candidates.sort((a: any, b: any) => b.width * b.height - a.width * a.height);
    for (const ii of candidates) {
      if (images.length >= MAX_IMAGES) break;
      // deno-lint-ignore no-explicit-any
      const info: any = ii;
      if (images.some((im) => im.url === info.url)) continue;
      const desc = stripTags(info?.extmetadata?.ImageDescription?.value || "") || title;
      images.push({ url: info.url, width: info.width, height: info.height, mime: info.mime, description: desc.slice(0, 80) });
    }
  } catch (e) {
    console.warn("gallery fetch failed:", e);
  }

  return {
    title: resolvedTitle,
    extract: extract.slice(0, MAX_WIKI_CHARS),
    revTs,
    images: images.slice(0, MAX_IMAGES),
  };
}

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { topic } = body;
    const language = normalizeLanguage(body.language);

    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return errorResponse("Inserisci un argomento valido (almeno 3 caratteri).", 400);
    }

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Web search for user: ${userId}, topic: "${topic}" (lang: ${language})`);

    // ── 1. Ricerca VERA su Wikipedia ──
    let wiki: WikiResult | null = null;
    try {
      wiki = await searchWikipedia(topic.trim(), language);
    } catch (e) {
      console.error("Wikipedia search failed (fallback AI):", e);
    }

    let content = "";
    let source: "wikipedia" | "ai" = "ai";

    if (wiki) {
      source = "wikipedia";
      const revDate = wiki.revTs
        ? new Date(wiki.revTs).toLocaleDateString(language === "en" ? "en-GB" : "it-IT")
        : "?";
      content =
        `FONTE: Wikipedia (${language}.wikipedia.org), voce «${wiki.title}», ultima revisione: ${revDate}. ` +
        `Contenuto riadattato per lo studio.\n\n${wiki.extract}\n\n` +
        `(Contenuto tratto da Wikipedia, licenza CC BY-SA.)`;
      console.log(`Wikipedia hit: "${wiki.title}" (${wiki.extract.length} chars, ${wiki.images.length} images)`);
    } else {
      // ── 2. Fallback ONESTO: manuale dalla conoscenza del modello (come prima) ──
      const searchPrompt = `${languageDirective(language)}\nFornisci una spiegazione completa e dettagliata sull'argomento: "${topic}".
     \nIncludi:\n- Definizioni e concetti fondamentali\n- Spiegazioni approfondite dei principi chiave\n- Esempi pratici e applicazioni\n- Date, nomi e fatti importanti\n- Connessioni con altri argomenti correlati\n\nScrivi in ${languageName(language)}. Sii esaustivo ma chiaro, come un manuale di studio universitario.\nObiettivo: il testo deve essere sufficientemente ricco da poterci generare 8-15 mini-lezioni.\nScrivi almeno 3000 parole.`;

      const aiText = await callAIText([
        { role: "system", content: `${languageDirective(language)} Sei un esperto accademico e docente universitario. Fornisci contenuti dettagliati, accurati e ben strutturati per lo studio. Rispondi sempre in ${languageName(language)}. Usa titoli, sottotitoli e punti elenco per organizzare il contenuto.` },
        { role: "user", content: searchPrompt },
      ], 0.4, 8000);

      if (!aiText) throw new Error("Nessun contenuto generato per questo argomento.");

      content =
        `FONTE: conoscenza interna del modello AI (Wikipedia non copre questo argomento; nessuna navigazione web effettuata).\n\n${aiText}`;
      console.log(`Wikipedia miss → AI manual (${aiText.length} chars)`);
    }

    // ── 3. Scarica le immagini Wikipedia nell'archivio (bucket study-pdfs, come le foto) ──
    const storedPaths: string[] = [];
    if ( wiki?.images?.length ) {
      const ts = Date.now();
      for (let i = 0; i < wiki.images.length && storedPaths.length < MAX_IMAGES; i++) {
        const img = wiki.images[i];
        try {
          const resp = await fetch(img.url, { headers: UA });
          if (!resp.ok) { console.warn(`image HTTP ${resp.status} for ${img.url}`); continue; }
          const bytes = new Uint8Array(await resp.arrayBuffer());
          if (bytes.length < MIN_IMAGE_BYTES || bytes.length > MAX_IMAGE_BYTES) {
            console.warn(`image skipped (size ${bytes.length}): ${img.url}`);
            continue;
          }
          const slug = slugify(img.description || wiki.title) || "immagine";
          const ext = img.mime === "image/png" ? "png" : "jpg";
          const path = `${userId}/${ts}_wiki_img_${i}__${slug}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("study-pdfs")
            .upload(path, bytes, { contentType: img.mime, upsert: false });
          if (upErr) {
            console.warn("image storage upload failed:", upErr);
            continue;
          }
          storedPaths.push(path);
        } catch (e) {
          console.warn("image download/store failed:", e);
        }
      }
      console.log(`Stored ${storedPaths.length}/${wiki.images.length} wikipedia images`);
    }

    // ── 4. Salva il contesto (file_path elenca le immagini, come per le foto) ──
    const { data: context, error: insertError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: `🌐 ${topic}`,
        file_path: storedPaths.length > 0 ? storedPaths.join(",") : null,
        content: content,
        processing_status: "completed",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Errore nel salvataggio del contenuto.");
    }

    console.log(`Web search content saved as context ${context.id} (source: ${source})`);

    return successResponse({
      success: true,
      contextId: context.id,
      contentLength: content.length,
      source,              // "wikipedia" | "ai" — il client lo usa per un toast onesto
      imagesCount: storedPaths.length,
      topic,
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nella ricerca. Riprova.");
  }
}));
