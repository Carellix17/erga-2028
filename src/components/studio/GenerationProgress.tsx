import { useState, useEffect } from "react";
import { BookOpen, Brain, Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  isGenerating: boolean;
  currentStep: "analyzing" | "creating-index" | "generating-lessons" | "complete";
  totalLessons: number;
  generatedCount: number;
  fileName?: string;
  /** P24 — modalità pannello: la generazione vive DENTRO lo spazio
   *  (sotto l'eroe o sopra la lista), non in una schermata sostitutiva. */
  compact?: boolean;
}

// La generazione è un processo INTERNO all'ambiente.
// In modalità compatta niente anello gigante: un pannello con la barra,
// le quattro fasi in fila e il conteggio — mentre le lezioni restano in vista.

const tips = [
  "L'AI sta leggendo i tuoi appunti…",
  "Stiamo trovando i concetti chiave…",
  "Creiamo esercizi su misura per te…",
  "Quasi pronto, un attimo di pazienza…",
  "Il tuo percorso sta prendendo forma…",
];

const steps = [
  { id: "analyzing", label: "Analisi contenuti", sublabel: "Lettura e comprensione", icon: Brain },
  { id: "creating-index", label: "Struttura percorso", sublabel: "Organizzazione argomenti", icon: BookOpen },
  { id: "generating-lessons", label: "Creazione lezioni", sublabel: "Esercizi e spiegazioni", icon: Zap },
  { id: "complete", label: "Tutto pronto!", sublabel: "Buono studio", icon: Check },
] as const;

export function GenerationProgress({
  isGenerating,
  currentStep,
  totalLessons,
  generatedCount,
  fileName,
  compact = false,
}: GenerationProgressProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [dots, setDots] = useState("");

  // Rotate tips
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 3500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Animated dots
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Progress animation
  const targetProgress =
    currentStep === "analyzing" ? 15 :
    currentStep === "creating-index" ? 35 :
    currentStep === "generating-lessons" ? 35 + ((generatedCount / Math.max(totalLessons, 1)) * 60) :
    100;

  // 🌊 P10c CARICAMENTO UNICO: la barra non si ferma MAI tra un paletto reale
  // e l'altro. Ogni fase ha un "soffitto" (il paletto successivo) verso cui
  // l'ago striscia in continuo; quando arrivano i dati veri, il paletto avanza.
  const capProgress =
    currentStep === "analyzing" ? 33 :
    currentStep === "creating-index" ? 50 :
    currentStep === "generating-lessons" ? Math.min(97, 35 + (((generatedCount + 1) / Math.max(totalLessons, 1)) * 60)) :
    100;

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        const diff = targetProgress - prev;
        if (diff < -0.3) return targetProgress;
        if (diff >= 0.3) return prev + diff * 0.08;
        if (prev < capProgress) {
          const nudge = Math.max(0.015, (capProgress - prev) * 0.004);
          return Math.min(capProgress, prev + nudge);
        }
        return prev;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [targetProgress, capProgress]);

  if (!isGenerating && currentStep !== "complete") return null;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  // ─────────────────────────── PANNELLO COMPATTO (P24) ───────────────────────────
  if (compact) {
    return (
      <div className="mx-4 mt-4 rounded-[24px] bg-card border border-border shadow-level-1 p-5 animate-fade-up">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground leading-snug">
              Erga sta trasformando il tuo materiale
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {fileName ? `${fileName} · ` : ""}le nuove lezioni entrano qui sotto
            </p>
          </div>
          <span className="text-lg font-extrabold tabular-nums text-primary flex-shrink-0">
            {Math.round(animatedProgress)}%
          </span>
        </div>

        <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>

        {/* Fasi in fila */}
        <div className="grid grid-cols-4 gap-1.5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isComplete = index < currentStepIndex || currentStep === "complete";
            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors duration-300",
                  isActive && "bg-primary text-primary-foreground",
                  !isActive && "bg-secondary text-muted-foreground",
                  isComplete && !isActive && "opacity-70"
                )}
              >
                {isComplete && !isActive ? (
                  <Check className="w-3.5 h-3.5 text-tertiary" strokeWidth={2.5} />
                ) : (
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.9} />
                )}
                <span className="text-[10px] font-semibold leading-tight">
                  {step.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>

        {currentStep === "generating-lessons" && totalLessons > 0 && (
          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            {generatedCount} di {totalLessons} lezioni pronte{dots}
          </p>
        )}
        {currentStep !== "complete" && currentStep !== "generating-lessons" && (
          <p className="mt-3 text-center text-xs text-muted-foreground min-h-[1rem]">
            {tips[tipIndex]}
          </p>
        )}
      </div>
    );
  }

  // ─────────────────────────── VERSIONE COMPLETA (legacy) ───────────────────────────
  const R = 70;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 animate-fade-up">
      {/* Il contachilometri: anello sottile + numero grande */}
      <div className="relative w-40 h-40 mb-6">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
          <circle
            cx="80" cy="80" r={R} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - animatedProgress / 100)}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-display font-extrabold tracking-tight text-foreground tabular-nums">
            {Math.round(animatedProgress)}%
          </span>
        </div>
      </div>

      {fileName && (
        <p className="text-xs text-foreground font-medium mb-6 bg-secondary px-3 py-1.5 rounded-full max-w-[85vw] truncate">
          {fileName}
        </p>
      )}

      {/* Passi */}
      <div className="w-full max-w-xs space-y-1.5 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isComplete = index < currentStepIndex || currentStep === "complete";
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-[18px] transition-colors duration-300",
                isActive && "bg-surface-container-high",
                isComplete && "opacity-60",
                isPending && "opacity-40"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 flex-shrink-0",
                isActive && "bg-primary text-primary-foreground",
                isComplete && "bg-secondary",
                isPending && "bg-secondary text-muted-foreground/60"
              )}>
                {isComplete ? (
                  <Check className="w-4 h-4 text-tertiary" strokeWidth={2.5} />
                ) : (
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "label-large leading-tight",
                  isActive && "text-foreground font-semibold",
                  isComplete && "text-muted-foreground"
                )}>
                  {step.label}
                  {isActive && currentStep !== "complete" && dots}
                </p>
                {isActive && step.id === "generating-lessons" && totalLessons > 0 && (
                  <p className="body-small text-muted-foreground">
                    {generatedCount}/{totalLessons} lezioni
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rotating tip */}
      {currentStep !== "complete" && (
        <>
          <p
            key={tipIndex}
            className="text-center body-medium text-muted-foreground animate-fade-up max-w-[260px]"
          >
            {tips[tipIndex]}
          </p>
          <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed max-w-[300px] px-4 py-3 rounded-[18px] bg-card">
            L'AI sta elaborando il tuo percorso personalizzato.
            <br />
            Puoi anche uscire dall'app: ti avvisiamo con una notifica appena è pronto.
          </p>
        </>
      )}
    </div>
  );
}
