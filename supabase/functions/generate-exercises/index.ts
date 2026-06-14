import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";
import { fetchCognitiveProfile, buildCognitivePromptAddon } from "../_shared/cognitive.ts";

function extractJsonArray(raw: string): unknown[] {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { const p = JSON.parse(cleaned); if (Array.isArray(p)) return p; } catch { /* continue */ }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { const p = JSON.parse(arrMatch[0]); if (Array.isArray(p)) return p; } catch { /* continue */ }
    cleaned = arrMatch[0];
  }
  // Walk top-level {...} objects inside the array, dropping any truncated/corrupt tail.
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
        const slice = cleaned.slice(objStart, i);
        try { JSON.parse(slice); items.push(slice); } catch { /* skip broken item */ }
      } else {
        break; // truncated mid-object
      }
    }
    if (items.length > 0) {
      try { return JSON.parse("[" + items.join(",") + "]"); } catch { /* continue */ }
    }
  }
  throw new Error("Impossibile estrarre JSON dalla risposta AI");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contextId, lessonIds, count } = body;
    const requestedCount = Math.min(20, Math.max(1, Math.round(Number(count) || 10)));
    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;

    if (!contextId) return errorResponse("Missing contextId", 400);

    let studyContent = "";

    // If specific lessons are requested, use their content
    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
      const { data: lessons } = await supabase
        .from("mini_lessons")
        .select("title, concept, explanation, example")
        .in("id", lessonIds)
        .eq("user_id", userId);

      let allLessons = lessons || [];

      // Try legacy user
      if (allLessons.length === 0) {
        const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;
        if (legacyUserId) {
          const { data: legacyLessons } = await supabase
            .from("mini_lessons")
            .select("title, concept, explanation, example")
            .in("id", lessonIds)
            .eq("user_id", legacyUserId);
          allLessons = legacyLessons || [];
        }
      }

      if (allLessons.length === 0) return errorResponse("Nessuna lezione trovata", 400);

      studyContent = allLessons.map((l: { title: string; concept: string; explanation: string; example: string | null }) =>
        `## ${l.title}\nConcetto: ${l.concept}\nSpiegazione: ${l.explanation}${l.example ? `\nEsempio: ${l.example}` : ""}`
      ).join("\n\n");
    } else {
      // Use full context content (original behavior)
      const { data: ctx } = await supabase
        .from("study_contexts")
        .select("content, file_name")
        .eq("id", contextId)
        .eq("user_id", userId)
        .single();

      studyContent = ctx?.content || "";
      if (!studyContent) {
        const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;
        if (legacyUserId) {
          const { data: legacyCtx } = await supabase
            .from("study_contexts")
            .select("content, file_name")
            .eq("id", contextId)
            .eq("user_id", legacyUserId)
            .single();
          studyContent = legacyCtx?.content || "";
        }
      }
    }

    if (!studyContent) return errorResponse("Nessun contenuto trovato", 400);

    // Personalizzazione cognitiva (Esagono): regole basate sui punteggi 0-100
    const cognitive = await fetchCognitiveProfile(supabase, userId);
    const cognitiveAddon = buildCognitivePromptAddon(cognitive);

    // Idempotenza: se esiste già un job 'generating' per stessa selezione, riusalo
    const lessonIdsKey = Array.isArray(lessonIds) ? [...lessonIds].sort() : [];
    const { data: existingJob } = await supabase
      .from("exercise_jobs")
      .select("id, lesson_ids")
      .eq("user_id", userId)
      .eq("context_id", contextId)
      .eq("status", "generating")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingJob) {
      const existingIds = Array.isArray(existingJob.lesson_ids) ? [...existingJob.lesson_ids].sort() : [];
      if (JSON.stringify(existingIds) === JSON.stringify(lessonIdsKey)) {
        return new Response(
          JSON.stringify({ success: true, status: "generating", jobId: existingJob.id, alreadyRunning: true }),
          { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Crea il job in stato 'generating' e rispondi subito
    const { data: job, error: jobErr } = await supabase
      .from("exercise_jobs")
      .insert({
        user_id: userId,
        context_id: contextId,
        lesson_ids: lessonIdsKey,
        status: "generating",
      })
      .select("id")
      .single();
    if (jobErr || !job) return errorResponse("Impossibile creare il job di generazione", 500);

    const trimmed = studyContent.slice(0, 15000);

    const prompt = `Rispondi ESCLUSIVAMENTE con un array JSON valido. NIENTE markdown, NIENTE \`\`\`json, NIENTE testo prima o dopo. Tutte le virgolette dentro le stringhe devono essere correttamente protette con \\". NIENTE virgole finali.

Genera ${requestedCount} esercizi basati ESCLUSIVAMENTE su questi materiali di studio. Usa SOLO questi tipi di esercizio, alternandoli:

1. "multiple_choice" - Scelta multipla con 4 opzioni
2. "true_false" - Vero o Falso con options ["Vero", "Falso"]
3. "matching" - Abbinamento di coppie (pairs con left/right)
4. "ordering" - Metti in ordine (items da ordinare, correctAnswer è l'ordine giusto)

IMPORTANTE: Genera ESATTAMENTE ${requestedCount} esercizi. NON usare "short_answer" né "fill_blank". La maggior parte devono essere "multiple_choice" e "true_false".
${cognitiveAddon}
MATERIALI:
${trimmed}

Rispondi SOLO con un array JSON valido. Ogni esercizio ha questa struttura:
[
  {
    "type": "multiple_choice",
    "question": "Domanda?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "B",
    "explanation": "Spiegazione breve"
  },
  {
    "type": "true_false",
    "question": "Affermazione da valutare",
    "options": ["Vero", "Falso"],
    "correctAnswer": "Vero",
    "explanation": "Perché è vero"
  },
  {
    "type": "matching",
    "question": "Abbina gli elementi:",
    "pairs": [{"left": "A", "right": "1"}, {"left": "B", "right": "2"}],
    "correctAnswer": ["A→1", "B→2"],
    "explanation": "Spiegazione"
  },
  {
    "type": "ordering",
    "question": "Metti in ordine cronologico:",
    "items": ["C", "A", "B"],
    "correctAnswer": ["A", "B", "C"],
    "explanation": "L'ordine corretto è..."
  }
]`;

    const backgroundJob = async () => {
      try {
        const content = await callAIText([
          { role: "system", content: "Rispondi ESCLUSIVAMENTE con un array JSON valido. Niente markdown, niente ```json, niente testo extra. Tutte le virgolette interne alle stringhe devono essere escape con \\\". Niente virgole finali." },
          { role: "user", content: prompt },
        ], 0.3, 4096);
        const exercises = extractJsonArray(content);
        if (!Array.isArray(exercises) || exercises.length === 0) throw new Error("Risposta AI non valida");
        await supabase.from("exercise_jobs").update({
          status: "completed",
          result: { exercises },
          error: null,
        }).eq("id", job.id);
        try {
          const { sendPushToUser } = await import("../_shared/push.ts");
          await sendPushToUser(supabase, userId, {
            title: "Esercizi pronti 🎯",
            body: "I tuoi esercizi mirati sono pronti! Mettiti alla prova.",
            url: "/?tab=pratica",
            tag: `exercises-${job.id}`,
          });
        } catch (e) { console.error("[push] notify exercises failed:", e); }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Errore nella generazione degli esercizi";
        console.error(`❌ exercise_jobs ${job.id} failed:`, msg);
        await supabase.from("exercise_jobs").update({
          status: "failed",
          error: msg,
        }).eq("id", job.id);
      }
    };

    // @ts-ignore — EdgeRuntime è iniettato da Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundJob());
    } else {
      backgroundJob();
    }

    return new Response(
      JSON.stringify({ success: true, status: "generating", jobId: job.id }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nella generazione degli esercizi. Riprova.");
  }
});
