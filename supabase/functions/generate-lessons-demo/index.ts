import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";

/**
 * Stateless "demo" lesson generator for anonymous / guest users.
 * - No auth required, no DB writes, no rate limit tracking.
 * - Returns 3 short slides + 4 multiple-choice questions on the given topic.
 * - Input: { topic?: string, text?: string }
 */

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
  throw new Error("Invalid AI JSON");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 240) : "";
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";

    if (!topic && !text) {
      return errorResponse("Argomento o testo mancante", 400);
    }

    const sourceBlock = text
      ? `MATERIALE FORNITO (usa questo come unica fonte):\n"""\n${text}\n"""`
      : `ARGOMENTO: "${topic}"`;

    const prompt = `Sei un tutor didattico. Genera una MICRO-LEZIONE DEMO in italiano.

${sourceBlock}

Rispondi SOLO con JSON valido, senza testo aggiuntivo. Schema:
{
  "title": "titolo breve (max 8 parole)",
  "slides": [
    { "part_title": "🎯 titolo slide", "content": "40-60 parole, prosa chiara, 1-2 **grassetti**. Niente muri di testo." },
    { "part_title": "📚 titolo slide", "content": "40-60 parole." },
    { "part_title": "🧭 titolo slide", "content": "40-60 parole, sintesi finale." }
  ],
  "quiz": [
    {
      "question": "domanda a scelta multipla",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "skill": "LOG"
    }
  ]
}

REGOLE TASSATIVE:
- Esattamente 3 slide.
- Esattamente 4 domande nel quiz.
- Ogni domanda ha 4 opzioni e "correct" è l'INDICE 0-3 dell'opzione corretta.
- Il campo "skill" di ogni domanda è uno di: "LOG" (logica), "MEM" (memoria dettagli), "VOC" (lessico/terminologia), "APP" (applicazione pratica). Distribuiscile: 1 LOG, 1 MEM, 1 VOC, 1 APP.
- Riscrivi con parole tue, NON copiare frasi letterali dal materiale.
- Nessun campo aggiuntivo, nessun commento.`;

    const raw = await callAIText(
      [{ role: "user", content: prompt }],
      0.4,
      2200,
    );

    const parsed = extractJson(raw) as {
      title?: string;
      slides?: { part_title?: string; content?: string }[];
      quiz?: { question?: string; options?: string[]; correct?: number; skill?: string }[];
    };

    const slides = (parsed.slides || []).slice(0, 3).map((s, i) => ({
      part_title: (s.part_title || `Parte ${i + 1}`).slice(0, 80),
      content: (s.content || "").slice(0, 900),
    }));

    const allowedSkills = new Set(["LOG", "MEM", "VOC", "APP", "FOC", "ANS"]);
    const quiz = (parsed.quiz || []).slice(0, 4).map((q) => {
      const options = Array.isArray(q.options) ? q.options.slice(0, 4).map((o) => String(o).slice(0, 160)) : [];
      const correct = typeof q.correct === "number" && q.correct >= 0 && q.correct < options.length ? q.correct : 0;
      const skill = allowedSkills.has(String(q.skill)) ? String(q.skill) : "LOG";
      return {
        question: String(q.question || "").slice(0, 240),
        options,
        correct,
        skill,
      };
    });

    if (slides.length < 3 || quiz.length < 3) {
      console.error("demo malformed", { slides: slides.length, quiz: quiz.length, raw: raw.slice(0, 400) });
      return errorResponse("Generazione non valida. Riprova.", 502);
    }

    return successResponse({
      title: (parsed.title || topic || "Micro-lezione").slice(0, 100),
      slides,
      quiz,
    });
  } catch (err) {
    console.error("generate-lessons-demo error", err);
    return errorResponse("Errore nella generazione della lezione demo. Riprova.", 500);
  }
});