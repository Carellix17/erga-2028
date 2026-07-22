import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIStream, callAIText } from "../_shared/ai.ts";
import { normalizeLanguage, languageDirective, languageName } from "../_shared/language.ts";
import { parsePages, sampleAcrossPages } from "../_shared/pagemap.ts";
import { detectActionIntent, parseForcedAction } from "../_shared/agentintent.ts";

/*
 * 💬 LA MACCHINA DELLA CHAT — edizione P7.
 * Novità del pacco:
 *  1. Tubo anti-pianto: se il rivo dall'AI si rompe a metà risposta, ORA la
 *     macchina riattacca educatamente (evento "warning") invece di lasciare
 *     l'app ad aspettare all'infinito.
 *  2. Fonti: dopo ogni risposta manda, in coda al flusso, da QUALI documenti e
 *     pagine ha pescato (calcolato qui, coi marcatori di P6).
 *  3. Chat per argomento: topicContextId → l'AI vede SOLO quel documento, con
 *     il suo contratto su misura (scritto dall'AI stessa, action "topicPrompt").
 *  4. Poteri da agente: istruzioni per proporre azioni (```erga_actions).
 *  5. Immagini reali: istruzioni per il tag [IMG: query] (messa dal client).
 */

const MAX_HISTORY_MESSAGES = 14;
const MAX_MESSAGE_CHARS = 2000;

interface SourceCandidate {
  file: string;
  num: number | null;
  text: string;
}

const STOPWORDS = new Set([
  "della", "delle", "degli", "dello", "come", "cosa", "quando", "perche", "perché",
  "sono", "questo", "questa", "queste", "questi", "nella", "nelle", "negli", "sulle",
  "sullo", "anche", "molto", "puoi", "fare", "hanno", "dove", "quale", "quali",
  "with", "what", "when", "where", "that", "this", "from", "your", "and", "for",
  "are", "how", "why", "does", "the",
]);

/** Le parole forti dell'ultima domanda dell'utente (serve per le fonti). */
function queryWordsOf(messages: { role: string; content: unknown }[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const txt = Array.isArray(m.content)
      ? (m.content as { type: string; text?: string }[])
          .filter((p) => p.type === "text").map((p) => p.text || "").join(" ")
      : String(m.content ?? "");
    return txt
      .toLowerCase()
      .split(/[^a-zàèéìòù0-9]+/i)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
      .slice(0, 12);
  }
  return [];
}

/** Il testo dell'ultima domanda dell'utente (serve al fiuto del Piano B). */
function lastUserTextOf(messages: { role: string; content: unknown }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== "user") continue;
    const m = messages[i];
    const txt = Array.isArray(m.content)
      ? (m.content as { type: string; text?: string }[])
          .filter((p) => p.type === "text").map((p) => p.text || "").join(" ")
      : String(m.content ?? "");
    return txt.trim().slice(0, 600);
  }
  return "";
}

/** Il "bibliotecario": trova le pagine/pezzi più pertinenti alla domanda. */
function buildSources(
  contexts: { file_name: string; content: string }[],
  words: string[],
): { file: string; pageStart: number | null; pageEnd: number | null; excerpt: string }[] {
  if (words.length === 0) return [];

  const candidates: SourceCandidate[] = [];
  for (const ctx of contexts) {
    if (!ctx?.content) continue;
    const pages = parsePages(ctx.content);
    if (pages.length > 0) {
      for (const p of pages) candidates.push({ file: ctx.file_name, num: p.num, text: p.text });
    } else {
      // Documento senza marcatori: lo tagliamo a fette da ~3000 caratteri.
      for (let off = 0; off < ctx.content.length; off += 3000) {
        candidates.push({ file: ctx.file_name, num: null, text: ctx.content.slice(off, off + 3000) });
      }
    }
  }

  const scored = candidates.map((c) => {
    const lc = c.text.toLowerCase();
    let score = 0;
    let bestPos = -1;
    for (const w of words) {
      let pos = lc.indexOf(w);
      let count = 0;
      while (pos !== -1 && count < 6) {
        count++;
        if (bestPos === -1) bestPos = pos;
        pos = lc.indexOf(w, pos + w.length);
      }
      score += count;
    }
    return { ...c, score, bestPos };
  }).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  const top: { file: string; pageStart: number | null; pageEnd: number | null; excerpt: string }[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    const key = `${s.file}:${s.num ?? "full"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pos = Math.max(0, (s.bestPos === -1 ? 0 : s.bestPos) - 200);
    const excerpt =
      (pos > 0 ? "…" : "") + s.text.slice(pos, pos + 420).trim() +
      (pos + 420 < s.text.length ? "…" : "");
    top.push({ file: s.file, pageStart: s.num, pageEnd: s.num, excerpt });
    if (top.length >= 2) break;
  }
  return top;
}

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { messages } = body;
    const language = normalizeLanguage(body.language);
    const topicContextId: string | null = typeof body.topicContextId === "string" ? body.topicContextId : null;
    const topicSystemPrompt: string | null =
      typeof body.topicSystemPrompt === "string" && body.topicSystemPrompt.trim()
        ? body.topicSystemPrompt.trim().slice(0, 1200)
        : null;

    // 📅 L'AI non sa che giorno è: glielo diciamo noi, altrimenti "domani"
    // o "lunedì prossimo" diventano date inventate (visto nei test del capocantiere!).
    const nowMs = Date.now();
    const todayISO = new Date(nowMs).toISOString().slice(0, 10);
    const tomorrowISO = new Date(nowMs + 86400000).toISOString().slice(0, 10);

    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;

    console.log(`Chat request for user: ${userId} (authenticated: ${auth.isAuthenticated}, topic: ${topicContextId ?? "generale"})`);

    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;

    // ── ACTION: scrittura del "contratto" personalizzato della chat d'argomento ──
    if (body.action === "topicPrompt") {
      if (!topicContextId) return errorResponse("topicContextId richiesto", 400);
      let { data: ctxP } = await supabase
        .from("study_contexts")
        .select("file_name, content")
        .eq("id", topicContextId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!ctxP && legacyUserId) {
        const { data: legacyCtxP } = await supabase
          .from("study_contexts")
          .select("file_name, content")
          .eq("id", topicContextId)
          .eq("user_id", legacyUserId)
          .maybeSingle();
        ctxP = legacyCtxP;
      }
      if (!ctxP?.content) return errorResponse("Documento non trovato", 404);

      const sample = sampleAcrossPages(String(ctxP.content), 9000);
      const prompt = await callAIText([
        { role: "system", content: languageDirective(language) },
        {
          role: "user",
          content: `Sei il configuratore di un tutor personale. Scrivi le ISTRUZIONI OPERATIVE (massimo 110 parole) per un tutor AI che aiuterà lo studente SOLO sul documento "${ctxP.file_name}".
Comincia ESATTAMENTE con: "In questa chat sei il tutor specializzato su ${ctxP.file_name}." e aggiungi: tono, cosa enfatizzare in base al contenuto, come sfruttare la struttura del documento, cosa proporre quando lo studente è in difficoltà. Solo il testo delle istruzioni, niente preamboli.

CONTENUTO DEL DOCUMENTO (assaggio):
${sample}`,
        },
      ], 0.4, 400);
      return successResponse({ prompt: prompt.trim().slice(0, 1200) });
    }

    if (!messages) {
      return errorResponse("Missing messages", 400);
    }

    // ── Contesti di studio: TUTTI (chat generale) O SOLO UNO (chat d'argomento) ──
    let mergedContexts: { file_name: string; content: string }[] = [];
    if (topicContextId) {
      let { data: topicCtx } = await supabase
        .from("study_contexts")
        .select("content, file_name")
        .eq("id", topicContextId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!topicCtx && legacyUserId) {
        const { data: legacyTopicCtx } = await supabase
          .from("study_contexts")
          .select("content, file_name")
          .eq("id", topicContextId)
          .eq("user_id", legacyUserId)
          .maybeSingle();
        topicCtx = legacyTopicCtx;
      }
      if (!topicCtx) return errorResponse("Documento della chat non trovato", 404);
      mergedContexts = [topicCtx];
    } else {
      const { data: contexts } = await supabase
        .from("study_contexts")
        .select("content, file_name")
        .eq("user_id", userId);
      const { data: legacyContexts } = legacyUserId
        ? await supabase.from("study_contexts").select("content, file_name").eq("user_id", legacyUserId)
        : { data: null };
      mergedContexts = [...(contexts || []), ...(legacyContexts || [])];
    }

    // Fetch study events
    const { data: events } = await supabase
      .from("study_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true });

    // Fetch user profile
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("institute_type, subject_levels, nickname, first_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (mergedContexts.length === 0) {
      return new Response(
        JSON.stringify({ response: "Non ho ancora accesso a nessun materiale di studio. Per poterti aiutare, carica prima dei PDF con i tuoi appunti o dispense usando il pulsante in alto a destra." }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const MAX_STUDY_CHARS_TOTAL = 24000;
    const MAX_CHARS_PER_FILE = 8000;
    const MAX_TOPIC_CHARS = 30000;
    const MAX_EVENTS_CHARS = 1500;

    const trimTo = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "\n…" : s);

    // Con l'assaggio distribuito (P6) anche i libri lunghi danno pezzi dalla fine,
    // non solo l'inizio — e le fonti possono citare le pagine vere.
    const studyContent = topicContextId
      ? `--- ${mergedContexts[0].file_name} ---\n${sampleAcrossPages(String(mergedContexts[0].content), MAX_TOPIC_CHARS)}`
      : trimTo(
        mergedContexts.slice(0, 4).map((c) => {
          const sampled = sampleAcrossPages(String(c.content), MAX_CHARS_PER_FILE);
          return `--- ${c.file_name} ---\n${sampled}`;
        }).join("\n\n"),
        MAX_STUDY_CHARS_TOTAL
      );

    const eventsTextRaw = events && events.length > 0
      ? "Eventi programmati:\n" + events.map((e: { event_type: string; title: string; subject: string; event_date: string }) =>
          `- ${e.event_type === 'test' ? 'Verifica' : e.event_type === 'assignment' ? 'Compito' : 'Studio'}: ${e.title} (${e.subject}) - ${e.event_date}`
        ).join("\n")
      : "Nessun evento programmato nel diario.";
    const eventsText = trimTo(eventsTextRaw, MAX_EVENTS_CHARS);

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
    };
    let profileText = "";
    if (userProfile) {
      // deno-lint-ignore no-explicit-any
      const studentName = (userProfile as any).nickname || (userProfile as any).first_name || "";
      if (studentName) {
        profileText += `\nLo studente si chiama "${studentName}". Chiamalo per nome quando interagisci.`;
      }
      profileText += `\nPROFILO STUDENTE:\n- Istituto: ${instituteMap[userProfile.institute_type] || userProfile.institute_type}`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileText += "\n- Livelli per materia: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ");
      }
      profileText += "\n\nAdatta il tuo linguaggio e la difficoltà delle spiegazioni in base al tipo di istituto e ai livelli dello studente.";
    }

    const topicBlock = topicContextId
      ? `\nQUESTA CHAT RIGUARDA UN SOLO DOCUMENTO: "${mergedContexts[0].file_name}". Rispondi basandoti SOLO su quel documento. Se la domanda esce dal documento, dillo e invita a guardare nella chat generale.\n${topicSystemPrompt ? `\nCONTRATTO PERSONALIZZATO DI QUESTA CHAT (scritto apposta per questo documento, seguilo):\n${topicSystemPrompt}\n` : ""}`
      : "";

    // 🎯 PIANO B dell'agente: se la richiesta profuma di "aggiungi al diario",
    // un secondo AI estrae i SOLI dati dell'evento in JSON, in parallelo alla
    // risposta. La carta col bottone "Esegui" arriva PER COSTRUZIONE, anche se
    // il primo AI "bluffa" (beccato due volte dal capocantiere: mai più!).
    const rawLastUser = lastUserTextOf(Array.isArray(messages) ? messages : []);
    const intentDetected = detectActionIntent(rawLastUser);
    const agentNudge = intentDetected
      ? `\n\nNOTA DI SISTEMA (prioritaria): la richiesta riguarda il diario. Il sistema prepara AUTOMATICAMENTE la carta azione con il bottone "Esegui". Nel testo visibile NON dire "ho aggiunto/annotato/registrato": di' che stai preparando la carta da confermare con "Esegui". (Se emetti anche il blocco erga_actions va bene, ma la carta arriverà comunque.)`
      : "";

    const systemPrompt = `${languageDirective(language)}
Sei un tutor di studio personale. Rispondi SEMPRE in ${languageName(language)}. Rispondi SOLO basandoti sui contenuti di studio forniti e sul diario dello studente.
Oggi è il ${todayISO}: usa questa data per capire "domani", "lunedì prossimo", "fra una settimana", ecc.

REGOLE IMPORTANTI (valgono per le domande di studio):
1. Usa ESCLUSIVAMENTE le informazioni dai materiali di studio forniti
2. Se una domanda di studio non può essere risposta con i materiali disponibili, dillo chiaramente e suggerisci di caricare altri contenuti
3. Sii chiaro, conciso e incoraggiante
4. Quando possibile, fai riferimento al diario dello studente per contestualizzare le risposte
5. Usa esempi pratici tratti dai materiali
6. Se l'utente ti invia un'immagine, analizzala attentamente in relazione ai materiali di studio. Descrivi cosa vedi e collega i contenuti ai materiali disponibili.

POTERI DA AGENTE (HANNO LA PRIORITÀ SU TUTTO IL RESTO ⭐):
Non sei "solo testo": hai un canale REALE per compiere azioni nell'app dello studente. Quando l'utente ti chiede di AGGIUNGERE, PROGRAMMARE o RICORDARE qualcosa (evento, verifica, ripasso, obiettivo) oppure di ANDARE a quiz o lezioni, DEVI agire tramite il blocco azioni: è l'UNICO modo in cui l'azione accade davvero.

⛔ VIETATO BLUFFARE: non scrivere MAI "ho aggiunto", "ho registrato", "l'ho segnato", "fatto" se non hai emesso il blocco erga_actions. Senza il blocco non succede NULLA: è la carta azione (con il bottone "Esegui") a inserire davvero l'evento nel diario.

COME SI FA: prima scrivi, nella parte visibile, una frase tipo "Ti preparo la carta azione: premi Esegui per confermare." Poi, come ULTIMISSIMA cosa del messaggio, un blocco ESATTAMENTE in questo formato:
\`\`\`erga_actions
[{"action":"add_event","title":"Titolo","date":"YYYY-MM-DD","event_type":"study|test|assignment","subject":"Materia"}]
\`\`\`
Azioni disponibili:
- add_event ("title", "date", "event_type", "subject"): aggiunge un evento al diario dello studente.
- propose_review ("title", "date", "subject"): propone un ripasso; il titolo DEVE iniziare con "Ripasso:".
- add_goal ("title", "date", "subject"): obiettivo verso una verifica (usa event_type=test).
- goto_quiz (nessun campo): l'utente vuole allenarsi → lo portiamo agli esercizi.
- goto_lesson ("query"): apriamo la lezione sull'argomento indicato.
Regole del blocco: massimo 2 azioni per messaggio; "date" sempre in formato YYYY-MM-DD, calcolata dalla data di oggi; l'app NON gestisce l'orario, quindi ignoralo; l'utente non vede il blocco ma una carta con il bottone; se usi anche il tag [IMG: ...], mettilo PRIMA del blocco.

ESEMPIO COMPLETO — l'utente scrive: "mettimi in diario un ripasso di storia per domani"
La risposta corretta è:
Certo! Ti preparo la carta azione per il ripasso di storia di domani: premi "Esegui" e lo troverai nel diario. 📅
\`\`\`erga_actions
[{"action":"propose_review","title":"Ripasso: storia","date":"${tomorrowISO}","subject":"Storia"}]
\`\`\`

Se l'utente chiede di VEDERE il diario o il calendario, spiega che gli eventi si trovano nella sezione "Piano" dell'app: quelli aggiunti con le carte azione compaiono lì davvero. Se l'utente NON chiede un'azione, NON emettere nessun blocco.

IMMAGINI REALI (tag facoltativo): quando la risposta parla di un'opera d'arte, un personaggio storico, un luogo, un animale, una pianta, uno strumento o un oggetto che un'immagine renderebbe molto più chiara, TERMINA la parte visibile del messaggio con il tag [IMG: <query breve>] (prima di un eventuale blocco azioni). MASSIMO un tag per messaggio, solo se davvero utile. Il tag non sarà visibile: verrà sostituito da un'immagine reale con la sua fonte.
${topicBlock}
${profileText}

MATERIALI DI STUDIO DISPONIBILI:
${studyContent}

DIARIO DELLO STUDENTE:
${eventsText}

RICORDA L'ECCEZIONE AGENTE: per aggiungere o programmare qualcosa usa SEMPRE il blocco erga_actions come ultimissima cosa del messaggio. Mai dire "ho registrato/aggiunto" solo a parole: senza blocco, non è successo niente.${agentNudge}`;

    // Process messages: handle multimodal content (images)
    // deno-lint-ignore no-explicit-any
    const trimmedHistory = (Array.isArray(messages) ? messages : [])
      .slice(-MAX_HISTORY_MESSAGES)
      // deno-lint-ignore no-explicit-any
      .map((m: any) => {
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            // deno-lint-ignore no-explicit-any
            content: m.content.map((part: any) => {
              if (part.type === "text") {
                return { type: "text", text: trimTo(String(part.text ?? ""), MAX_MESSAGE_CHARS) };
              }
              if (part.type === "image_url") {
                return part;
              }
              return part;
            }),
          };
        }
        return {
          role: m.role,
          content: trimTo(String(m.content ?? ""), MAX_MESSAGE_CHARS),
        };
      });

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
    ];

    // Check if any message has image content - use vision model
    // deno-lint-ignore no-explicit-any
    const hasImages = trimmedHistory.some((m: any) =>
      // deno-lint-ignore no-explicit-any
      Array.isArray(m.content) && m.content.some((p: any) => p.type === "image_url")
    );
    console.log(`Calling AI${hasImages ? " (vision mode)" : ""}`);

    // Lanciamo INSIEME il rivo della risposta e (se il fiuto ha abbaiato)
    // l'estrattore JSON: matura mentre il testo scorre, attesa zero in più.
    const extractionPromise = intentDetected
      ? callAIText([
          { role: "system", content: "Sei un estrattore di dati. Rispondi SOLO con un oggetto JSON, senza una parola prima o dopo." },
          {
            role: "user",
            content: `Oggi è il ${todayISO}. Estrai l'azione per il diario da questa richiesta dello studente; se NON chiede di aggiungere o programmare nulla, rispondi {"action":"none"}.

Richiesta: """${rawLastUser.slice(0, 500)}"""

Formato (UN oggetto, non una lista):
{"action":"add_event","title":"...","date":"YYYY-MM-DD","event_type":"study|test|assignment","subject":"..."}

Regole: "date" calcolata da oggi ("domani" = ${tomorrowISO}); titolo breve; se parla di RIPASSO usa {"action":"propose_review",...} (il titolo inizierà con "Ripasso:"); se parla di un OBIETTIVO verso una verifica usa {"action":"add_goal",...}; event_type=test per verifiche/interrogazioni/esami, assignment per compiti, study altrimenti; subject = la materia, oppure "Generale".`,
          },
        ], 0.1, 250)
          .then((raw) => parseForcedAction(raw, todayISO))
          .catch(() => null)
      : null;

    const aiResponse = await callAIStream(apiMessages, 0.7, 1600);

    // Le fonti si calcolano QUI, dalla domanda dell'utente (deterministico:
    // niente dipende da quanto l'AI obbedisce alle istruzioni di citazione).
    const queryWords = queryWordsOf(trimmedHistory);
    const sources = buildSources(mergedContexts, queryWords);

    // Stream response
    const reader = aiResponse.body?.getReader();
    if (!reader) throw new Error("No response body");

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new ReadableStream({
      async start(controller) {
        // 🩹 P7 — il tubo anti-pianto, seconda versione.
        // Il bug trovato dai log del capocantiere (RUNTIME_ERROR riga 0):
        // il fornitore AI manda il biglietto "[DONE]" ma NON chiude la
        // connessione (tiene la linea calda). Noi stavamo lì ad aspettare
        // la riattaccata → risposta arrivata ma flusso mai chiuso → la
        // sentinella del client segnalava "errore" e il magazziniere
        // trovava il tubo ancora attaccato. Ora: arrivato "[DONE]",
        // salutiamo e molliamo la spina SUBITO.
        const pumpLine = (line: string): boolean => {
          // true = il fornitore ha detto "ho finito"
          if (!line.startsWith("data: ")) return false;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) return false;
          if (jsonStr === "[DONE]") return true;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            }
          } catch { /* frammento illeggibile: saltato */ }
          return false;
        };

        // 🔌 Molla la spina col fornitore: niente tubi appesi nel magazzino.
        const releaseUpstream = async () => {
          try { await reader.cancel(); } catch { /* già staccata: amen */ }
        };

        try {
          let buffer = "";
          let upstreamEnded = false;
          while (!upstreamEnded) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (pumpLine(line)) { upstreamEnded = true; break; }
            }
          }
          // Alcuni fornitori chiudono e basta, senza biglietto: se è rimasta
          // una riga nella strozzatura finale, la processiamo prima di salutare.
          if (!upstreamEnded && buffer.trim()) {
            buffer += decoder.decode(); // svuota eventuali residui multibyte
            for (const line of buffer.split("\n")) pumpLine(line);
          }
          // 🎯 PIANO B: la carta azione costruita dalla MACCHINA (non dalle
          // buone intenzioni dell'AI): viaggia come evento speciale, come le fonti.
          if (extractionPromise) {
            const forced = await extractionPromise;
            if (forced) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ forced_actions: [forced] })}\n\n`));
            }
          }
          // Coda ricca: prima le FONTI (evento JSON senza choices), poi la fine.
          if (sources.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          await releaseUpstream();
        } catch (streamError) {
          console.error("Chat stream interrupted mid-response:", streamError);
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ warning: "interrupted" })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch { /* anche la chiusura è impossibile: amen, il client ha la sentinella */ }
          await releaseUpstream();
        }
      },
    });

    return new Response(transformStream, {
      headers: { "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nel servizio chat. Riprova.");
  }
}));
