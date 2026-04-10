import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { contextId, lessonIds } = body;
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

    const trimmed = studyContent.slice(0, 15000);

    const prompt = `Genera 10 esercizi variegati basati ESCLUSIVAMENTE su questi materiali di studio. Usa questi tipi di esercizio, alternandoli:

1. "multiple_choice" - Scelta multipla con 4 opzioni
2. "true_false" - Vero o Falso con options ["Vero", "Falso"]
3. "fill_blank" - Completa la frase (la risposta è una parola/frase breve)
4. "matching" - Abbinamento di coppie (pairs con left/right)
5. "ordering" - Metti in ordine (items da ordinare, correctAnswer è l'ordine giusto)

IMPORTANTE: Genera ESATTAMENTE 10 esercizi. NON usare "short_answer".

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
    "type": "fill_blank",
    "question": "La capitale dell'Italia è ___",
    "correctAnswer": "Roma",
    "explanation": "Roma è la capitale"
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

    const content = await callAIText([{ role: "user", content: prompt }], 0.5, 4096);

    // Extract JSON array
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return errorResponse("Formato risposta non valido");

    try {
      const exercises = JSON.parse(arrayMatch[0]);
      if (!Array.isArray(exercises)) throw new Error("Not array");
      return successResponse({ exercises });
    } catch {
      return errorResponse("Errore nel parsing degli esercizi");
    }
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nella generazione degli esercizi. Riprova.");
  }
});
