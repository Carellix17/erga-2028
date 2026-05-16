import { useState, useEffect } from "react";
import { Sparkles, BookOpen, Brain, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  isGenerating: boolean;
  currentStep: "analyzing" | "creating-index" | "generating-lessons" | "complete";
  totalLessons: number;
  generatedCount: number;
  fileName?: string;
}

const tips = [
  "L'AI sta leggendo i tuoi appunti… 📖",
  "Stiamo trovando i concetti chiave… 🔍",
  "Creiamo esercizi su misura per te… 🎯",
  "Quasi pronto, un attimo di pazienza… ⏳",
  "Il tuo percorso sta prendendo forma… ✨",
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

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.3) return targetProgress;
        return prev + diff * 0.08;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [targetProgress]);

  if (!isGenerating && currentStep !== "complete") return null;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 animate-fade-up">
      {/* Animated orb */}
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-[2rem] gradient-primary flex items-center justify-center shadow-level-3 animate-float">
          <Sparkles className="w-12 h-12 text-primary-foreground" />
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "6s" }}>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-secondary opacity-70" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "8s", animationDirection: "reverse" }}>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-tertiary opacity-60" />
        </div>
        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="56" fill="none" stroke="hsl(var(--outline-variant))" strokeWidth="3" opacity="0.3" />
          <circle
            cx="60" cy="60" r="56" fill="none"
            stroke="hsl(var(--primary))" strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - animatedProgress / 100)}`}
            className="transition-all duration-300"
          />
        </svg>
      </div>

      {/* Percentage */}
      <div className="text-center mb-6">
        <span className="text-4xl font-display font-bold text-foreground">
          {Math.round(animatedProgress)}%
        </span>
        {fileName && (
          <p className="body-small text-primary font-medium mt-1 bg-primary-container px-3 py-1 rounded-full inline-block">
            {fileName}
          </p>
        )}
      </div>

      {/* Steps */}
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
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500",
                isActive && "bg-primary-container scale-[1.02]",
                isComplete && "opacity-60",
                isPending && "opacity-30"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 flex-shrink-0",
                isActive && "bg-primary text-primary-foreground shadow-level-1",
                isComplete && "bg-success text-success-foreground",
                isPending && "bg-surface-container-highest text-muted-foreground"
              )}>
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "label-large leading-tight",
                  isActive && "text-primary font-semibold",
                  isComplete && "text-success"
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
          <p className="mt-6 text-center body-small text-muted-foreground/90 max-w-[300px] px-4 py-3 rounded-2xl bg-surface-container-highest/60 border border-outline-variant/20">
            L'AI sta elaborando testo e immagini. Potrebbe volerci un po'.
            <br />
            Puoi anche uscire dall'app o bloccare lo schermo: non perderai i progressi e ti avviseremo quando è pronto! ✨
          </p>
        </>
      )}
    </div>
  );
}
