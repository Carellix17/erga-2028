// Invia una push di test all'utente loggato — utile per verificare
// che VAPID, service worker e subscription siano configurati correttamente.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { sendPushToUser } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("push-test error:", err);
    return new Response(
      JSON.stringify({ error: "Si è verificato un errore. Riprova." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});