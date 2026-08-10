import { Check, Lock, Play, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleState = "done" | "cur" | "gen" | "lock" | "ready";

export interface ModuleCardData {
  index: number;
  title: string;
  doneCount: number;
  total: number;
  state: ModuleState;
  /** Solo per lo stato "gen": percentuale di generazione (0-100). */
  genPercent?: number;
}

interface ModulesOverviewProps {
  modules: ModuleCardData[];
  onOpenModule: (moduleIndex: number) => void;
}

/**
 * 🌲 P24 — SCHERMATA 1: i moduli del corso.
 * Rettangoli cliccabili (come nel mockup approvato): titolo INTERO del modulo,
 * numero in una targa, stato (completato / riprendi / in generazione / da
 * sbloccare / apri) e barra di avanzamento per il modulo corrente o in generazione.
 * La logica (quali moduli esistono, quanto sono completi) arriva da StudioView.
 */
export function ModulesOverview({ modules, onOpenModule }: ModulesOverviewProps) {
  if (modules.length === 0) return null;

  return (
    <div className="px-4 pt-5 pb-32 animate-fade-up">
      <div className="flex flex-col gap-3">
        {modules.map((m) => {
          const isLocked = m.state === "lock";
          const isGen = m.state === "gen";
          const isDone = m.state === "done";
          const isCur = m.state === "cur";
          const pct = m.total > 0 ? Math.round((m.doneCount / m.total) * 100) : 0;

          let badge: React.ReactNode;
          if (isDone) {
            badge = (
              <span className="badge-chip bg-success text-success-foreground">Completato</span>
            );
          } else if (isCur) {
            badge = (
              <span className="badge-chip bg-lime text-[#0C1F12]">
                <Play className="w-3 h-3" fill="currentColor" strokeWidth={0} />
                Riprendi
              </span>
            );
          } else if (isGen) {
            badge = (
              <span className="badge-chip bg-surface-container-high text-muted-foreground">
                <RefreshCw className="w-3 h-3 animate-spin" />
                In generazione
              </span>
            );
          } else if (isLocked) {
            badge = <span className="badge-chip bg-surface-container-high text-muted-foreground">Da sbloccare</span>;
          } else {
            badge = <span className="badge-chip bg-surface-container-high text-foreground">Apri</span>;
          }

          const subtitle = isDone
            ? `${m.doneCount} di ${m.total} lezioni`
            : isCur
              ? `${m.doneCount} di ${m.total} lezioni · continua da dove eri`
              : isGen
                ? "Stiamo costruendo le lezioni…"
                : isLocked
                  ? "Completa il modulo precedente"
                  : `${m.doneCount} di ${m.total} lezioni`;

          return (
            <button
              key={m.index}
              type="button"
              disabled={isLocked}
              onClick={() => onOpenModule(m.index)}
              aria-label={`Modulo ${m.index + 1}: ${m.title}`}
              className={cn(
                "flex items-center gap-3.5 rounded-[22px] bg-card border border-border px-4 py-4 text-left transition-all duration-200",
                "shadow-level-1",
                !isLocked && "hover:border-primary/30 hover:bg-surface-container-low active:scale-[0.985]",
                isCur && "border-lime ring-2 ring-lime/25",
                isLocked && "opacity-60 cursor-default",
              )}
            >
              {/* Targa numero */}
              <span
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-[16px] flex items-center justify-center font-display font-extrabold text-base transition-colors duration-200",
                  isDone && "bg-success text-success-foreground",
                  isCur && "bg-lime text-[#0C1F12]",
                  isGen && "bg-surface-container-high text-muted-foreground",
                  isLocked && "bg-surface-container-high text-muted-foreground",
                  !isDone && !isCur && !isGen && !isLocked && "bg-primary text-primary-foreground",
                )}
              >
                {isDone ? (
                  <Check className="w-5 h-5" strokeWidth={2.5} />
                ) : isLocked ? (
                  <Lock className="w-5 h-5" strokeWidth={1.9} />
                ) : (
                  m.index + 1
                )}
              </span>

              {/* Testo */}
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold leading-snug text-foreground">
                  {m.title}
                </span>
                <span className="block text-xs text-muted-foreground mt-1 font-medium">
                  {subtitle}
                </span>
                {(isCur || isGen) && (
                  <span className="block mt-2.5 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <span
                      className={cn(
                        "block h-full rounded-full transition-all duration-500",
                        isGen ? "bg-lime" : "bg-success",
                      )}
                      style={{ width: `${isGen ? (m.genPercent ?? 0) : pct}%` }}
                    />
                  </span>
                )}
              </span>

              {/* Badge */}
              <span className="flex-shrink-0">{badge}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
