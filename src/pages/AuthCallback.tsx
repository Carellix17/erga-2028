import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { safeNextPath } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";

const WAIT_FOR_SESSION_MS = 12_000;
const POLL_INTERVAL_MS = 250;

/**
 * Rotte di callback dell'OAuth Google (e altri provider via broker Lovable).
 *
 * PRIMA: il broker rimandava il browser direttamente su `/app` con i token
 * nell'hash dell'URL; la rotta protetta poteva decidere "non loggato" prima
 * che la sessione fosse scritta nello storage e rimandava l'utente al login
 * in un loop, oppure l'app partiva senza sessione e leggeva dati come
 * utente anonimo (onboarding + dati vuoti).
 *
 * ADESSO: il browser torna QUI, questa pagina attende ESPLICITAMENTE la
 * sessione (evento + polling con timeout), pulisce l'hash con i token e
 * solo dopo naviga alla destinazione (`next`). Se dopo il timeout non c'è
 * ancora sessione, porta al login conservando `next`.
 */
export default function AuthCallback({
  waitTimeoutMs = WAIT_FOR_SESSION_MS,
}: {
  /** Sovrascrivibile nei test per non aspettare 12s. */
  waitTimeoutMs?: number;
} = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [failed, setFailed] = useState(false);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const finish = (target: string, replace = true) => {
      if (disposed || resolvedRef.current) return;
      resolvedRef.current = true;
      // Rimuove access_token/refresh_token/state dall'URL prima di navigare:
      // non devono restare nella cronologia del browser.
      try {
        const cleanPath = window.location.pathname + window.location.search;
        window.history.replaceState({}, "", cleanPath);
      } catch {
        /* best effort */
      }
      dispose();
      navigate(target, { replace });
    };

    const dispose = () => {
      if (timer) clearTimeout(timer);
      if (poll) clearInterval(poll);
    };

    const checkSession = async () => {
      if (disposed || resolvedRef.current) return;
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          finish(nextPath);
          return true;
        }
      } catch (e) {
        console.error("auth callback getSession error", e);
      }
      return false;
    };

    // 1) Ascolta l'evento di auth (copre il caso in cui il client riconosce
    //    i token dall'hash con un leggero ritardo).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) finish(nextPath);
      },
    );

    // 2) Polling di sicurezza: la sessione può essere già nello storage.
    void checkSession().then((found) => {
      if (found || disposed) return;
      poll = setInterval(() => {
        void checkSession().then((ok) => {
          if (ok) return; // finish() ha già pulito
        });
      }, POLL_INTERVAL_MS);
    });

    // 3) Timeout: se il broker non ha consegnato nulla, si va al login
    //    conservando la destinazione (niente loop silenzioso).
    timer = setTimeout(() => {
      if (disposed || resolvedRef.current) return;
      setFailed(true);
      dispose();
      const loginTarget = `/login?next=${encodeURIComponent(nextPath)}`;
      navigate(loginTarget, { replace: true });
    }, waitTimeoutMs);

    return () => {
      disposed = true;
      dispose();
      subscription.unsubscribe();
    };
  }, [nextPath, navigate, waitTimeoutMs]);

  if (failed) {
    // Il redirect avviene subito: questo stato serve solo come fallback
    // visivo brevissimo se il timeout scatta e la navigate è in corso.
    return null;
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <SeoHead
        title="Accesso in corso — Erga"
        description="Completamento dell'accesso a Erga."
        path="/auth/callback"
        noindex
      />
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm">Completamento dell'accesso…</p>
      </div>
    </main>
  );
}
