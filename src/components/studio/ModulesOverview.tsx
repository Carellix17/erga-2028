import { Check, Dumbbell, Lock, MessageCircle, Mic, Play, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  /** Apre il pannello di caricamento per creare un nuovo percorso di studio. */
  onCreatePath?: () => void;
  /** Apre la sezione pratica per il percorso selezionato. */
  onOpenPratica?: (tab?: "esercizi" | "interrogazione" | "chat") => void;
}

/**
 * P24 — SCHERMATA 1: i moduli del corso.
 * Rettangoli cliccabili (come nel mockup approvato): titolo INTERO del modulo,
 * numero in una targa, stato (completato / riprendi / in generazione / da
 * sbloccare / apri) e barra di avanzamento per il modulo corrente o in generazione.
 * La logica (quali moduli esistono, quanto sono completi) arriva da StudioView.
 *
 * In coda alla lista vive il pulsante "Nuovo percorso di studio": stessa
 * pill-firma nera/bianca del bottone principale dell'app (Button variant
 * "default"), stessa entrata `animate-fade-up` delle altre foglie della
 * schermata (con un filo di ritardo, così arriva DOPO le schede dei moduli)
 * e le stesse micro-transizioni al tocco (`duration-200`, `active:scale`).
 */
export function ModulesOverview({ modules, onOpenModule, onCreatePath, onOpenPratica }: ModulesOverviewProps) {
  if (modules.length === 0 && !onCreatePath) return null;

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
              <span className="badge-chip bg-black text-white dark:bg-cream dark:text-black">Completato</span>
            );
          } else if (isCur) {
            badge = (
              <span className="badge-chip bg-subject-accent text-subject-accent-foreground">
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
                "interactive-card flex items-center gap-3.5 rounded-card bg-card border border-border px-4 py-4 text-left shadow-level-1",
                !isLocked && "hover:border-primary/30 hover:bg-surface-container-low",
                isCur && "border-subject-accent ring-2 ring-subject-accent",
                isLocked && "opacity-60 cursor-default",
              )}
            >
              {/* Targa numero */}
              <span
                className={cn(
                  "flex-shrink-0 w-12 h-12 rounded-button flex items-center justify-center font-display font-extrabold text-base transition-colors duration-200",
                  isDone && "bg-subject-accent text-subject-accent-foreground",
                  isCur && "bg-subject-accent text-subject-accent-foreground",
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
                        isGen ? "bg-subject-accent" : "bg-subject-accent",
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

      {/* 🎯 Pratica del percorso */}
      {onOpenPratica && modules.length > 0 && (
        <div className="mt-8 space-y-3 animate-fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Pratica del percorso
            </p>
            <h3 className="font-display text-lg font-bold text-foreground">
              Mettiti alla prova
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onOpenPratica("esercizi")}
              className="interactive-card flex items-start gap-3 rounded-card bg-card border border-border p-4 text-left shadow-level-1 hover:border-primary/40 hover:bg-surface-container-low transition-all active:scale-[0.98]"
            >
              <span className="w-10 h-10 rounded-button bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-sm text-foreground">Esercizi Mirati</span>
                <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                  Quiz e domande su misura
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPratica("interrogazione")}
              className="interactive-card flex items-start gap-3 rounded-card bg-card border border-border p-4 text-left shadow-level-1 hover:border-primary/40 hover:bg-surface-container-low transition-all active:scale-[0.98]"
            >
              <span className="w-10 h-10 rounded-button bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-sm text-foreground">Interrogazione</span>
                <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                  Simulazione vocale o domande
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPratica("chat")}
              className="interactive-card flex items-start gap-3 rounded-card bg-card border border-border p-4 text-left shadow-level-1 hover:border-primary/40 hover:bg-surface-container-low transition-all active:scale-[0.98]"
            >
              <span className="w-10 h-10 rounded-button bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-sm text-foreground">Chat col Tutor</span>
                <span className="block text-xs text-muted-foreground mt-0.5 leading-snug">
                  Spiegazioni e chiarimenti
                </span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ➕ Nuovo percorso: la pill-firma dell'app in coda alla lista dei moduli.
          Entra con la stessa dissolvenza-in-salita delle altre foglie, appena
          dopo le schede (delay), e reagisce al tocco come loro. */}
      {onCreatePath && (
        <div
          className="mt-5 animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <Button
            type="button"
            size="lg"
            onClick={onCreatePath}
            aria-label="Crea un nuovo percorso di studio"
            className={cn(
              "w-full rounded-full transition-all duration-200",
              "shadow-level-1 hover:shadow-level-2 active:scale-[0.985]",
            )}
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuovo percorso di studio
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Carica un PDF o un link: l'AI costruisce un nuovo corso di mini-lezioni.
          </p>
        </div>
      )}
    </div>
  );
}
