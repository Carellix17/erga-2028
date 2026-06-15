import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, contextId, question, answer, history, questionNumber, maxQuestions: maxQuestionsBody, scores } = body;
    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;

    if (!action) return errorResponse("Missing action", 400);

    // Fetch study content
    let studyContent = "";
    if (contextId) {
      const { data: ctx } = await supabase
        .from("study_contexts")
        .select("content, file_name")
        .eq("id", contextId)
        .eq("user_id", userId)
        .single();
      if (ctx) {
        studyContent = ctx.content.slice(0, 12000);
      } else {
        // Try legacy
        const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;
        if (legacyUserId) {
          const { data: legacyCtx } = await supabase
            .from("study_contexts")
            .select("content, file_name")
            .eq("id", contextId)
            .eq("user_id", legacyUserId)
            .single();
          if (legacyCtx) studyContent = legacyCtx.content.slice(0, 12000);
        }
      }
    }

    if (!studyContent) {
      return errorResponse("Nessun contenuto di studio trovato", 400);
    }

    const callAI = async (messages: any[], temperature = 0.7) => {
      // Gemini 2.5 Flash consuma "reasoning tokens" dal budget: serve un margine ampio
      // per evitare risposte troncate a metà frase.
      return callAIText(messages, temperature, 4096);
    };

    if (action === "ask") {
      const prompt = `Sei un tutor amichevole che sta aiutando uno studente a ripassare. Usa un tono colloquiale, dai del tu, niente formalismi. Basandoti SOLO sui materiali qui sotto, fai UNA domanda chiara e diretta per capire se ha capito un concetto importante. La domanda dev'essere aperta (richiede spiegazione), non troppo lunga, in italiano semplice.

MATERIALI:
${studyContent}

Rispondi SOLO con la domanda, senza preamboli né virgolette.`;

      let result = (await callAI([{ role: "user", content: prompt }], 0.8)).trim();
      if (!result) {
        // retry once with different temperature if empty
        result = (await callAI([{ role: "user", content: prompt }], 0.5)).trim();
      }
      if (!result) return errorResponse("Non sono riuscito a generare la domanda, riprova", 502);
      return successResponse({ question: result });
    }

    if (action === "topic") {
      const prompt = `Dai un'occhiata a questi materiali e scegli UN argomento specifico su cui lo studente possa esporsi. Rispondi SOLO con il nome dell'argomento (2-6 parole), senza virgolette.

MATERIALI:
${studyContent}`;

      let result = (await callAI([{ role: "user", content: prompt }], 0.9)).trim().replace(/^["'«»]+|["'«»]+$/g, "");
      if (!result) result = (await callAI([{ role: "user", content: prompt }], 0.6)).trim().replace(/^["'«»]+|["'«»]+$/g, "");
      if (!result) return errorResponse("Non sono riuscito a scegliere l'argomento, riprova", 502);
      return successResponse({ topic: result });
    }

    if (action === "evaluate" || action === "evaluate_free") {
      const isStructured = action === "evaluate";
      const qNum = questionNumber || 1;
      const maxQuestions = Math.min(10, Math.max(3, Number(maxQuestionsBody) || 5));

      const historyText = (history || [])
        .map((h: any) => `${h.type === "question" ? "DOMANDA" : h.type === "answer" ? "RISPOSTA" : "FEEDBACK"}: ${h.content}`)
        .join("\n");

      const prompt = isStructured
        ? `Sei un tutor amichevole che sta aiutando uno studente a ripassare. Dai del tu, usa un tono caloroso e incoraggiante, niente formalismi da professore severo. Valuta questa risposta in modo chiaro e costruttivo.

MATERIALI DI STUDIO:
${studyContent}

STORICO INTERROGAZIONE:
${historyText}

DOMANDA ATTUALE: ${question}
RISPOSTA DELLO STUDENTE: ${answer}

Puoi usare **grassetto** per i concetti chiave. Il voto deve essere un numero con UN decimale italiano (es. 6.5, 7, 8.5) compreso tra 2 e 10, riferito SOLO a questa ultima risposta.
Rispondi in formato JSON (SOLO JSON, nessun testo prima o dopo):
{
  "feedback": "Valutazione amichevole (2-3 frasi). Dì cosa è giusto e cosa manca, con tono incoraggiante.",
  "score": <voto da 2 a 10 con eventuale decimale, es. 7.5>,
  ${qNum < maxQuestions ? '"nextQuestion": "La prossima domanda (diversa dalle precedenti, tono colloquiale)",' : '"finished": true'}
}`
        : `Sei un tutor amichevole. Lo studente ha esposto le sue conoscenze sull'argomento "${question}". Valuta la sua esposizione con tono caloroso e incoraggiante, dandogli del tu.

MATERIALI DI STUDIO:
${studyContent}

ESPOSIZIONE DELLO STUDENTE: ${answer}

Puoi usare **grassetto** per i concetti chiave. Il voto deve essere un numero con UN decimale italiano (es. 6.5, 7, 8.5) compreso tra 2 e 10.
Rispondi in formato JSON (SOLO JSON):
{
  "feedback": "Valutazione completa e amichevole: cosa ha detto bene, cosa manca, suggerimenti pratici (4-5 frasi).",
  "score": <voto da 2 a 10 con eventuale decimale, es. 7.5>,
  "finished": true
}`;

      const result = await callAI([{ role: "user", content: prompt }], 0.3);

      // Parse JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return errorResponse("Errore nel formato della risposta");

      try {
        let raw = jsonMatch[0]
          .replace(/,(\s*[}\]])/g, "$1") // trailing commas
          .replace(/[\x00-\x1F\x7F]/g, " ");
        const parsed = JSON.parse(raw);
        return successResponse(parsed);
      } catch {
        return errorResponse("Errore nel parsing della risposta");
      }
    }

    if (action === "final_report") {
      const historyText = (history || [])
        .map((h: any) => `${h.type === "question" ? "DOMANDA" : h.type === "answer" ? "RISPOSTA" : "FEEDBACK"}: ${h.content}`)
        .join("\n");
      const scoresText = Array.isArray(scores)
        ? scores.map((s: any, i: number) => `Domanda ${i + 1}: ${s.score}/10`).join("\n")
        : "";
      const avg = Array.isArray(scores) && scores.length
        ? (scores.reduce((a: number, s: any) => a + Number(s.score || 0), 0) / scores.length)
        : 0;

      const prompt = `Sei un tutor amichevole che ha appena concluso un'interrogazione orale con uno studente. Dai del tu, tono caloroso e costruttivo.

MATERIALI DI STUDIO:
${studyContent}

STORICO INTERROGAZIONE:
${historyText}

VOTI PER DOMANDA:
${scoresText}
MEDIA: ${avg.toFixed(2)}/10

Scrivi una breve analisi finale (4-6 frasi) in italiano: punti di forza emersi, lacune o concetti da rivedere, e 1-2 consigli pratici per migliorare. Usa **grassetto** sui concetti chiave. Rispondi SOLO in JSON:
{
  "considerations": "testo dell'analisi finale"
}`;

      const result = await callAI([{ role: "user", content: prompt }], 0.5);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return successResponse({ considerations: result.trim() });
      try {
        const raw = jsonMatch[0].replace(/,(\s*[}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
        const parsed = JSON.parse(raw);
        return successResponse(parsed);
      } catch {
        return successResponse({ considerations: result.trim() });
      }
    }

    return errorResponse("Azione non valida", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nel servizio interrogazione. Riprova.");
  }
});
