import { useState, useEffect } from "react";
import { BookOpen, Brain, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  isGenerating: boolean;
  currentStep: "analyzing" | "creating-index" | "generating-lessons" | "complete";
  totalLessons: number;
  generatedCount: number;
  fileName?: string;
}

// 🌿 P21c ERGA OPAL: l'orbe coi satelliti è andato in pensione.
// Al suo posto "il contachilometri": un anello sottile con la percentuale
// grande al centro e la fila dei passi sotto. Il motore del caricamento
// (l'ago che non si ferma MAI) è intatto.

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
  // l'ago striscia in continuo; quando arrivano i dati veri, il paletto avanza
  // e la rincorsa riprende esattamente da dove si era fermata.
  const capProgress =
    currentStep === "analyzing" ? 33 :
    currentStep === "creating-index" ? 50 :
    currentStep === "generating-lessons" ? Math.min(97, 35 + (((generatedCount + 1) / Math.max(totalLessons, 1)) * 60)) :
    100;

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        const diff = targetProgress - prev;
        // Fase nuova di zecca → la barra riparte di scatto dal paletto giusto.
        if (diff < -0.3) return targetProgress;
        // Rincorsa verso i paletti reali (li serve il server): scattante.
        if (diff >= 0.3) return prev + diff * 0.08;
        // Strisciata continua verso il soffitto: asintotica, mai ferma a metà segmento.
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
                "flex items-center gap-3 px-4 py-3 rounded-[18px] transition-colors duration-500",
                isActive && "bg-surface-container-high",
                isComplete && "opacity-60",
                isPending && "opacity-40"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-500 flex-shrink-0",
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
