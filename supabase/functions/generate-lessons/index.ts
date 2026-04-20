import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

const MAX_CONTEXT_CHARS = 80000;

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
    const { userId, supabase } = auth;

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
        let { data: context } = await supabase.from("study_contexts").select("content, file_name, processing_status").eq("id", lessons.context_id).eq("user_id", userId).single();
        if (!context && legacyUserId) {
          const { data: legacyCtx } = await supabase.from("study_contexts").select("content, file_name, processing_status").eq("id", lessons.context_id).eq("user_id", legacyUserId).single();
          context = legacyCtx;
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
Il sistema estrarrà automaticamente le figure reali dalle pagine ${pageStart}-${pageEnd} del PDF.
Quando vuoi riferirti a una figura, inserisci ESATTAMENTE il token [FIG:0], [FIG:1], ecc. nel campo "content" di una explanation_part — NON descrivere mai a parole l'immagine.

REGOLE OBBLIGATORIE:
- Puoi inserire da 0 a ${expectedFigures} token [FIG:n] in totale, distribuiti nelle parti pertinenti.
- I token vengono numerati a partire da 0 nell'ordine in cui appaiono nel testo.
- NON usare mai "image_url" o descrizioni testuali tipo "L'immagine mostra…".
- Se non sei sicuro che ci siano figure visive nelle pagine, NON inserire nessun [FIG:n].
- Inserisci il token su una riga a sé, non in mezzo a una frase.`
        : "";

      const prompt = `Sei un tutor universitario esperto e coinvolgente. Crea una lezione basata ESCLUSIVAMENTE sul materiale fornito.
${profileContext}${pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON. SOLO JSON puro.

OBIETTIVO: Creare una mini-lezione modulare stile Duolingo su UN SOLO CONCETTO SPECIFICO. Ogni parte sarà mostrata come uno step separato a schermo intero.

TITOLO LEZIONE: "${lessons.title}"

REGOLA CRITICA: Questa lezione deve trattare SOLO l'argomento indicato nel titolo. Spiega BENE e in PROFONDITÀ questo unico concetto.

DIVIETO ASSOLUTO SULLE IMMAGINI:
- NON scrivere MAI frasi come "L'immagine mostra...", "Come si vede nella figura...", "La tabella illustra...".
- Per riferirti a un elemento visivo del PDF, usa SOLO il token [FIG:n] come specificato sotto.
- NON inventare descrizioni di figure inesistenti.

ISTRUZIONI:
1. Concept: 1-2 frasi accattivanti.
2. Explanation_parts: 5-8 parti BREVI con titolo chiaro e 2-3 frasi MASSIMO ciascuna. Almeno 2 parti devono essere ESEMPI PRATICI (part_title che inizia con "📌 Esempio:" o "🔍 In pratica:"). Procedi dal semplice al complesso.
3. Example: 1 esempio finale concreto (2-3 frasi).
4. Exercises: 3-4 esercizi SOLO "multiple_choice" e "true_false". Alterna i due tipi.
${figureInstructions}

JSON richiesto:
{
  "concept": "...",
  "explanation_parts": [
    { "part_title": "Cos'è...", "content": "Spiegazione breve e chiara..." },
    { "part_title": "📌 Esempio: ...", "content": "Esempio pratico concreto.\\n[FIG:0]" },
    { "part_title": "Come funziona...", "content": "Spiegazione del meccanismo..." },
    { "part_title": "🔍 In pratica: ...", "content": "Applicazione reale..." },
    { "part_title": "Ricapitolando", "content": "Sintesi dei punti chiave..." }
  ],
  "example": "...",
  "exercises": [
     { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
     { "type": "true_false", "statement": "...", "correct": true },
     { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 2 }
  ]
}

MATERIALE DI STUDIO:
${studyContent}`;

      const content = await callAI([
        { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Per riferirti a figure visive del PDF usa SOLO i token [FIG:n]. DIVIETO ASSOLUTO: NON scrivere mai descrizioni testuali di immagini/figure/tabelle. NON usare mai il campo image_url." },
        { role: "user", content: prompt }
      ], 0.15, 6000);

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

    // ── GENERATE LESSON TITLES (STUDY PLAN) ──
    let combinedContent = "";
    if (contextId) {
      const { data: ctx } = await supabase.from("study_contexts").select("content, file_name, processing_status").eq("id", contextId).eq("user_id", userId).single();
      if (!ctx) throw new Error("Contesto non trovato");
      if (ctx.processing_status !== "completed") throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
      if (!ctx.content) throw new Error("Nessun contenuto disponibile per questo PDF.");
      combinedContent = `FILE: ${ctx.file_name}\n${ctx.content}`;
    } else {
      const { data: ctxs } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
      if (ctxs) combinedContent = ctxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n");
    }
    combinedContent = combinedContent.substring(0, MAX_CONTEXT_CHARS);

    const titlesPrompt = `Analizza il testo fornito e crea un piano di studi strutturato.

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.

REGOLE:
1. Ogni lezione deve coprire UN SOLO concetto o argomento specifico. NON raggruppare più concetti diversi in una lezione.
2. Preferisci MOLTE lezioni brevi e focalizzate piuttosto che poche lezioni dense.
3. Se un argomento ha sotto-argomenti importanti, crea una lezione separata per ciascuno.
4. Segui l'ordine logico del documento.
5. Ignora indici, bibliografie o note a piè di pagina.
6. Ogni titolo deve essere specifico e descrivere chiaramente il singolo concetto trattato.
7. Per ogni lezione indica anche il numero di pagina iniziale e finale del PDF da cui proviene il contenuto. Usa i numeri di pagina presenti nel testo (es. "Pagina 3", "pag. 5", headers/footers con numeri). Se non riesci a identificare le pagine esatte, stima in base alla posizione nel documento.

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

    // Delete old lessons for same context
    let deleteQuery = supabase.from("mini_lessons").delete().eq("user_id", userId);
    if (contextId) { deleteQuery = deleteQuery.eq("context_id", contextId); } else { deleteQuery = deleteQuery.is("context_id", null); }
    const { error: deleteError } = await deleteQuery;
    if (deleteError) throw new Error("Errore durante la pulizia delle vecchie lezioni");

    const lessonsToInsert = titles.map((t, i: number) => ({
      user_id: userId, context_id: contextId ?? null, title: t.title,
      lesson_order: i, is_generated: false, concept: "", explanation: "",
      page_start: t.page_start, page_end: t.page_end,
    }));

    const { error: insertError } = await supabase.from("mini_lessons").insert(lessonsToInsert);
    if (insertError) throw new Error("Errore durante il salvataggio delle lezioni");

    return successResponse({ success: true, lessonsCount: titles.length, titles: titles.map((t: { title: string }) => t.title) });

  } catch (error) {
    console.error("Error:", error);
    const safeMessages = [
      "Lezione non trovata",
      "Il PDF è ancora in elaborazione. Riprova tra qualche secondo.",
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
