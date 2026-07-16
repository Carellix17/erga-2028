import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";
import { fetchCognitiveProfile, buildCognitivePromptAddon } from "../_shared/cognitive.ts";
import { normalizeLanguage, languageDirective, languageName } from "../_shared/language.ts";

const LESSON_TUTOR_SYSTEM = `Sei un tutor personale esperto che aiuta lo studente a comprendere in profondità UNA specifica lezione. Hai accesso ESCLUSIVO al contenuto di quella lezione — non inventare mai nulla che non sia presente in essa.

STILE DI RISPOSTA (ispirato a NotebookLM):
- Risposte brevi e conversazionali, mai blocchi di testo densi
- Massimo 3-4 frasi per risposta, salvo richieste di approfondimento esplicite
- Usa analogie concrete e esempi pratici tratti dal contenuto della lezione
- Se lo studente non capisce qualcosa, prova un'angolazione diversa, non ripetere le stesse parole
- Dopo aver risposto, fai UNA domanda di verifica per testare la comprensione (es. "Ha senso? Sai dirmi come si applica questo a...")
- Tono incoraggiante ma diretto — non eccessivamente formale

REGOLE FERREE:
1. Rispondi SOLO basandoti sul contenuto della lezione fornito nel contesto
2. Se la domanda esula dalla lezione, dì chiaramente: "Questa domanda va oltre il contenuto di questa lezione. Ti consiglio di caricare altro materiale nella sezione Studio."
3. Non inventare esempi, dati o spiegazioni non presenti nella lezione
4. Se il contenuto della lezione è insufficiente per rispondere, dillo onestamente`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, lessonContent, lessonTitle } = body;
    const language = normalizeLanguage(body.language);
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    if (!messages || !lessonContent) {
      return errorResponse("Missing messages or lessonContent", 400);
    }

    const cognitive = await fetchCognitiveProfile(supabase, userId);
    const cognitiveAddon = buildCognitivePromptAddon(cognitive);

    const MAX_LESSON_CHARS = 10000;
    const MAX_MESSAGE_CHARS = 1500;
    const MAX_HISTORY = 16;

    const trimTo = (s: string, max: number) =>
      s.length > max ? s.slice(0, max) + "\n…[contenuto troncato]" : s;

    const systemPrompt = `${languageDirective(language)}
${LESSON_TUTOR_SYSTEM}
${cognitiveAddon}
════════════════════════════════════════
LEZIONE IN STUDIO: "${lessonTitle || "Lezione corrente"}"
════════════════════════════════════════
${trimTo(lessonContent, MAX_LESSON_CHARS)}
════════════════════════════════════════
Rispondi SEMPRE in ${languageName(language)}.`;

    const trimmedHistory = (Array.isArray(messages) ? messages : [])
      .slice(-MAX_HISTORY)
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: trimTo(String(m.content ?? ""), MAX_MESSAGE_CHARS),
      }));

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
    ];

    // Non-streaming call for reliability: Gemini's OpenAI-compatible
    // streaming occasionally emits [DONE] with no content deltas, which
    // made the chat appear to freeze after a few tokens. We fetch the
    // full text through the same 4-tier fallback and then chunk it out
    // as SSE so the client keeps the typing effect.
    const fullText = await callAIText(apiMessages, 0.65, 2048);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const text = fullText || "Non sono riuscito a generare una risposta. Riprova tra poco.";
        const CHUNK = 24; // characters per SSE tick
        for (let i = 0; i < text.length; i += CHUNK) {
          const piece = text.slice(i, i + CHUNK);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`,
            ),
          );
          // small pacing so the UI shows progressive typing
          await new Promise((r) => setTimeout(r, 15));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[lesson-chat] Error:", error);
    return errorResponse("Errore nella chat della lezione. Riprova.");
  }
});
