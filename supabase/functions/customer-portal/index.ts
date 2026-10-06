import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { getPaddleClient, type PaddleEnv } from "../_shared/paddle.ts";

Deno.serve(withCors(async (req) => {
  let auth;
  try {
    auth = await validateAuth(req);
  } catch {
    return errorResponse("Sessione scaduta", 401);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const env: PaddleEnv = body?.environment === "live" ? "live" : "sandbox";
    const { data: sub } = await auth.supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", auth.userId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub) return errorResponse("Nessun abbonamento trovato", 404);

    const paddle = getPaddleClient(sub.environment as PaddleEnv);
    const session = await paddle.customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);
    return successResponse({ url: session.urls.general.overview });
  } catch (e) {
    console.error("customer-portal:", e);
    return errorResponse("Impossibile aprire la gestione abbonamento", 500);
  }
}));
