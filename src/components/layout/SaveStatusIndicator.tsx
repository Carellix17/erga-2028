import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { useSaveStatus } from "@/contexts/SaveStatusContext";
import { cn } from "@/lib/utils";

export function SaveStatusIndicator() {
  const { status, errorMessage } = useSaveStatus();

  if (status === "idle") return null;

  const config = {
    saving: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      label: "Salvataggio…",
      className: "bg-surface-container text-muted-foreground",
    },
    saved: {
      icon: <Check className="w-3.5 h-3.5" />,
      label: "Progressi salvati",
      className: "bg-success-container text-success",
    },
    error: {
      icon: <CloudOff className="w-3.5 h-3.5" />,
      label: errorMessage ?? "Errore salvataggio",
      className: "bg-error-container text-destructive",
    },
  } as const;

  const { icon, label, className } = config[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full label-small font-medium animate-fade-up transition-all duration-300",
        className
      )}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

export function SaveStatusDot() {
  const { status, errorMessage } = useSaveStatus();
  if (status === "idle") return null;
  const color =
    status === "saving" ? "bg-muted-foreground animate-pulse"
    : status === "saved" ? "bg-success"
    : "bg-destructive";
  return (
    <span
      className={cn("sm:hidden inline-block w-2 h-2 rounded-full", color)}
      aria-label={status === "error" ? errorMessage ?? "Errore" : status === "saving" ? "Salvataggio" : "Salvato"}
      title={status === "error" ? errorMessage ?? "Errore" : status === "saving" ? "Salvataggio" : "Salvato"}
    />
  );
}