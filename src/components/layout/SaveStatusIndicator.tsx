import { CloudOff } from "lucide-react";
import { useSaveStatus } from "@/contexts/SaveStatusContext";
import { cn } from "@/lib/utils";

// P24 — "Erga ricorda", non "Erga sta salvando":
// saving → puntino neutro che respira · saved → puntino che svanisce · error → visibile.
// Idle → nulla: la barra resta quasi invisibile.
export function SaveStatusIndicator() {
  const { status, errorMessage } = useSaveStatus();
  if (status === "idle") return null;

  const label =
    status === "error"
      ? errorMessage ?? "Errore salvataggio"
      : status === "saving"
        ? "Salvataggio…"
        : "Progressi salvati";

  return (
    <span
      role="status"
      aria-live="polite"
      title={label}
      className={cn(
        "inline-flex items-center justify-center shrink-0",
        status === "saving" && "w-2.5 h-2.5 rounded-full bg-foreground animate-pulse",
        status === "saved" && "w-2.5 h-2.5 rounded-full bg-success/70 animate-fade-in",
        status === "error" && "w-5 h-5 rounded-full bg-error-container text-destructive"
      )}
    >
      {status === "error" && <CloudOff className="w-3 h-3" />}
    </span>
  );
}

// Compatibilità: il puntino mobile è assorbito da SaveStatusIndicator (P24).
export function SaveStatusDot() {
  return null;
}
