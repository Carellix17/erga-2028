/* eslint-disable @typescript-eslint/no-explicit-any -- P20-targhetta: quarantena documentata. Gli any sono eredita' dello scaffale Deno (prova del nove: 14 errori prima / 14 dopo sulle due funzioni toccate, zero aggiunti da questo pacco). I file gia' usano deno-lint-ignore mirati per il loro linter di casa; questo segnalibro vale per il cancello eslint node. */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";
import { normalizeLanguage, languageDirective, languageName } from "../_shared/language.ts";
import { originalUrlFromThumb, shortImageLabel } from "../_shared/wikimediaThumb.ts";

/**
 * RICERCA WEB VERA (P5, rifatta P11b e P13).
 *
 * La funzione cerca DAVVERO sul web, usando le API pubbliche e gratuite
 * di Wikipedia (nessuna chiave richiesta):
 *   - action "search"  → elenco di VOCI CANDIDATE (titolo + mini descrizione +
 *                        miniatura) così l'utente SCEGLIE quella giusta (niente
 *                        più roulette del "primo risultato": il caso dell'articolo
 *                        storico scambiato per il film del 1989 insegna).
 *   - default (create) → scarica la voce ESATTA scelta dall'utente (body.title)
 *                        oppure, in assenza di scelta, la migliore non-disambigua
 *                        (body.topic). Con forceAI:true salta Wikipedia e usa
 *                        il manuale AI onesto.
 *
 * Immagini (P13): si scaricano le MINIATURE 1024px, non gli originali — le foto
 * storiche "vere" superano spesso 8MB e venivano TUTTE scartate dal controllo
 * di dimensione (ecco perché le lezioni web erano senza immagini!).
 */

const UA = { "User-Agent": "ErgaStudyApp/1.0 (strumento di studio scolastico)" };
const MAX_WIKI_CHARS = 100000;
const MAX_IMAGES = 3;
const MIN_IMAGE_BYTES = 8 * 1024;    // le miniature 1024px sono ~100-400KB
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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

interface WikiCandidate {
  title: string;
  description: string;
  thumb: string | null;
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

const isDisambigEntry = (c: { title?: string; snippet?: string }): boolean =>
  /disambigu/i.test(stripTags(c?.snippet || "")) ||
  /\((disambigua|disambiguation)\)\s*$/i.test(c?.title || "");

/** Elenco grezzo dei candidati (titolo + snippet), max 6. */
// deno-lint-ignore no-explicit-any
async function rawSearch(topic: string, lang: "it" | "en"): Promise<any[]> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const search = await wikiFetchJson(
    `${base}?action=query&list=search&srsearch=${encodeURIComponent(topic)}&srlimit=6&srnamespace=0&format=json`,
  );
  // deno-lint-ignore no-explicit-any
  return (search?.query?.search ?? []) as any[];
}

/** P13 — VOCI CANDIDATE per il picker: titolo + descrizione breve + miniatura. */
async function searchWikipediaCandidates(topic: string, lang: "it" | "en"): Promise<WikiCandidate[]> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const hits = await rawSearch(topic, lang);
  const titles = hits.map((h) => h?.title).filter((t): t is string => !!t).slice(0, 6);
  if (titles.length === 0) return [];

  // Descrizioni (wikibase short description) + miniature 120px in una chiamata sola
  const info = await wikiFetchJson(
    `${base}?action=query&prop=description%7Cpageimages&piprop=thumbnail&pithumbsize=120&redirects=1&titles=${encodeURIComponent(titles.join("|"))}&format=json`,
  );
  // deno-lint-ignore no-explicit-any
  const pages: Record<string, any> = info?.query?.pages || {};
  // deno-lint-ignore no-explicit-any
  const byTitle = new Map<string, any>();
  for (const p of Object.values(pages)) {
    // deno-lint-ignore no-explicit-any
    byTitle.set((p as any)?.title, p);
  }
  return titles.map((t) => {
    const p = byTitle.get(t);
    return {
      title: t,
      description: typeof p?.description === "string" ? p.description : "",
      thumb: typeof p?.thumbnail?.source === "string" ? p.thumbnail.source : null,
    };
  });
}

/** Scarica UNA voce esatta: testo integrale + data revisione + immagini (miniature!). */
async function fetchWikipediaArticle(title: string, lang: "it" | "en"): Promise<WikiResult | null> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;

  // 🌐 P11b: redirects=1 — senza, i titoli-traghetto ("II Guerra Mondiale" →
  // "Seconda guerra mondiale") davano estratto VUOTO e ripiego AI silenzioso.
  const pageData = await wikiFetchJson(
    `${base}?action=query&prop=extracts%7Crevisions&explaintext=1&exsectionformat=plain&rvprop=timestamp&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
  );
  // deno-lint-ignore no-explicit-any
  const page: any = Object.values(pageData?.query?.pages || {})[0];
  const extract: string = page?.extract || "";
  if (!extract || extract.length < 500) return null;
  const revTs: string | undefined = page?.revisions?.[0]?.timestamp;
  // Dopo il rinvio il titolo VERO è quello della pagina risolta (didascalie + fonte).
  const resolvedTitle: string = page?.title || title;

  const images: WikiImage[] = [];
  const pushImage = (source: string, width: number, height: number, description: string) => {
    if (!/\.(jpe?g|png)(\?|$)/i.test(source)) return;
    images.push({
      url: source,
      width,
      height,
      mime: /\.png(\?|$)/i.test(source) ? "image/png" : "image/jpeg",
      description: description.slice(0, 80),
    });
  };

  // 🖼️ P13 MINIATURE: l'originale dei quadri/mappe storici supera spesso 8MB e
  // veniva SCARTATO (zero immagini!). Chiediamo la miniatura 1024px (~200KB) e
  // ripieghiamo sull'originale solo se la miniatura manca.
  try {
    const mainImg = await wikiFetchJson(
      `${base}?action=query&prop=pageimages&piprop=original%7Cthumbnail&pithumbsize=1024&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
    );
    // deno-lint-ignore no-explicit-any
    const mpage: any = Object.values(mainImg?.query?.pages || {})[0];
    const thumb = mpage?.thumbnail;
    const orig = mpage?.original;
    if (thumb?.source) {
      pushImage(thumb.source, thumb.width ?? 1024, thumb.height ?? 768, resolvedTitle);
    } else if (orig?.source && orig.width >= 240 && orig.height >= 160) {
      pushImage(orig.source, orig.width, orig.height, resolvedTitle);
    }
  } catch (e) {
    console.warn("main image fetch failed:", e);
  }

  // Altre immagini della voce (dimensioni decenti, niente loghi/icone): miniatura 1024px.
  try {
    const more = await wikiFetchJson(
      `${base}?action=query&generator=images&gimlimit=30&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=1024&redirects=1&titles=${encodeURIComponent(title)}&format=json`,
    );
    // deno-lint-ignore no-explicit-any
    const gpages: Record<string, any> = more?.query?.pages || {};
    const candidates = Object.values(gpages)
      // deno-lint-ignore no-explicit-any
      .map((p: any) => p?.imageinfo?.[0])
      .filter(
        // deno-lint-ignore no-explicit-any
        (ii: any) =>
          (ii?.mime === "image/jpeg" || ii?.mime === "image/png") &&
          (ii?.width ?? 0) >= 240 &&
          (ii?.height ?? 0) >= 160 &&
          !/(logo|icon|commons-logo|wiki|edit| stub|ambox)/i.test(ii?.url || ""),
      );
    for (const info of candidates) {
      if (images.length >= MAX_IMAGES) break;
      const source = info?.thumburl || info?.url;
      const origin = info?.url || "";
      if (!source || images.some((im) => im.url === source || im.url === origin)) continue;
      const desc = stripTags(info?.extmetadata?.ImageDescription?.value || "") || resolvedTitle;
      pushImage(source, info?.width ?? 1024, info?.height ?? 768, desc);
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

/** Percorso automatico di riserva (nessuna scelta esplicita): primo candidato non-disambigua. */
async function searchWikipedia(topic: string, lang: "it" | "en"): Promise<WikiResult | null> {
  const hits = await rawSearch(topic, lang);
  const chosen = hits.find((c) => c?.title && !isDisambigEntry(c)) ?? hits[0];
  if (!chosen?.title) return null;
  const article = await fetchWikipediaArticle(chosen.title, lang);
  if (article) return article;
  // Se la prima voce è troppo povera, prova la successiva non-disambigua.
  const runnerUp = hits.filter((c) => c?.title && c.title !== chosen.title && !isDisambigEntry(c))[0];
  if (runnerUp?.title) return await fetchWikipediaArticle(runnerUp.title, lang);
  return null;
}

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action, topic, title, forceAI } = body as {
      action?: string;
      topic?: string;
      title?: string;
      forceAI?: boolean;
    };
    const language = normalizeLanguage(body.language);

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    // ── P13 ACTION "search": elenco voci candidate per il picker (niente creazione) ──
    if (action === "search") {
      if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
        return errorResponse("Inserisci un argomento valido (almeno 3 caratteri).", 400);
      }
      let candidates: WikiCandidate[] = [];
      try {
        candidates = await searchWikipediaCandidates(topic.trim(), language);
      } catch (e) {
        console.error("candidates search failed:", e);
      }
      console.log(`Web search (candidates) for user: ${userId}, topic: "${topic}" → ${candidates.length} voci`);
      return successResponse({ success: true, candidates });
    }

    // ── Creazione del contesto studio ──
    if ((!topic || typeof topic !== "string" || topic.trim().length < 3) &&
        (!title || typeof title !== "string" || title.trim().length < 3)) {
      return errorResponse("Inserisci un argomento valido (almeno 3 caratteri).", 400);
    }
    const topicLabel = (topic || title || "").trim();

    console.log(`Web search (create) for user: ${userId}, topic: "${topicLabel}" title: "${title ?? "-"}" forceAI: ${!!forceAI} (lang: ${language})`);

    // ── 1. Wikipedia (a meno che l'utente non abbia chiesto il manuale AI) ──
    let wiki: WikiResult | null = null;
    if (!forceAI) {
      try {
        wiki = title && typeof title === "string" && title.trim().length >= 3
          ? await fetchWikipediaArticle(title.trim(), language)
          : await searchWikipedia(topicLabel, language);
      } catch (e) {
        console.error("Wikipedia fetch failed (fallback AI):", e);
      }
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
      // ── 2. Fallback ONESTO: manuale dalla conoscenza del modello ──
      const searchPrompt = `${languageDirective(language)}\nFornisci una spiegazione completa e dettagliata sull'argomento: "${topicLabel}".
     \nIncludi:\n- Definizioni e concetti fondamentali\n- Spiegazioni approfondite dei principi chiave\n- Esempi pratici e applicazioni\n- Date, nomi e fatti importanti\n- Connessioni con altri argomenti correlati\n\nScrivi in ${languageName(language)}. Sii esaustivo ma chiaro, come un manuale di studio universitario.\nObiettivo: il testo deve essere sufficientemente ricco da poterci generare 8-15 mini-lezioni.\nScrivi almeno 3000 parole.`;

      const aiText = await callAIText([
        { role: "system", content: `${languageDirective(language)} Sei un esperto accademico e docente universitario. Fornisci contenuti dettagliati, accurati e ben strutturati per lo studio. Rispondi sempre in ${languageName(language)}. Usa titoli, sottotitoli e punti elenco per organizzare il contenuto.` },
        { role: "user", content: searchPrompt },
      ], 0.4, 8000);

      if (!aiText) throw new Error("Nessun contenuto generato per questo argomento.");

      content =
        `FONTE: conoscenza interna del modello AI${forceAI ? " (manuale richiesto esplicitamente dall'utente)" : " (Wikipedia non copre questo argomento; nessuna navigazione web effettuata)"}.\n\n${aiText}`;
      console.log(`Wikipedia ${forceAI ? "skippata (manuale AI richiesto)" : "miss"} → AI manual (${aiText.length} chars)`);
    }

    // ── 3. Scarica le miniature Wikipedia nell'archivio (bucket study-pdfs, come le foto) ──
    // 🪜 P19 — la "scala": miniatura → (sonda HEAD di taglia) → originale entro
    // il recinto. E ogni salto lascia una MOTIVAZIONE che viaggia fino al
    // fumetto in app (niente più caccia ai log: il registro cloud è vuoto).
    const storedPaths: string[] = [];
    const skipReasons: string[] = [];
    let imagesSkipped = 0;

    const recordSkip = (url: string, reason: string) => {
      imagesSkipped++;
      if (skipReasons.length < 5) skipReasons.push(`${shortImageLabel(url)} → ${reason}`);
      console.warn(`image skipped (${reason}): ${url}`);
    };

    type ImgGot = { bytes: Uint8Array; mime: string } | { reason: string };
    const tryDownload = async (url: string): Promise<ImgGot> => {
      try {
        const resp = await fetch(url, { headers: UA });
        if (!resp.ok) return { reason: `HTTP ${resp.status} dal server immagini` };
        const bytes = new Uint8Array(await resp.arrayBuffer());
        if (bytes.length < MIN_IMAGE_BYTES) return { reason: `troppo piccola (${Math.round(bytes.length / 1024)}KB)` };
        if (bytes.length > MAX_IMAGE_BYTES) return { reason: `troppo grande (${(bytes.length / 1048576).toFixed(1)}MB)` };
        return { bytes, mime: /\.png(\?|$)/i.test(url) ? "image/png" : "image/jpeg" };
      } catch (e) {
        return { reason: `rete: ${String(e).slice(0, 60)}` };
      }
    };
    const headLength = async (url: string): Promise<number | null> => {
      try {
        const r = await fetch(url, { method: "HEAD", headers: UA });
        await r.body?.cancel();
        const n = Number(r.headers.get("content-length"));
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch { return null; }
    };

    if (wiki?.images?.length) {
      const ts = Date.now();
      for (let i = 0; i < wiki.images.length && storedPaths.length < MAX_IMAGES; i++) {
        const img = wiki.images[i];

        let got: ImgGot = await tryDownload(img.url);
        if ("reason" in got) {
          const firstReason = got.reason;
          const origUrl = originalUrlFromThumb(img.url);
          if (origUrl) {
            const len = await headLength(origUrl);
            if (len !== null && (len < MIN_IMAGE_BYTES || len > MAX_IMAGE_BYTES)) {
              got = { reason: `${firstReason}; originale fuori recinto (${(len / 1048576).toFixed(1)}MB)` };
            } else {
              const second = await tryDownload(origUrl);
              got = "reason" in second ? { reason: `${firstReason}; originale: ${second.reason}` } : second;
            }
          } else {
            got = { reason: firstReason };
          }
        }
        if ("reason" in got) { recordSkip(img.url, got.reason); continue; }

        const slug = slugify(img.description || wiki.title) || "immagine";
        const ext = got.mime === "image/png" ? "png" : "jpg";
        const path = `${userId}/${ts}_wiki_img_${i}__${slug}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("study-pdfs")
          .upload(path, got.bytes, { contentType: got.mime, upsert: false });
        if (upErr) {
          console.warn("image storage upload failed:", upErr);
          recordSkip(img.url, `il caveau rifiuta il salvataggio (${(upErr.message ?? "?").slice(0, 60)})`);
          continue;
        }
        storedPaths.push(path);
      }
      console.log(`Stored ${storedPaths.length}/${wiki.images.length} wikipedia images (skipped: ${imagesSkipped})`);
      if (skipReasons.length) console.log("image skip reasons:", JSON.stringify(skipReasons));
    }

    // ── 4. Salva il contesto (file_path elenca le immagini, come per le foto) ──
    const { data: context, error: insertError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: `🌐 ${topicLabel}`,
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
      imagesSkipped,
      imagesSkippedReasons: skipReasons,   // 🪧 P19 — il "perché" va fino al fumetto
      pageTitle: wiki?.title ?? null,   // voce davvero usata (per la trasparenza)
      topic: topicLabel,
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nella ricerca. Riprova.");
  }
}));
