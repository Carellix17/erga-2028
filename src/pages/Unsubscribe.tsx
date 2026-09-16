import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SeoHead } from "@/components/SeoHead";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type Status =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "invalid"; reason: string }
  | { kind: "already" }
  | { kind: "error"; message: string }
  | { kind: "success" };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus({ kind: "invalid", reason: "Link mancante o non valido." });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (response.ok && data.valid) {
          setStatus({ kind: "valid" });
        } else if (
          data.alreadyUsed ||
          data.reason === "already_unsubscribed"
        ) {
          setStatus({ kind: "already" });
        } else {
          setStatus({
            kind: "invalid",
            reason: data.error || "Il link non è valido o è scaduto.",
          });
        }
      } catch (error) {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Non riusciamo a verificare il link. Riprova tra poco.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setConfirming(true);
    try {
      const { error } = await supabase.functions.invoke(
        "handle-email-unsubscribe",
        {
          body: { token },
        }
      );

      if (error) {
        throw error;
      }

      setStatus({ kind: "success" });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Qualcosa è andato storto. Riprova tra poco.",
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Disiscrizione email — Erga"
        description="Gestisci le tue preferenze di ricezione email da Erga."
        path="/unsubscribe"
      />
      <main className="min-h-screen w-full flex items-center justify-center px-6 py-12 bg-background">
        <section className="w-full max-w-md bg-card rounded-[28px] border border-border p-8 shadow-level-1 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-6">
            <Mail className="w-7 h-7 text-secondary-foreground" strokeWidth={1.75} />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground mb-2">
            Preferenze email
          </h1>

          <StatusContent
            status={status}
            onConfirm={handleConfirm}
            confirming={confirming}
          />
        </section>
      </main>
    </>
  );
}

function StatusContent({
  status,
  onConfirm,
  confirming,
}: {
  status: Status;
  onConfirm: () => void;
  confirming: boolean;
}) {
  switch (status.kind) {
    case "loading":
      return (
        <>
          <p className="text-muted-foreground mb-6">Stiamo verificando il link…</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </>
      );

    case "valid":
      return (
        <>
          <p className="text-muted-foreground mb-6">
            Confermi di voler disiscriverti dalle email di Erga?
            <br />
            <span className="text-sm">
              Riceverai comunque email legate all'accesso e alla sicurezza del tuo account.
            </span>
          </p>
          <Button
            onClick={onConfirm}
            disabled={confirming}
            className="w-full rounded-button"
          >
            {confirming ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Conferma disiscrizione"
            )}
          </Button>
        </>
      );

    case "already":
      return (
        <>
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Già disiscritto</span>
          </div>
          <p className="text-muted-foreground">
            Questa preferenza era già stata registrata. Non riceverai altre email promozionali da Erga.
          </p>
        </>
      );

    case "invalid":
      return (
        <>
          <div className="flex items-center justify-center gap-2 text-destructive mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Link non valido</span>
          </div>
          <p className="text-muted-foreground">{status.reason}</p>
        </>
      );

    case "error":
      return (
        <>
          <div className="flex items-center justify-center gap-2 text-destructive mb-2">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Errore</span>
          </div>
          <p className="text-muted-foreground">{status.message}</p>
        </>
      );

    case "success":
      return (
        <>
          <div className="flex items-center justify-center gap-2 text-success mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Disiscrizione completata</span>
          </div>
          <p className="text-muted-foreground">
            Non riceverai più email di aggiornamento da Erga. Le comunicazioni relative al tuo account continueranno a funzionare normalmente.
          </p>
        </>
      );

    default:
      return null;
  }
}
