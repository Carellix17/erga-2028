// Invia una push di test all'utente loggato — utile per verificare
// che VAPID, service worker e subscription siano configurati correttamente.
import { withCors, validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { sendPushToUser } from "../_shared/push.ts";

Deno.serve(withCors(async (req) => {
  try {
    let auth;
    try { auth = await validateAuth(req); }
    catch { return unauthorizedResponse("Non autorizzato"); }
    const { userId, supabase } = auth;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId);

    await sendPushToUser(supabase, userId, {
      title: "Erga — notifiche attive ✅",
      body: "Perfetto! Ti avviseremo qui quando i tuoi materiali saranno pronti.",
      url: "/",
      tag: "push-test",
    });

    return new Response(
      JSON.stringify({ success: true, subscriptions: subs?.length ?? 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("push-test error:", err);
    return new Response(
      JSON.stringify({ error: "Si è verificato un errore. Riprova." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}));