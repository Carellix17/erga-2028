// Salva (upsert) o cancella una subscription Web Push dell'utente loggato.
// POST { subscription: PushSubscriptionJSON } -> upsert
// DELETE { endpoint } -> cancella
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireAuth(req);
    if (!auth.isAuthenticated) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { userId, supabase } = auth;
    const body = await req.json().catch(() => ({}));

    if (req.method === "DELETE") {
      const endpoint = body?.endpoint;
      if (!endpoint) {
        return new Response(JSON.stringify({ error: "endpoint mancante" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", endpoint);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const authKey = sub?.keys?.auth;
    if (!endpoint || !p256dh || !authKey) {
      return new Response(JSON.stringify({ error: "Subscription invalida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userAgent = req.headers.get("user-agent") || null;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth: authKey,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("push-subscribe error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Errore" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});