import { validateAuth, corsHeaders, errorResponse, unauthorizedResponse } from "../_shared/auth.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    try { await validateAuth(req); } catch { return unauthorizedResponse(); }

    const { text, voiceId } = await req.json();
    if (!text || typeof text !== "string") return errorResponse("Testo mancante", 400);
    const voice = (typeof voiceId === "string" && voiceId) || "EXAVITQu4vr4xnSDxMaL"; // Sarah

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return errorResponse("ELEVENLABS_API_KEY non configurata", 500);

    // Trim overly long text to keep latency/credits sane
    const trimmed = text.slice(0, 4500);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("ElevenLabs error:", res.status, err);
      return errorResponse("Errore generazione audio", 502);
    }

    const buf = await res.arrayBuffer();
    const audioContent = base64Encode(new Uint8Array(buf));
    return new Response(JSON.stringify({ audioContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("text-to-speech error:", (e as Error).message);
    return errorResponse("Errore interno", 500);
  }
});