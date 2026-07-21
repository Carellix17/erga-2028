import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { fetchWikipediaImage } from "../_shared/wikipedia.ts";
import { normalizeLanguage } from "../_shared/language.ts";

/**
 * 🖼️ Macchinetta delle immagini per la chat (pacco P7).
 * Il client la chiama quando una risposta contiene il tag [IMG: query]:
 * risponde con un'immagine reale da Wikipedia (url + didascalia + link voce)
 * oppure { image: null } se non c'è nulla di adatto.
 */
serve(withCors(async (req) => {
  try {
    const body = await req.json();
    await validateAuth(req, body);

    const query = typeof body?.query === "string" ? body.query : "";
    const language = normalizeLanguage(body?.language);
    if (!query.trim()) return errorResponse("query mancante", 400);

    const image = await fetchWikipediaImage(query, language);
    return successResponse({ image });
  } catch (error) {
    console.error("wiki-image error:", error);
    return errorResponse("Non sono riuscito a cercare l'immagine. Riprova.", 500);
  }
}));
