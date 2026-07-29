import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { stampSplashStart, splashElapsedMs } from "./splashState";

const TAGLINE = "Rebuild learning forever";

// I tre cancelli d'avvio condividono la scena: il cronometro vive in splashState.

/**
 * La scena: il quadratino scuro sui puntini fa capolino con un "pop", si stira
 * in orizzontale come il suggerimento di una tastiera che si espande, e dentro
 * si accendono una a una le lettere di "Rebuild learning forever".
 */
export function SplashScreen({ leaving = false }: { leaving?: boolean }) {
  stampSplashStart();
  // Se arriviamo da un cancello precedente (es. Index dopo Landing) la scena
  // non riparte dal quadratino: prosegue a sipario già aperto.
  const continued = splashElapsedMs() > 1100;

  const [expanded, setExpanded] = useState(continued);
  const [typed, setTyped] = useState(continued ? TAGLINE.length : 0);

  // Pop del quadratino (400ms) → piccola pausa → la capsula si stira.
  useEffect(() => {
    if (expanded) return;
    const t = window.setTimeout(() => setExpanded(true), 520);
    return () => window.clearTimeout(t);
  }, [expanded]);

  // Macchina da scrivere: la prima lettera si accende quando la capsula è quasi
  // aperta (~380ms), poi una lettera ogni 42ms. Le lettere sono TUTTE presenti
  // nel DOM ma invisibili: la larghezza della capsula resta ferma mentre il
  // testo si "accende" — niente scatti.
  useEffect(() => {
    if (!expanded || typed >= TAGLINE.length) return;
    const t = window.setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 380 : 42);
    return () => window.clearTimeout(t);
  }, [expanded, typed]);

  return (
    <div
      className={cn(
        "min-h-screen bg-dot-grid flex items-center justify-center transition-opacity duration-500 ease-out",
        leaving && "opacity-0",
      )}
      role="status"
      aria-label="Erga si sta preparando"
    >
      <div
        className="flex items-center overflow-hidden bg-slate-900 shadow-level-3"
        style={{
          height: expanded ? 52 : 40,
          maxWidth: expanded ? 360 : 40,
          borderRadius: expanded ? 26 : 16,
          transition:
            "max-width 560ms cubic-bezier(0.2, 0.9, 0.25, 1.05), height 560ms cubic-bezier(0.2, 0.9, 0.25, 1.05), border-radius 560ms cubic-bezier(0.2, 0.9, 0.25, 1.05)",
          animation: continued
            ? undefined
            : "erga-pop 420ms cubic-bezier(0.2, 0.9, 0.3, 1.25) both",
        }}
      >
        <p className="whitespace-nowrap px-5 font-display font-semibold text-[15px] tracking-tight text-white/95 select-none">
          {TAGLINE.split("").map((ch, i) => (
            <span
              key={i}
              style={{
                opacity: i < typed ? 1 : 0,
                transition: "opacity 90ms linear",
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
