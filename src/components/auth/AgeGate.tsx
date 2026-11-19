import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { ageBlockActive, rememberAgeBlock } from "@/lib/ageBlock";
import {
  PARENT_ACK_LABEL,
  calendarDateInRome,
  completedYears,
  showsParentCheckbox,
} from "../../../supabase/functions/_shared/ageCheck";

type GateState = "passed" | "required" | "legacy_block" | "blocked" | "needs_parent_ack";

const BLOCK_TITLE = "Erga è per chi ha almeno 14 anni";
const BLOCK_BODY = "Ci dispiace, per ora non puoi iscriverti. Quando avrai 14 anni ti aspettiamo!";
const BLOCK_NO_DATA = "Non abbiamo salvato nessun tuo dato.";

/**
 * Schermata obbligatoria dopo l'accesso, prima di qualsiasi funzione.
 * La data di nascita parte verso il server e non resta nel browser, se non
 * per i 24 ore di blocco dopo un rifiuto: in quel caso si salva solo l'orario.
 */
export function AgeGate({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [phase, setPhase] = useState<"loading" | "form" | "blocked" | "legacy" | "error" | "passed">("loading");
  const [lockedForDay, setLockedForDay] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [parentAck, setParentAck] = useState(false);
  const [forceAck, setForceAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const today = calendarDateInRome(new Date());
  const years = birthDate ? completedYears(birthDate, today) : null;
  const showAck = forceAck || showsParentCheckbox(years);

  useEffect(() => {
    if (!showAck) setParentAck(false);
  }, [showAck]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await edgeFetch<{ state?: GateState }>("age-gate", { action: "status" });
        if (cancelled) return;
        if (data.state === "passed") {
          setPhase("passed");
          return;
        }
        if (data.state === "legacy_block") {
          setPhase("legacy");
          return;
        }
        if (ageBlockActive(window.localStorage, Date.now())) {
          setLockedForDay(true);
          setPhase("blocked");
          return;
        }
        setPhase("form");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!birthDate || submitting) return;
    if (showAck && !parentAck) {
      setFormError("Per continuare serve la conferma.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const data = await edgeFetch<{ state?: GateState }>("age-gate", {
        action: "submit",
        birthDate,
        parentAck: showAck && parentAck,
      });
      if (data.state === "passed") {
        setBirthDate("");
        setPhase("passed");
        return;
      }
      if (data.state === "needs_parent_ack") {
        setForceAck(true);
        setFormError("Per continuare serve la conferma dei tuoi genitori.");
        return;
      }
      if (data.state === "legacy_block") {
        setBirthDate("");
        setPhase("legacy");
        return;
      }
      rememberAgeBlock(window.localStorage, Date.now());
      setBirthDate("");
      setLockedForDay(true);
      setPhase("blocked");
    } catch {
      setFormError("Non riusciamo a controllare la data. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "passed") return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        {phase === "loading" && (
          <p className="text-base text-foreground" role="status">Controllo dell'età…</p>
        )}

        {phase === "error" && (
          <div className="space-y-4">
            <h1 className="font-display text-2xl text-foreground">Non riusciamo a controllare l'età</h1>
            <p className="text-base leading-6 text-muted-foreground">
              Senza questo controllo Erga non si apre. Riprova tra poco.
            </p>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="filled" className="min-h-11" onClick={() => { setPhase("loading"); setAttempt((n) => n + 1); }}>
                Riprova
              </Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => void logout()}>
                Esci
              </Button>
            </div>
          </div>
        )}

        {(phase === "blocked" || phase === "legacy") && (
          <div className="space-y-3">
            <h1 className="font-display text-2xl text-foreground">{BLOCK_TITLE}</h1>
            <p className="text-base leading-6 text-foreground">{BLOCK_BODY}</p>
            <p className="text-base leading-6 text-foreground">{BLOCK_NO_DATA}</p>
            {phase === "blocked" && lockedForDay && (
              <p className="text-base leading-6 text-muted-foreground">
                Per oggi il controllo è chiuso. Puoi riprovare tra 24 ore.
              </p>
            )}
            <Button type="button" variant="outline" className="mt-2 min-h-11 w-full" onClick={() => void logout()}>
              Esci
            </Button>
          </div>
        )}

        {phase === "form" && (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-foreground">Prima di entrare</h1>
              <p className="text-base leading-6 text-muted-foreground">
                Ci serve la data di nascita solo per controllare che tu abbia almeno 14 anni. Non la conserviamo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth-date" className="text-base">Data di nascita</Label>
              <Input
                id="birth-date"
                name="bday"
                type="date"
                required
                autoComplete="bday"
                value={birthDate}
                min="1906-01-01"
                max={today || undefined}
                onChange={(event) => setBirthDate(event.target.value)}
                className="h-12 text-base"
                style={{ colorScheme: "dark" }}
              />
            </div>
            {showAck && (
              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base leading-6">
                <Checkbox
                  checked={parentAck}
                  onCheckedChange={(value) => setParentAck(value === true)}
                  aria-required="true"
                  className="mt-1 h-6 w-6"
                />
                <span>{PARENT_ACK_LABEL}</span>
              </label>
            )}
            {formError && (
              <p role="alert" className="text-base text-foreground">{formError}</p>
            )}
            <Button
              type="submit"
              variant="filled"
              className="min-h-11 w-full"
              disabled={submitting || !birthDate || (showAck && !parentAck)}
            >
              {submitting ? "Controllo…" : "Continua"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => void logout()}>
              Esci
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
