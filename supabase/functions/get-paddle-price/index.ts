import { withCors, errorResponse, successResponse } from "../_shared/auth.ts";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const ALLOWED_PRICES = new Set(["pro_monthly"]);

Deno.serve(withCors(async (req) => {
  try {
    const { priceId, environment } = await req.json();
    if (typeof priceId !== "string" || !ALLOWED_PRICES.has(priceId)) {
      return errorResponse("Prezzo non valido", 400);
    }
    const env: PaddleEnv = environment === "live" ? "live" : "sandbox";
    const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await res.json();
    if (!data.data?.length) return errorResponse("Prezzo non trovato", 404);
    return successResponse({ paddleId: data.data[0].id });
  } catch (e) {
    console.error("get-paddle-price:", e);
    return errorResponse("Errore nel recupero del prezzo", 500);
  }
}));
