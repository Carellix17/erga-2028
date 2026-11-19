import { useState } from "react";

export const AI_FOOTNOTE =
  "Le risposte sono generate dall'intelligenza artificiale e possono contenere errori.";

export const AI_FIRST_OPEN =
  "Stai usando un assistente basato sull'intelligenza artificiale, non una persona. Controlla sempre le risposte con il libro o con l'insegnante.";

const DISMISS_KEY = "erga.aiAct.chatNoticeDismissed";

export function aiNoticeDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAiNotice(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* La chiusura vale almeno per questa visita. */
  }
}

export function AiActFootnote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm leading-5 text-muted-foreground ${className}`.trim()}>
      {AI_FOOTNOTE}
    </p>
  );
}

/** Messaggio alla prima apertura della chat. Si chiude una volta sola, su questo browser. */
export function AiActFirstOpen() {
  const [open, setOpen] = useState(() => !aiNoticeDismissed());
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="ai-act-first-open"
      className="mx-3 mt-3 rounded-lg border border-border bg-card p-4"
    >
      <p id="ai-act-first-open" className="text-base leading-6 text-foreground">
        {AI_FIRST_OPEN}
      </p>
      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center rounded-full border border-foreground/40 px-4 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => {
          dismissAiNotice();
          setOpen(false);
        }}
      >
        Chiudi
      </button>
    </div>
  );
}
