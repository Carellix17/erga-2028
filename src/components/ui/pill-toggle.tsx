import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 🎛️ LA PILLOLA-INTERRUTTORE di casa (kit grafico P9a).
 *
 * Il gesto grafico più ripetuto dell'app ("scegli una cosa fra poche"):
 * prima era riscritto a mano in almeno 6 punti diversi con piccole varianti.
 * Ora vive qui, in due vesti:
 *
 *  - variant="loose"  → pillole libere (modi della verifica, voto obiettivo…)
 *  - variant="track"  → pillole su binario grigio (verifica/compito, tabs)
 *
 * Attive = nere, spente = bianche/grigie, tocco = accenno di scala.
 */
export interface PillToggleOption<T extends string | number> {
  value: T;
  label: string;
}

interface PillToggleProps<T extends string | number> {
  options: PillToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "loose" | "track";
  /** sm = compatte (h-9), md = comode (h-10). */
  size?: "sm" | "md";
  /** Le pillole si allargano a riempire la riga. */
  grow?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function PillToggle<T extends string | number>({
  options,
  value,
  onChange,
  variant = "loose",
  size = "md",
  grow = false,
  className,
  ...aria
}: PillToggleProps<T>) {
  const track = variant === "track";
  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cn(
        track
          ? "grid gap-2 p-1 rounded-full bg-surface-container"
          : cn("flex flex-wrap", size === "sm" ? "gap-1.5" : "gap-2"),
        className,
      )}
      style={track ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full font-medium transition-all duration-300 ease-m3-emphasized active:scale-95",
              size === "sm" ? (track ? "h-9 text-sm" : "px-3 h-8 text-[11px]") : "h-10 text-sm",
              !track && size === "md" && "px-3",
              grow && "flex-1",
              track
                ? active
                  ? "bg-black text-white shadow-level-1"
                  : "text-slate-700 hover:text-foreground"
                : cn(
                    "border",
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-400",
                  ),
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
