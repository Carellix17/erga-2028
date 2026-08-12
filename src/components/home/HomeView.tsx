import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Minus,
  Plus,
  Timer,
  Zap,
} from "lucide-react";
import { useFocus, formatMMSS } from "@/contexts/FocusContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HomeViewProps {
  onOpenStudio: () => void;
  onOpenPratica: () => void;
}

/**
 * 🌲 P24 — LA HOME (dal disegno Excalidraw del Capo, mockup approvato):
 * titolo "Accresci la tua conoscenza", Area Studio (→ moduli), Pratica,
 * Pianificazione (in arrivo) e il TIMER del Focus a due stati:
 * - nessuna sessione: stepper −/+ minuti + "Avvia sessione" (apre il
 *   FocusSetupDialog esistente);
 * - sessione attiva: cronometro mm:ss, nome attività, Pausa/Riprendi, Termina.
 * Regole del restyling: token bosco, angoli arrotondati, superfici opache.
 */
export function HomeView({ onOpenStudio, onOpenPratica }: HomeViewProps) {
  const focus = useFocus();
  const { toast } = useToast();
  const [mins, setMins] = useState(30);

  const step = (d: number) => setMins((m) => Math.max(1, Math.min(120, m + d)));

  return (
    <div className="px-4 pt-6 pb-6 animate-fade-up">
      {/* ── Titolo ── */}
      <h1 className="font-display font-extrabold text-[26px] leading-[1.15] tracking-tight text-foreground">
        Accresci la tua <span className="text-tertiary">conoscenza</span>
      </h1>

      {/* ── Area Studio ── */}
      <button
        type="button"
        onClick={onOpenStudio}
        className="mt-5 w-full flex items-center gap-3.5 rounded-[22px] bg-card border border-border px-4 py-4 text-left shadow-level-1 transition-all duration-200 hover:border-primary/30 active:scale-[0.985]"
      >
        <span className="w-11 h-11 rounded-[15px] bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5" strokeWidth={1.9} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15.5px] font-bold text-foreground">Area Studio</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            I tuoi moduli e le tue lezioni
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-muted-foreground/60 flex-shrink-0" />
      </button>

      {/* ── Griglia: Pratica + Pianificazione ── */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onOpenPratica}
          className="rounded-[18px] bg-card border border-border p-3.5 flex flex-col items-start gap-1.5 text-left transition-all duration-200 hover:border-primary/30 active:scale-[0.98]"
        >
          <span className="w-9 h-9 rounded-[11px] bg-lime text-[#0C1F12] flex items-center justify-center mb-1">
            <Zap className="w-4 h-4" strokeWidth={2} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Allenati
          </span>
          <span className="block text-[13.5px] font-bold text-foreground leading-tight">Pratica</span>
          <span className="text-[10.5px] text-muted-foreground leading-snug">
            Esercizi e interrogazioni
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            toast({ title: "Pianificazione", description: "In arrivo: presto pianificherai qui la tua settimana." })
          }
          className="rounded-[18px] bg-card border border-dashed border-border p-3.5 flex flex-col items-start gap-1.5 text-left opacity-80 transition-all duration-200 active:scale-[0.98]"
        >
          <span className="w-9 h-9 rounded-[11px] bg-secondary text-tertiary flex items-center justify-center mb-1">
            <CalendarDays className="w-4 h-4" strokeWidth={1.9} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            In arrivo
          </span>
          <span className="block text-[13.5px] font-bold text-foreground leading-tight">
            Pianificazione
          </span>
          <span className="text-[10.5px] text-muted-foreground leading-snug">work in progress</span>
        </button>
      </div>

      {/* ── Card Timer (Focus): due stati ── */}
      <div
        className={cn(
          "mt-3 rounded-[22px] bg-card border p-4 transition-all duration-200",
          focus.isActive ? "border-lime ring-2 ring-lime/20" : "border-border",
        )}
      >
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <span
            className={cn(
              "text-[10.5px] font-bold uppercase tracking-[0.12em]",
              focus.isActive ? "text-tertiary" : "text-muted-foreground",
            )}
          >
            {focus.isActive ? "Sessione focus in corso" : "Timer"}
          </span>
          {focus.isActive && <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />}
        </div>

        {!focus.isActive ? (
          <>
            {/* Stato fermo: stepper + Avvia sessione */}
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Diminuisci di un minuto"
                className="w-9 h-9 rounded-full border border-border bg-secondary text-foreground flex items-center justify-center transition-transform duration-150 active:scale-90"
              >
                <Minus className="w-4 h-4" strokeWidth={2.2} />
              </button>
              <div className="text-center min-w-[120px]">
                <span className="block text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                  {mins}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {mins === 1 ? "minuto" : "minuti"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Aumenta di un minuto"
                className="w-9 h-9 rounded-full border border-border bg-secondary text-foreground flex items-center justify-center transition-transform duration-150 active:scale-90"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
            <button
              type="button"
              onClick={focus.openSetup}
              className="mt-4 w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            >
              Avvia sessione
            </button>
          </>
        ) : (
          <>
            {/* Stato attivo: cronometro + controlli */}
            <div className="text-center mt-2">
              <span className="block text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
                {formatMMSS(focus.remaining)}
              </span>
              {focus.task?.label && (
                <span className="block text-xs font-semibold text-tertiary mt-1 truncate px-6">
                  {focus.task.label}
                </span>
              )}
            </div>
            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={focus.toggleRun}
                className="flex-1 h-11 rounded-full bg-secondary text-foreground font-semibold text-sm transition-all duration-200 hover:bg-surface-container-high active:scale-[0.98]"
              >
                {focus.isRunning ? "Pausa" : "Riprendi"}
              </button>
              <button
                type="button"
                onClick={focus.end}
                className="flex-1 h-11 rounded-full bg-destructive text-destructive-foreground font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              >
                Termina
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
