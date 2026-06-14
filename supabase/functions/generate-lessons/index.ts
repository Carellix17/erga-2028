import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

const MAX_CONTEXT_CHARS = 80000;
const FREE_GENERATION_LIMIT = 5;
const LIMIT_REACHED_MESSAGE =
  "Hai raggiunto il limite di 5 lezioni gratuite per la beta. Per continuare a usare Erga senza limiti contattaci!";

function extractJson(raw: string): unknown {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* continue */ }
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* continue */ } }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* continue */ } }

  // Recover truncated array: find array start, walk through complete top-level objects, close array
  const arrStart = cleaned.indexOf("[");
  if (arrStart !== -1) {
    const items: string[] = [];
    let i = arrStart + 1;
    while (i < cleaned.length) {
      while (i < cleaned.length && /[\s,]/.test(cleaned[i])) i++;
      if (i >= cleaned.length || cleaned[i] === "]") break;
      if (cleaned[i] !== "{") { i++; continue; }
      const objStart = i;
      let depth = 0, inStr = false, esc = false;
      for (; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (esc) { esc = false; continue; }
        if (ch === "\\") { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { i++; break; } }
      }
      if (depth === 0) {
        items.push(cleaned.slice(objStart, i));
      } else {
        // truncated mid-object → discard
        break;
      }
    }
    if (items.length > 0) {
      try { return JSON.parse("[" + items.join(",") + "]"); } catch { /* continue */ }
    }
  }

  // Last resort: bracket balancing
  const candidate = (objMatch?.[0] || arrMatch?.[0] || cleaned)
    .replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
  let braces = 0, brackets = 0;
  let repaired = candidate;
  for (const ch of repaired) { if (ch === "{") braces++; if (ch === "}") braces--; if (ch === "[") brackets++; if (ch === "]") brackets--; }
  while (brackets > 0) { repaired += "]"; brackets--; }
  while (braces > 0) { repaired += "}"; braces--; }
  try { return JSON.parse(repaired); } catch { /* continue */ }
  console.error("extractJson failed. Raw (first 500):", raw.substring(0, 500));
  console.error("Raw (last 500):", raw.substring(Math.max(0, raw.length - 500)));
  throw new Error("Impossibile estrarre JSON dalla risposta AI. Riprova.");
}

import { callAIText } from "../_shared/ai.ts";

async function callAI(messages: { role: string; content: string }[], temperature = 0.1, maxTokens = 4000): Promise<string> {
  return callAIText(messages, temperature, maxTokens);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, lessonIndex, contextId } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase, userEmail: authEmail } = auth;

    // Account demo/admin: nessun limite, e i contesti che crea sono marcati come demo
    // così tutti gli altri utenti possono visualizzarli senza che contino nel limite.
    const isDemoAdmin = (authEmail || "").toLowerCase() === "alecare2025@gmail.com";

    // Fetch user profile for personalization
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("institute_type, subject_levels")
      .eq("user_id", userId)
      .maybeSingle();

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
    };
    let profileContext = "";
    if (userProfile) {
      profileContext = `\nLo studente frequenta un ${instituteMap[userProfile.institute_type] || userProfile.institute_type}.`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileContext += " Livelli: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ") + ".";
      }
      profileContext += "\nAdatta la difficoltà e gli esempi al livello dello studente.";
    }

    const { userEmail } = auth;
    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;

    console.log(`Generate lessons for user: ${userId} (legacy: ${legacyUserId}) (authenticated: ${auth.isAuthenticated})`);

    // ── GENERATE A SINGLE LESSON ──
    if (action === "generateLesson" && lessonIndex !== undefined) {
      let lessonsQuery = supabase.from("mini_lessons").select("*").eq("user_id", userId).eq("lesson_order", lessonIndex);
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      let { data: lessons } = await lessonsQuery.maybeSingle();

      // Fallback: try legacy user_id (email)
      if (!lessons && legacyUserId) {
        let legacyQuery = supabase.from("mini_lessons").select("*").eq("user_id", legacyUserId).eq("lesson_order", lessonIndex);
        if (contextId) legacyQuery = legacyQuery.eq("context_id", contextId);
        const { data: legacyLesson } = await legacyQuery.maybeSingle();
        lessons = legacyLesson;
      }

      if (!lessons) throw new Error("Lezione non trovata");

      // ── RATE LIMIT (BETA) ──
      // Verifica se la lezione appartiene a un contesto demo: in tal caso la
      // generazione è gratuita e NON conta nel limite (le demo sono di sola lettura
      // e già preparate dall'account admin).
      let lessonIsDemo = false;
      if (lessons.context_id) {
        const { data: ctxFlag } = await supabase
          .from("study_contexts")
          .select("is_demo")
          .eq("id", lessons.context_id)
          .maybeSingle();
        lessonIsDemo = !!ctxFlag?.is_demo;
      }

      // Se NON è demo e NON è l'admin → applica il limite gratuito
      if (!lessonIsDemo && !isDemoAdmin) {
        const { data: profileForLimit } = await supabase
          .from("user_profiles")
          .select("generation_count")
          .eq("user_id", userId)
          .maybeSingle();
        const currentCount = profileForLimit?.generation_count ?? 0;
        if (currentCount >= FREE_GENERATION_LIMIT) {
          return errorResponse(LIMIT_REACHED_MESSAGE, 403);
        }
      }
      
      // Extract page range from lesson record
      const pageStart = (lessons as Record<string, unknown>).page_start as number | null;
      const pageEnd = (lessons as Record<string, unknown>).page_end as number | null;
      const pageRangeInfo = pageStart != null && pageEnd != null 
        ? `\nQuesta lezione copre le pagine ${pageStart}-${pageEnd} del PDF originale. Concentrati SOLO sul contenuto di queste pagine.`
        : "";
      
      const existingExplanation = typeof lessons.explanation === "string" ? lessons.explanation : "";
      const existingHasImageUrl = existingExplanation.includes('"image_url"');

      let studyContent = "";
      if (lessons.context_id) {
        // Try with UUID first, then legacy email
        let { data: context } = await supabase.from("study_contexts").select("content, file_name, processing_status, error_message").eq("id", lessons.context_id).eq("user_id", userId).single();
        if (!context && legacyUserId) {
          const { data: legacyCtx } = await supabase.from("study_contexts").select("content, file_name, processing_status, error_message").eq("id", lessons.context_id).eq("user_id", legacyUserId).single();
          context = legacyCtx;
        }
        if (context?.processing_status === "failed") {
          const contextError = (context as Record<string, unknown>).error_message;
          throw new Error(typeof contextError === "string" && contextError.trim()
            ? contextError
            : "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.");
        }
        if (context?.processing_status !== "completed") throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
        if (context?.content) studyContent = `FILE: ${context.file_name}\n${context.content}`.substring(0, MAX_CONTEXT_CHARS);
      } else {
        const { data: contexts } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        const { data: legacyCtxs } = legacyUserId ? await supabase.from("study_contexts").select("content, file_name").eq("user_id", legacyUserId) : { data: null };
        const allCtxs = [...(contexts || []), ...(legacyCtxs || [])];
        if (allCtxs.length) studyContent = allCtxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }
      if (!studyContent) throw new Error("Contenuto vuoto. Caricamento fallito?");

      // ── NEW: figures are extracted on-demand by extract-lesson-figures, not embedded here ──
      // The lesson is generated with [FIG:n] tokens that the client replaces with <PdfCrop /> after
      // calling extract-lesson-figures(lessonId).
      const pagesCovered = pageStart != null && pageEnd != null ? (pageEnd - pageStart + 1) : 0;
      const expectedFigures = Math.min(3, Math.max(0, pagesCovered));

      const figureInstructions = expectedFigures > 0
        ? `\n\nFIGURE DAL PDF (token speciali):
Il sistema estrarrà automaticamente fino a ${expectedFigures} figure reali (foto, diagrammi, tabelle, schemi, formule, riquadri grafici) dalle pagine ${pageStart}-${pageEnd} del PDF.

REGOLE OBBLIGATORIE PER LE FIGURE:
1. UNICITÀ ASSOLUTA: ogni token [FIG:N] deve apparire UNA SOLA VOLTA in tutta la lezione. MAI ripetere lo stesso indice in più parti.
2. DISTRIBUZIONE: se inserisci più figure, mettile in "explanation_parts" DIVERSE, distanziate fra loro (es. una alla parte 2 e una alla parte 4). MAI tutte nella stessa parte, MAI tutte all'inizio o tutte in fondo.
3. PERTINENZA RIGOROSA: inserisci [FIG:N] SOLO se la frase immediatamente precedente parla davvero di ciò che la figura raffigura. Se non c'è un nesso logico chiaro col paragrafo, OMETTI il token — meglio nessuna figura che una figura fuori contesto.
4. Indici da usare: solo da [FIG:0] a [FIG:${expectedFigures - 1}], in ordine crescente, senza saltare numeri intermedi.
5. Posizionamento: token su una RIGA A SÉ dentro il "content", subito DOPO la frase pertinente.
   Esempio: "content": "Il bosco benedettino è strutturato a filari ordinati.\\n\\n[FIG:0]\\n\\nQuesta organizzazione…"
6. NON descrivere mai a parole il contenuto dell'immagine ("L'immagine mostra…", "Come si vede in figura…").
7. NON usare il campo "image_url".
8. Se nessuna figura è davvero pertinente al testo della lezione, ometti TUTTI i token. Le figure resteranno comunque accessibili altrove.`
        : "";

      const prompt = `Sei un TUTOR DIDATTICO esperto. Il tuo compito NON è riassumere o riproporre frasi del materiale: devi RIELABORARE e RISTRUTTURARE i concetti da zero, con parole tue, in una lezione didatticamente ottimale.
${profileContext}${pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON. SOLO JSON puro.

TITOLO LEZIONE: "${lessons.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo. Spiega in profondità un unico nucleo tematico.

════════════════════════════════════════
1) FILTRO DI RIELABORAZIONE (NO COPY-PASTE)
════════════════════════════════════════
- È TASSATIVAMENTE VIETATO copiare frasi o paragrafi letterali dal materiale fornito. Nessuna sequenza di 8+ parole consecutive può coincidere col testo originale.
- Procedura obbligatoria: (a) leggi, (b) isola i concetti chiave, (c) stabilisci l'ordine logico ottimale di apprendimento (dal semplice al complesso, dal generale allo specifico), (d) RISCRIVI tutto da zero con prosa tua, chiara, incisiva, priva di gergo inutile.
- Vietate: ridondanze, retorica vuota, frasi-riempitivo, "come abbiamo detto", "in questo paragrafo vedremo".
- Mantieni terminologia tecnica corretta, ma definiscila al primo uso.

════════════════════════════════════════
2) ARCHITETTURA DIDATTICA DELLA LEZIONE
════════════════════════════════════════
La lezione deve articolarsi in MACRO-AREE logiche, in quest'ordine:
  A. INTRODUZIONE — contesto, problema, perché questo argomento esiste / a cosa serve.
  B. PILASTRI CONCETTUALI — i 2-4 concetti fondamentali, uno per parte, definiti e spiegati a fondo.
  C. NESSI E RELAZIONI — esplicita causa-effetto, dipendenze, correlazioni. Se il concetto B presuppone A, dichiaralo PRIMA di introdurre B ("Per capire B serve aver chiaro che A …").
  D. APPLICAZIONE / ESEMPIO PRATICO — almeno una parte con esempio concreto (titolo che inizia con "📌 Esempio:" o "🔍 In pratica:").
  E. SINTESI SCHEMATICA FINALE — una parte conclusiva ("🧭 In sintesi" o "🗺️ Mappa") che ricostruisce il quadro con un elenco strutturato, una tabella o una timeline.

════════════════════════════════════════
3) STRUTTURA DEI BLOCCHI "explanation_parts"
════════════════════════════════════════
- 5-8 parti totali, ciascuna con "part_title" e "content".
- NESSUN limite rigido di righe: una parte concept può essere un paragrafo corposo (fino a ~120 parole) PURCHÉ resti su UN SINGOLO nucleo tematico e usi prosa fluida, senza ripetizioni.
- Una parte = un'idea. Mai mescolare più concetti distinti nello stesso blocco.
- Usa **grassetto** per i termini-chiave la prima volta che li introduci. Usa *corsivo* con parsimonia.

════════════════════════════════════════
4) INTEGRAZIONE NATIVA DI SCHEMI / TABELLE / TIMELINE
════════════════════════════════════════
Sei OBBLIGATO a individuare nel materiale i punti che si prestano a visualizzazione strutturata e a renderli con Markdown all'interno di "content", interrompendo la narrazione nel punto strategico per fissare la memoria visiva.

Quando convertire OBBLIGATORIAMENTE in struttura visiva:
  • Confronto fra due o più entità (teorie, autori, modelli, eventi, periodi) → **tabella Markdown GFM**.
  • Dati quantitativi, parametri, classificazioni → **tabella**.
  • Sequenze temporali (eventi storici, fasi di un processo) → **timeline** come elenco numerato con anno/fase in grassetto.
  • Procedure / algoritmi a passi → **elenco numerato a step** con verbo d'azione iniziale.
  • Tassonomie / gerarchie → **elenco puntato annidato**.

Sintassi tabella Markdown GFM (obbligatoria, mantieni le pipe):
\`\`\`
| Aspetto | Teoria A | Teoria B |
|---|---|---|
| Origine | … | … |
| Tesi    | … | … |
\`\`\`

Sintassi timeline (elenco numerato):
\`\`\`
1. **1789** — Scoppio della Rivoluzione …
2. **1799** — Colpo di stato di Brumaio …
\`\`\`

Regole: almeno UNA struttura visiva (tabella o timeline o elenco a step) deve comparire nella lezione se il materiale lo permette anche solo lontanamente. La sintesi finale è il punto naturale per uno schema riepilogativo.

════════════════════════════════════════
5) FIGURE DAL PDF
════════════════════════════════════════
- DIVIETO ASSOLUTO di descrivere immagini a parole ("L'immagine mostra…", "Come si vede in figura…", "La tabella illustra…").
- Per riferirti a un elemento visivo del PDF usa SOLO il token [FIG:n].
- NON usare mai il campo "image_url".
${figureInstructions}

════════════════════════════════════════
6) ALTRI CAMPI
════════════════════════════════════════
- "concept": 1-2 frasi che catturano l'essenza del titolo (riformulata, non copiata).
- "example": un caso concreto finale (3-5 frasi), nuovo, non ripreso letteralmente dal testo.
- "exercises": 3-4 esercizi ALTERNANDO "multiple_choice" e "true_false". Le domande devono testare la COMPRENSIONE dei nessi, non il riconoscimento di una frase del testo.

JSON richiesto (rispetta esattamente questa forma):
{
  "concept": "...",
  "explanation_parts": [
    { "part_title": "Il contesto: perché parlarne", "content": "Introduzione riscritta…" },
    { "part_title": "Il primo pilastro: …", "content": "Definizione e spiegazione…" },
    { "part_title": "Il secondo pilastro: …", "content": "Spiegazione. Nesso col primo pilastro esplicitato." },
    { "part_title": "Confronto", "content": "Testo introduttivo.\\n\\n| Aspetto | A | B |\\n|---|---|---|\\n| … | … | … |" },
    { "part_title": "📌 Esempio: …", "content": "Caso concreto rielaborato.\\n[FIG:0]" },
    { "part_title": "🧭 In sintesi", "content": "1. **Punto 1** — …\\n2. **Punto 2** — …\\n3. **Punto 3** — …" }
  ],
  "example": "...",
  "exercises": [
     { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
     { "type": "true_false", "statement": "...", "correct": true },
     { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 2 }
  ]
}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare):
${studyContent}`;

      const content = await callAI([
        { role: "system", content: "Sei un tutor didattico che RIELABORA i contenuti, non li copia. Rispondi ESCLUSIVAMENTE con JSON valido. Vietato copiare frasi letterali dal materiale (max 7 parole consecutive identiche). Obbligatorio includere almeno una struttura visiva (tabella Markdown GFM, timeline numerata o elenco strutturato) quando il contenuto lo consente. Per le figure del PDF usa SOLO i token [FIG:n]; mai descrizioni testuali di immagini; mai il campo image_url." },
        { role: "user", content: prompt }
      ], 0.35, 7000);

      console.log("AI lesson response (first 300 chars):", content.substring(0, 300));
      const lessonData = extractJson(content) as Record<string, unknown>;

      let explanation = lessonData.explanation || "";
      let explanationParts = Array.isArray(lessonData.explanation_parts)
        ? lessonData.explanation_parts.map((part) => ({ ...(part as Record<string, unknown>) }))
        : [];

      const imageDescriptionPatterns = [
        /L['']immagine mostra[^.]*\./gi,
        /Qui c['']è (un'?|l['']?)immagine di[^.]*\./gi,
        /Come si vede (nella|dalla) figura[^.]*\./gi,
        /La (tabella|figura|immagine|schema) (illustra|mostra|rappresenta|seguente)[^.]*\./gi,
        /Nell['']immagine[^.]*\./gi,
        /La figura seguente[^.]*\./gi,
      ];
      const sanitizeContent = (text: string): string => {
        let cleaned = text;
        for (const pattern of imageDescriptionPatterns) cleaned = cleaned.replace(pattern, "").trim();
        return cleaned;
      };

      explanationParts = explanationParts.map((part) => {
        if (typeof part.content === "string") part.content = sanitizeContent(part.content);
        const { image_url: _u, image_description: _d, ...rest } = part as Record<string, unknown>;
        return rest;
      });

      // Enforce uniqueness of [FIG:N] markers across the lesson:
      // keep only the FIRST occurrence of each index, strip the rest.
      const seenFigs = new Set<number>();
      explanationParts = explanationParts.map((part) => {
        if (typeof part.content !== "string") return part;
        let content = part.content as string;
        content = content.replace(/\[FIG:(\d+)\]/g, (full, n) => {
          const idx = parseInt(n, 10);
          if (seenFigs.has(idx)) return ""; // duplicate → drop
          seenFigs.add(idx);
          return full;
        });
        // Tidy leftover blank lines from removed markers
        content = content.replace(/\n{3,}/g, "\n\n").trim();
        return { ...part, content };
      });

      if (explanationParts.length > 0) {
        explanation = JSON.stringify(explanationParts);
      }

      await supabase.from("mini_lessons").update({
        concept: lessonData.concept || "",
        explanation,
        example: lessonData.example || "",
        exercises: lessonData.exercises || [],
        is_generated: true,
      }).eq("id", lessons.id);

      // ── INCREMENTA il contatore (solo per lezioni "vere", non demo, non admin) ──
      if (!lessonIsDemo && !isDemoAdmin) {
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id, generation_count")
          .eq("user_id", userId)
          .maybeSingle();
        if (existingProfile) {
          await supabase
            .from("user_profiles")
            .update({ generation_count: (existingProfile.generation_count ?? 0) + 1 })
            .eq("id", existingProfile.id);
        } else {
          await supabase
            .from("user_profiles")
            .insert({ user_id: userId, generation_count: 1 });
        }
      }

      const { data: updated } = await supabase.from("mini_lessons").select("*").eq("id", lessons.id).single();
      return successResponse({ success: true, lesson: updated });
    }

    // ── GENERATE FINAL TEST ──
    if (action === "generateFinalTest") {
      let lessonsQuery = supabase.from("mini_lessons").select("title, concept").eq("user_id", userId).eq("is_generated", true).order("lesson_order");
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      const { data: allLessons } = await lessonsQuery;
      if (!allLessons || allLessons.length === 0) throw new Error("Nessuna lezione completata per generare il test finale.");

      const topicsSummary = allLessons.map((l: { title: string; concept: string }, i: number) => `${i + 1}. ${l.title}: ${l.concept}`).join("\n");

      let studyContent = "";
      if (contextId) {
        const { data: ctx } = await supabase.from("study_contexts").select("content, file_name").eq("id", contextId).eq("user_id", userId).single();
        if (ctx?.content) studyContent = `FILE: ${ctx.file_name}\n${ctx.content}`.substring(0, MAX_CONTEXT_CHARS);
      } else {
        const { data: ctxs } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        if (ctxs) studyContent = ctxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }

      const finalTestPrompt = `Sei un tutor universitario esperto. Crea un TEST FINALE che valuti la comprensione di TUTTI gli argomenti.
${profileContext}

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.

ARGOMENTI:
${topicsSummary}

REGOLE:
1. Esattamente ${Math.min(allLessons.length * 2, 10)} domande.
2. Copri TUTTI gli argomenti.
3. Domande DIVERSE da quelle delle lezioni.
4. Usa SOLO "multiple_choice" e "true_false" (NO short_answer, NO fill_blank). Alterna i due tipi.

JSON richiesto:
[
  { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
  { "type": "true_false", "statement": "...", "correct": true }
]

MATERIALE:
${studyContent}`;

      const raw = await callAI([
        { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Solo l'array JSON richiesto." },
        { role: "user", content: finalTestPrompt }
      ], 0.2);

      console.log("AI final test response (first 300 chars):", raw.substring(0, 300));
      const exercises = extractJson(raw);
      if (!Array.isArray(exercises)) throw new Error("Formato test finale non valido");
      return successResponse({ success: true, exercises });
    }

    // ── GENERATE LESSON TITLES (STUDY PLAN) — ASYNC/BACKGROUND ──
    // Per non perdere il progresso se l'utente chiude l'app, il lavoro AI gira
    // in background con EdgeRuntime.waitUntil. Lo stato è persistito su
    // study_contexts.generation_status (idle | generating | completed | failed).
    if (!contextId) {
      return errorResponse("contextId richiesto per la generazione del percorso", 400);
    }

    const { data: ctxPre } = await supabase
      .from("study_contexts")
      .select("content, file_name, processing_status, error_message, generation_status")
      .eq("id", contextId)
      .eq("user_id", userId)
      .single();
    if (!ctxPre) throw new Error("Contesto non trovato");
    if (ctxPre.processing_status === "failed") {
      throw new Error(ctxPre.error_message || "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.");
    }
    if (ctxPre.processing_status !== "completed") {
      throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
    }
    if (!ctxPre.content) throw new Error("Nessun contenuto disponibile per questo PDF.");

    // Idempotenza: se già in generazione, non avviare un nuovo job
    if (ctxPre.generation_status === "generating") {
      return new Response(
        JSON.stringify({ success: true, status: "generating", contextId, alreadyRunning: true }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Segna subito lo stato come "generating" prima di rispondere
    await supabase.from("study_contexts").update({
      generation_status: "generating",
      generation_started_at: new Date().toISOString(),
      generation_progress: { step: "creating-index", generatedCount: 0, totalLessons: 0 },
      generation_error: null,
    }).eq("id", contextId);

    const combinedContent = `FILE: ${ctxPre.file_name}\n${ctxPre.content}`.substring(0, MAX_CONTEXT_CHARS);

    const backgroundTitles = async () => {
      try {
        const titlesPrompt = `Analizza il testo fornito e crea un piano di studi strutturato.

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.

REGOLE:
1. Ogni lezione deve coprire UN SOLO concetto o argomento specifico. NON raggruppare più concetti diversi in una lezione.
2. Preferisci MOLTE lezioni brevi e focalizzate piuttosto che poche lezioni dense.
3. Se un argomento ha sotto-argomenti importanti, crea una lezione separata per ciascuno.
4. Segui l'ordine logico del documento.
5. Ignora indici, bibliografie o note a piè di pagina.
6. Ogni titolo deve essere specifico e descrivere chiaramente il singolo concetto trattato.
7. MAPPING PAGINE (OBBLIGATORIO E CRITICO):
   - Il testo è suddiviso in blocchi delimitati da marker "=== PAGINA N ===" che indicano l'inizio della pagina N del PDF originale.
   - Per OGNI lezione devi indicare "page_start" e "page_end" usando ESATTAMENTE i numeri N che appaiono in questi marker.
   - "page_start" = numero della prima pagina che contiene contenuto della lezione.
   - "page_end" = numero dell'ultima pagina che contiene contenuto della lezione (può essere uguale a page_start se sta tutto su una pagina; può estendersi su 2-4 pagine).
   - DIVIETO ASSOLUTO: NON impostare page_start=1 e page_end=1 per tutte le lezioni. Se lo fai, la richiesta verrà rigettata.
   - Le pagine devono essere DIVERSE e progressive tra lezioni successive (lezione 2 inizia dove finisce la lezione 1, o poco dopo).
   - Se davvero non riesci a stimarle, distribuisci le lezioni in modo proporzionale tra pagina 1 e l'ultimo marker presente.

ESEMPIO: Se il materiale parla di "La cellula", NON creare una lezione "La cellula e le sue parti". Crea invece: "La membrana cellulare", "Il nucleo", "I mitocondri", "Il reticolo endoplasmatico", etc.

Output richiesto:
[{"title": "La membrana cellulare", "page_start": 1, "page_end": 3}, {"title": "Il nucleo e il DNA", "page_start": 4, "page_end": 6}]

TESTO DA ANALIZZARE:
${combinedContent}`;

        const content = await callAI([
          { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Solo l'array JSON richiesto." },
          { role: "user", content: titlesPrompt }
        ], 0.1, 16000);

        console.log("AI titles response (first 300 chars):", content.substring(0, 300));
        const parsedTitles = extractJson(content);
        if (!Array.isArray(parsedTitles)) throw new Error("Formato titoli non valido");

        const titles = parsedTitles
          .map((t) => {
            if (typeof t === "string") return { title: t, page_start: null, page_end: null };
            if (t && typeof t === "object" && "title" in t && typeof (t as { title?: unknown }).title === "string") {
              const obj = t as { title: string; page_start?: number; page_end?: number };
              return { title: obj.title, page_start: typeof obj.page_start === "number" ? obj.page_start : null, page_end: typeof obj.page_end === "number" ? obj.page_end : null };
            }
            return null;
          })
          .filter((t): t is { title: string; page_start: number | null; page_end: number | null } => !!t && !!t.title);

        if (titles.length === 0) throw new Error("Non sono riuscito a creare un indice valido. Riprova.");

        const pageMarkers = Array.from(combinedContent.matchAll(/=== PAGINA (\d+) ===/g))
          .map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n));
        const maxPdfPage = pageMarkers.length > 0 ? Math.max(...pageMarkers) : 0;
        const uniqueRanges = new Set(titles.map((t) => `${t.page_start ?? "x"}-${t.page_end ?? "x"}`));
        const allMissing = titles.every((t) => t.page_start == null || t.page_end == null);
        const allCollapsed = titles.length > 1 && uniqueRanges.size === 1 && titles[0].page_start != null;
        if ((allMissing || allCollapsed) && maxPdfPage > 1 && titles.length > 0) {
          const span = Math.max(1, Math.floor(maxPdfPage / titles.length));
          titles.forEach((t, i) => {
            const start = Math.min(maxPdfPage, i * span + 1);
            const end = Math.min(maxPdfPage, i === titles.length - 1 ? maxPdfPage : (i + 1) * span);
            t.page_start = start;
            t.page_end = Math.max(start, end);
          });
        }

        const { error: deleteError } = await supabase
          .from("mini_lessons").delete()
          .eq("user_id", userId).eq("context_id", contextId);
        if (deleteError) throw new Error("Errore durante la pulizia delle vecchie lezioni");

        const lessonsToInsert = titles.map((t, i: number) => ({
          user_id: userId, context_id: contextId, title: t.title,
          lesson_order: i, is_generated: false, concept: "", explanation: "",
          page_start: t.page_start, page_end: t.page_end,
        }));
        const { error: insertError } = await supabase.from("mini_lessons").insert(lessonsToInsert);
        if (insertError) throw new Error("Errore durante il salvataggio delle lezioni");

        if (isDemoAdmin) {
          await supabase.from("study_contexts").update({ is_demo: true }).eq("id", contextId);
        }

        await supabase.from("study_contexts").update({
          generation_status: "completed",
          generation_progress: { step: "complete", generatedCount: titles.length, totalLessons: titles.length },
          generation_error: null,
        }).eq("id", contextId);

        console.log(`✅ Background generation complete for context ${contextId}: ${titles.length} lessons`);
        try {
          const { sendPushToUser } = await import("../_shared/push.ts");
          await sendPushToUser(supabase, userId, {
            title: "Lezione pronta 🚀",
            body: `La tua lezione su ${ctxPre?.file_name || "il tuo materiale"} è pronta!`,
            url: "/?tab=studio",
            tag: `lessons-${contextId}`,
          });
        } catch (e) { console.error("[push] notify lessons failed:", e); }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Errore nella generazione delle lezioni";
        console.error(`❌ Background generation failed for context ${contextId}:`, msg);
        await supabase.from("study_contexts").update({
          generation_status: "failed",
          generation_error: msg,
        }).eq("id", contextId);
      }
    };

    // @ts-ignore — EdgeRuntime è iniettato da Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTitles());
    } else {
      // Fallback (test locali): non attendere
      backgroundTitles();
    }

    return new Response(
      JSON.stringify({ success: true, status: "generating", contextId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const safeMessages = [
      "Lezione non trovata",
      LIMIT_REACHED_MESSAGE,
      "Il PDF è ancora in elaborazione. Riprova tra qualche secondo.",
      "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.",
      "Impossibile estrarre testo sufficiente dal PDF. Il file potrebbe essere un'immagine o protetto.",
      "Contenuto vuoto. Caricamento fallito?",
      "Contesto non trovato",
      "Nessun contenuto disponibile per questo PDF.",
      "Nessuna lezione completata per generare il test finale.",
      "Formato titoli non valido",
      "Formato test finale non valido",
      "Non sono riuscito a creare un indice valido. Riprova.",
      "Impossibile estrarre JSON dalla risposta AI. Riprova.",
      "Errore durante la pulizia delle vecchie lezioni",
      "Errore durante il salvataggio delle lezioni",
    ];
    const msg = error instanceof Error && safeMessages.includes(error.message)
      ? error.message
      : "Errore nella generazione delle lezioni. Riprova.";
    return errorResponse(msg);
  }
});
