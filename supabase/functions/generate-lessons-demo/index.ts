import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";

/**
 * Stateless "demo" course generator for anonymous / guest users.
 * - No auth required, no DB writes, no rate limit tracking.
 * - Returns a mini "course" of 4 sequential lessons on the given topic.
 *   Each lesson has 3 short slides + 4 multiple-choice questions.
 * - The 4th lesson is intentionally included but the client blocks it
 *   behind an auth wall.
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

    const prompt = `Sei un tutor didattico. Progetta un MINI-PERCORSO DEMO in italiano composto da 4 lezioni sequenziali che sviluppano progressivamente l'argomento (introduzione -> concetti fondamentali -> approfondimento -> sintesi / applicazione).

${sourceBlock}

Rispondi SOLO con JSON valido, senza testo aggiuntivo. Schema:
{
  "courseTitle": "titolo del percorso (max 8 parole)",
  "lessons": [
    {
      "title": "titolo lezione (max 7 parole)",
      "subtitle": "riga breve che descrive il focus (max 12 parole)",
      "slides": [
        { "part_title": "🎯 titolo slide", "content": "40-60 parole, prosa chiara, 1-2 **grassetti**." },
        { "part_title": "📚 titolo slide", "content": "40-60 parole." },
        { "part_title": "🧭 titolo slide", "content": "40-60 parole, sintesi." }
      ],
      "quiz": [
        { "question": "domanda", "options": ["A","B","C","D"], "correct": 0, "skill": "LOG" }
      ]
    }
  ]
}

REGOLE TASSATIVE:
- Esattamente 4 lezioni, ordine progressivo e coerente.
- Ogni lezione: esattamente 3 slide e 4 domande.
- Ogni domanda ha 4 opzioni; "correct" è l'INDICE 0-3 dell'opzione corretta.
- "skill" appartiene a {"LOG","MEM","VOC","APP"}: distribuisci 1 LOG, 1 MEM, 1 VOC, 1 APP per lezione.
- Riscrivi con parole tue, NON copiare frasi letterali dal materiale.
- Nessun campo aggiuntivo, nessun commento.`;

    const raw = await callAIText(
      [{ role: "user", content: prompt }],
      0.5,
      6000,
    );

    const parsed = extractJson(raw) as {
      courseTitle?: string;
      lessons?: Array<{
        title?: string;
        subtitle?: string;
        slides?: { part_title?: string; content?: string }[];
        quiz?: { question?: string; options?: string[]; correct?: number; skill?: string }[];
      }>;
    };

    const allowedSkills = new Set(["LOG", "MEM", "VOC", "APP", "FOC", "ANS"]);
    const lessons = (parsed.lessons || []).slice(0, 4).map((l, li) => {
      const slides = (l.slides || []).slice(0, 3).map((s, i) => ({
        part_title: (s.part_title || `Parte ${i + 1}`).slice(0, 80),
        content: (s.content || "").slice(0, 900),
      }));
      const quiz = (l.quiz || []).slice(0, 4).map((q) => {
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
      return {
        title: (l.title || `Lezione ${li + 1}`).slice(0, 80),
        subtitle: (l.subtitle || "").slice(0, 140),
        slides,
        quiz,
      };
    });

    const valid = lessons.length === 4 && lessons.every((l) => l.slides.length >= 3 && l.quiz.length >= 3);
    if (!valid) {
      console.error("demo course malformed", { lessons: lessons.length, raw: raw.slice(0, 400) });
      return errorResponse("Generazione non valida. Riprova.", 502);
    }

    return successResponse({
      courseTitle: (parsed.courseTitle || topic || "Mini percorso").slice(0, 100),
      lessons,
    });
  } catch (err) {
    console.error("generate-lessons-demo error", err);
    return errorResponse("Errore nella generazione del percorso demo. Riprova.", 500);
  }
});