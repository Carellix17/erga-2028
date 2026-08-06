/* eslint-disable @typescript-eslint/no-explicit-any -- QUARANTENA P21i: eredita'.
   Il wrapper dell'API OAuth (beta di Supabase, "not fully typed") usa `any` per le
   risposte: tipizzarla = toccare la logica di autorizzazione = FUORI perimetro Opal. */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Minimal typed wrapper — `supabase.auth.oauth` is beta and not fully typed.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = (): OAuthNs => (supabase.auth as unknown as { oauth: OAuthNs }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorizationId)
      : await oauthApi().denyAuthorization(authorizationId);
    if (error) { setBusy(false); return setError(error.message); }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-card border border-border p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Autorizzazione non disponibile</h1>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-sm text-muted-foreground">Caricamento…</div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "un'app esterna";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-3xl bg-card border border-border shadow-level-2 p-6">
        <h1 className="text-xl font-semibold text-foreground">
          Collega {clientName} a Erga
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {clientName} potrà accedere ai tuoi materiali di studio (contesti e mini-lezioni)
          agendo come te tramite l'MCP di Erga. Puoi revocare l'accesso in qualsiasi momento.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 h-11 rounded-xl" disabled={busy} onClick={() => decide(false)}>
            Nega
          </Button>
          <Button className="flex-1 h-11 rounded-xl" disabled={busy} onClick={() => decide(true)}>
            Autorizza
          </Button>
        </div>
      </div>
    </main>
  );
}