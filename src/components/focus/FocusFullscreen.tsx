import { Pause, Play, RotateCcw, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocus, formatMMSS, FOCUS_DURATIONS } from "@/contexts/FocusContext";
import { cn } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  focus: "Focus",
  short: "Pausa breve",
  long: "Pausa lunga",
};

export function FocusFullscreen() {
  const {
    remaining,
    phase,
    cycle,
    isRunning,
    task,
    awaitingChoice,
    toggleRun,
    restart,
    end,
    minimize,
    nextPhase,
    extend,
  } = useFocus();

  const total = FOCUS_DURATIONS[phase];
  const progress = 1 - remaining / total;
  const size = 260;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * progress;

  return (
    <div className="fixed inset-0 z-[100] bg-[#FCFCFC] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {PHASE_LABEL[phase]} · Ciclo {Math.min(cycle + (phase === "focus" ? 1 : 0), 4)}/4
          </p>
          {task && <p className="text-lg font-display font-semibold mt-0.5">{task.label}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={minimize}
          aria-label="Riduci timer"
          className="rounded-full"
        >
          <Minus className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="hsl(var(--surface-container-high))"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              fill="none"
              className="transition-[stroke-dasharray] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              "font-display font-bold tabular-nums tracking-tight text-foreground",
              "text-6xl",
            )}>
              {formatMMSS(remaining)}
            </span>
            <span className="text-xs uppercase tracking-wider text-muted-foreground mt-2">
              {PHASE_LABEL[phase]}
            </span>
          </div>
        </div>

        {awaitingChoice ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <p className="text-center text-sm text-muted-foreground">
              {phase === "focus" ? "Fase di focus completata." : "Pausa terminata."}
            </p>
            <div className="flex gap-2 w-full">
              <Button className="flex-1 rounded-2xl" onClick={nextPhase}>
                {phase === "focus" ? "Inizia pausa" : "Torna al focus"}
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={extend}>
                +25 min
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={end}
              className="text-muted-foreground"
            >
              Concludi sessione
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={restart}
                aria-label="Riavvia"
                className="w-12 h-12 rounded-full"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button
                onClick={toggleRun}
                aria-label={isRunning ? "Pausa" : "Riprendi"}
                className="w-16 h-16 rounded-full shadow-level-2"
              >
                {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={minimize}
                aria-label="Riduci"
                className="w-12 h-12 rounded-full"
              >
                <Minus className="w-5 h-5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={end}
              className="text-muted-foreground text-sm"
            >
              Concludi sessione
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}