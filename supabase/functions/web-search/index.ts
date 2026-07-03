import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";
import { callAIText } from "../_shared/ai.ts";
import { normalizeLanguage, languageDirective, languageName } from "../_shared/language.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { topic } = body;
    const language = normalizeLanguage(body.language);

    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return errorResponse("Inserisci un argomento valido (almeno 3 caratteri).", 400);
    }

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Web search for user: ${userId}, topic: "${topic}"`);

    const searchPrompt = `${languageDirective(language)}
Fornisci una spiegazione completa e dettagliata sull'argomento: "${topic}".
     
Includi:
- Definizioni e concetti fondamentali
- Spiegazioni approfondite dei principi chiave
- Esempi pratici e applicazioni
- Date, nomi e fatti importanti
- Connessioni con altri argomenti correlati

Scrivi in ${languageName(language)}. Sii esaustivo ma chiaro, come un manuale di studio universitario.
Obiettivo: il testo deve essere sufficientemente ricco da poterci generare 8-15 mini-lezioni.
Scrivi almeno 3000 parole.`;

    const content = await callAIText([
      { role: "system", content: `${languageDirective(language)} Sei un esperto accademico e docente universitario. Fornisci contenuti dettagliati, accurati e ben strutturati per lo studio. Rispondi sempre in ${languageName(language)}. Usa titoli, sottotitoli e punti elenco per organizzare il contenuto.` },
      { role: "user", content: searchPrompt },
    ], 0.4, 8000);

    if (!content) throw new Error("Nessun contenuto generato per questo argomento.");

    console.log(`Generated content length: ${content.length} chars`);

    // Save as a study context
    const { data: context, error: insertError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: `🌐 ${topic}`,
        content: content,
        processing_status: "completed",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Errore nel salvataggio del contenuto.");
    }

    console.log(`Web search content saved as context ${context.id}`);

    return successResponse({
      success: true,
      contextId: context.id,
      contentLength: content.length,
      topic,
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nella ricerca. Riprova.");
  }
});
