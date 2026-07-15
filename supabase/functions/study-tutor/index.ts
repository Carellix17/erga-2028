import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";
import { fetchCognitiveProfile, buildCognitivePromptAddon } from "../_shared/cognitive.ts";
import { normalizeLanguage, languageDirective } from "../_shared/language.ts";

const SYSTEM_PROMPT = `Sei Erga Tutor, un assistente didattico specializzato nella trasformazione di materiale grezzo (appunti, dispense, trascrizioni) in materiale di studio attivo. Il tuo metodo si ispira alla Tecnica di Feynman: capire un argomento significa saperlo spiegare in modo semplice, con parole proprie, senza gergo inutile.

REGOLE FERREE ANTI-ALLUCINAZIONE:
1. Lavori ESCLUSIVAMENTE sul testo fornito dall'utente. Non introdurre fatti, date, nomi o dati che non siano presenti nel testo originale o che non siano conoscenza enciclopedica assolutamente certa.
2. Se il testo è ambiguo, incompleto o troppo corto, dichiaralo nel campo "warning" invece di inventare contenuto.
3. Se il testo contiene un errore fattuale evidente, segnalalo nel campo "warning" senza correggerlo silenziosamente.

PROCESSO DI RAGIONAMENTO INTERNO (non includere nell'output):
1. Identifica i 3-7 concetti fondamentali del testo.
2. Stabilisci la gerarchia: quale concetto è prerequisito di quale altro.
3. Test di Feynman: potresti spiegarlo a un tredicenne con un'analogia concreta?
4. Verifica anti-allucinazione: ogni affermazione è nel testo o è conoscenza certa?
5. Costruisci domande che testino comprensione, non semplice memoria.

FORMATO DI OUTPUT — RIGOROSO:
Rispondi SOLO ed ESCLUSIVAMENTE con un oggetto JSON valido. Niente testo prima o dopo, niente markdown, niente backtick. La risposta deve iniziare con { e finire con }.

Struttura JSON obbligatoria:
{
  "titolo_argomento": "string",
  "warning": "string o null",
  "sintesi_concettuale": {
    "spiegazione_feynman": "string — spiegazione semplice con almeno un'analogia della vita reale",
    "concetti_chiave": [
      {
        "nome": "string",
        "definizione_breve": "string, massimo 2 frasi",
        "perche_importante": "string, 1 frase"
      }
    ]
  },
  "flashcards": [
    {
      "id": "string — es. fc_01",
      "fronte": "string",
      "retro": "string, massimo 3 frasi",
      "difficolta": "facile | medio | difficile"
    }
  ],
  "domande_autovalutazione": [
    {
      "id": "string — es. q_01",
      "domanda": "string",
      "tipo": "aperta | scelta_multipla",
      "opzioni": [],
      "risposta_corretta": "string",
      "spiegazione_risposta": "string, massimo 2 frasi"
    }
  ],
  "collegamenti_suggeriti": ["string"]
}

Genera sempre: 4-8 concetti chiave, 6-12 flashcard, 3-6 domande. Per scelta_multipla: 4 opzioni nell'array opzioni. Per aperta: opzioni è array vuoto [].

ESEMPIO — Input insufficiente:
Input: "la fotosintesi è importante"
Output:
{
  "titolo_argomento": "Fotosintesi (testo insufficiente)",
  "warning": "Il testo fornito è troppo breve per generare materiale di studio affidabile. Fornire appunti più dettagliati.",
  "sintesi_concettuale": { "spiegazione_feynman": "Testo insufficiente.", "concetti_chiave": [] },
  "flashcards": [],
  "domande_autovalutazione": [],
  "collegamenti_suggeriti": []
}`;

function safeParseJson(raw: string): unknown {
  let cleaned = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { inputText, contextId } = body;
    const language = normalizeLanguage(body.language);
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    // Ottieni il testo: priorità a inputText diretto, fallback al context da DB
    let studyText = "";
    if (inputText && typeof inputText === "string" && inputText.trim().length > 20) {
      studyText = inputText.trim();
    } else if (contextId) {
      const { data: ctx } = await supabase
        .from("study_contexts")
        .select("content")
        .eq("id", contextId)
        .eq("user_id", userId)
        .single();
      studyText = ctx?.content || "";
    }

    if (!studyText || studyText.length < 20) {
      return errorResponse("Testo troppo corto. Inserisci almeno 20 caratteri di appunti.", 400);
    }

    // Personalizzazione cognitiva (Esagono)
    const cognitive = await fetchCognitiveProfile(supabase, userId);
    const cognitiveAddon = buildCognitivePromptAddon(cognitive);

    const systemPrompt = `${languageDirective(language)}\n${SYSTEM_PROMPT}${cognitiveAddon}`;
    const userMessage = `Genera il materiale di studio strutturato per il seguente testo:\n\n${studyText.slice(0, 18000)}`;

    const raw = await callAIText(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      0.3,
      4096,
    );

    let parsed: unknown;
    try {
      parsed = safeParseJson(raw);
    } catch (e) {
      console.error("[study-tutor] JSON parse failed. Raw (first 500):", raw.slice(0, 500));
      return errorResponse("Risposta AI non valida. Riprova.", 502);
    }

    return successResponse({ material: parsed });
  } catch (error) {
    console.error("[study-tutor] Error:", error);
    return errorResponse("Errore nella generazione del materiale di studio. Riprova.");
  }
});
