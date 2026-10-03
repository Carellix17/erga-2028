import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 🎛️ PERCORSI 2.0 — IL GUSCIO COMUNE DEI WIDGET.
 * Card coerente col resto della lezione: titolo, eventuale didascalia
 * dell'AI, area grafica, cursori e letture numeriche. Accessibile:
 * cursori nativi (funzionano da tastiera) con etichetta esplicita.
 */

export interface WidgetReadout {
  label: string;
  value: string;
}

interface WidgetShellProps {
  title: string;
  caption?: string;
  readouts?: WidgetReadout[];
  onReset?: () => void;
  children: ReactNode;
}

export function WidgetShell({ title, caption, readouts, onReset, children }: WidgetShellProps) {
  return (
    <div className="my-4 rounded-2xl border-2 border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <p className="title-small text-foreground">{title}</p>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-surface-container-high transition-colors"
            aria-label="Ripristina i valori iniziali"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {caption && (
        <p className="px-4 pb-2 text-sm text-muted-foreground leading-relaxed">{caption}</p>
      )}
      <div className="px-4">{children}</div>
      {readouts && readouts.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {readouts.map((r) => (
            <span
              key={r.label}
              className="inline-flex items-baseline gap-1.5 rounded-xl bg-surface-container px-2.5 py-1"
            >
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="font-mono text-sm font-medium text-foreground">{r.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface WidgetSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

/** Cursore con etichetta, valore corrente e unità di misura. */
export function WidgetSlider({ label, value, min, max, step, unit, onChange }: WidgetSliderProps) {
  const decimals = step < 1 ? (step < 0.1 ? 2 : 1) : 0;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-sm text-foreground">{label}</span>
        <span className={cn("font-mono text-xs font-medium text-muted-foreground")}>
          {value.toFixed(decimals)}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        className="w-full accent-primary cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
