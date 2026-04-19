import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Lightbulb, BookOpen, Dumbbell, Trophy, CheckCircle2, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { fireCelebration, fireStarBurst } from "@/lib/confetti";

interface ExplanationPart {
  part_title: string;
  content: string;
  image_description?: string;
  image_url?: string;
}

interface FullscreenLessonProps {
  lesson: {
    id: string;
    title: string;
    concept: string;
    explanation: string;
    example?: string;
    exercises?: Exercise[];
    duration: number;
  };
  lessonNumber: number;
  totalLessons: number;
  onClose: () => void;
  onComplete: () => void;
  isLastLesson: boolean;
}

type StepType = "concept" | "explanation_part" | "example" | "exercise" | "summary";

interface Step {
  type: StepType;
  exerciseIndex?: number;
  explanationPartIndex?: number;
}

function parseExplanationParts(explanation: string): ExplanationPart[] {
  try {
    const parsed = JSON.parse(explanation);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].part_title) {
      return parsed;
    }
  } catch { /* not JSON */ }

  const lines = explanation.split(/\n/).filter(l => l.trim());
  if (lines.length <= 1) {
    return [{ part_title: "Spiegazione", content: explanation }];
  }
  
  const parts: ExplanationPart[] = [];
  let currentContent = "";
  let partIndex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentContent) {
        parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
        partIndex++;
      }
      currentContent = trimmed.replace(/^[•\-*]\s*/, "");
    } else {
      currentContent += (currentContent ? "\n" : "") + trimmed;
    }
  }
  if (currentContent) {
    parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
  }
  
  return parts.length > 0 ? parts : [{ part_title: "Spiegazione", content: explanation }];
}

function buildSteps(lesson: FullscreenLessonProps["lesson"], explanationParts: ExplanationPart[]): Step[] {
  const steps: Step[] = [{ type: "concept" }];
  explanationParts.forEach((_, i) => {
    steps.push({ type: "explanation_part", explanationPartIndex: i });
  });
  if (lesson.example) steps.push({ type: "example" });
  const exercises = lesson.exercises || [];
  exercises.forEach((_, i) => {
    steps.push({ type: "exercise", exerciseIndex: i });
  });
  if (exercises.length > 0) steps.push({ type: "summary" });
  return steps;
}

export function FullscreenLesson({
  lesson, lessonNumber, totalLessons, onClose, onComplete, isLastLesson,
}: FullscreenLessonProps) {
  const explanationParts = useMemo(() => parseExplanationParts(lesson.explanation), [lesson.explanation]);
  const steps = useMemo(() => buildSteps(lesson, explanationParts), [lesson, explanationParts]);
  const [currentStep, setCurrentStep] = useState(0);
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const [currentExerciseAnswered, setCurrentExerciseAnswered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showXpFloat, setShowXpFloat] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const exercises = lesson.exercises || [];

  const gainXp = useCallback((amount: number) => {
    setXpGained(prev => prev + amount);
    setShowXpFloat(true);
    setTimeout(() => setShowXpFloat(false), 800);
  }, []);

  const handleContinue = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (currentStep < steps.length - 1) {
      const nextStep = steps[currentStep + 1];
      if (nextStep.type === "summary") fireStarBurst();

      setTimeout(() => {
        setCurrentStep(s => s + 1);
        setCurrentExerciseAnswered(false);
        setIsAnimating(false);
      }, 200);
    } else {
      fireCelebration();
      onComplete();
    }
  }, [currentStep, steps, onComplete, isAnimating]);

  const handleExerciseComplete = useCallback(
    (correct: boolean) => {
      if (step.exerciseIndex !== undefined) {
        setExerciseResults(prev => ({ ...prev, [step.exerciseIndex!]: correct }));
        setCurrentExerciseAnswered(true);
        if (correct) gainXp(10);
      }
    },
    [step, gainXp]
  );

  const correctCount = Object.values(exerciseResults).filter(Boolean).length;
  const canContinue = step.type !== "exercise" || currentExerciseAnswered;

  // Segment the progress bar
  const segments = steps.length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar — Duolingo iOS-clean */}
      <div className="flex-shrink-0 px-4 pt-3 pb-3" style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            aria-label="Chiudi lezione"
            className="w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-90 transition"
          >
            <X className="w-6 h-6" strokeWidth={2.4} />
          </button>

          {/* Fluid framer-motion progress bar */}
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              style={{
                boxShadow: "inset 0 -3px 0 0 hsl(var(--primary) / 0.45)",
              }}
            />
          </div>

          {/* Energy / XP counter */}
          <div className="flex items-center gap-1 px-2.5 h-8 rounded-full bg-warning/10 text-warning font-bold text-sm">
            <Zap className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            <span>{xpGained}</span>
            <AnimatePresence>
              {showXpFloat && (
                <motion.span
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -32 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  className="absolute mt-[-32px] text-xs font-extrabold text-warning pointer-events-none"
                >
                  +10
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content area with Duolingo slide transitions */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col" ref={contentRef}>
        <div className="flex-1 flex flex-col justify-start max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              {step.type === "concept" && <ConceptStep concept={lesson.concept} />}
              {step.type === "explanation_part" && step.explanationPartIndex !== undefined && (
                <ExplanationPartStep
                  part={explanationParts[step.explanationPartIndex]}
                  partNumber={step.explanationPartIndex + 1}
                  totalParts={explanationParts.length}
                />
              )}
              {step.type === "example" && lesson.example && <ExampleStep example={lesson.example} />}
              {step.type === "exercise" && step.exerciseIndex !== undefined && exercises[step.exerciseIndex] && (
                <ExerciseStep
                  exercise={exercises[step.exerciseIndex]}
                  exerciseNumber={step.exerciseIndex + 1}
                  totalExercises={exercises.length}
                  onComplete={handleExerciseComplete}
                  isCompleted={currentExerciseAnswered}
                />
              )}
              {step.type === "summary" && (
                <SummaryStep correctCount={correctCount} totalExercises={exercises.length} isLastLesson={isLastLesson} xpGained={xpGained} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky bottom pill CTA — Duolingo style */}
      <div
        className="flex-shrink-0 px-5 pt-3 pb-5 bg-background border-t border-border"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 20px), 20px)" }}
      >
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          variant="duo"
          size="lg"
          className={cn(
            "w-full h-14 text-base",
            canContinue && step.type !== "exercise" && "animate-pulse-glow"
          )}
        >
          {currentStep === steps.length - 1
            ? isLastLesson ? "Completa corso" : "Prossima lezione"
            : step.type === "exercise" && !currentExerciseAnswered
            ? "Rispondi per continuare"
            : "Continua"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* ── Step Components ── */

function ConceptStep({ concept }: { concept: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-level-3 animate-bounce-in">
        <Lightbulb className="w-10 h-10 text-primary-foreground" />
      </div>
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary label-medium mb-4">
          <Star className="w-3.5 h-3.5" />
          Concetto chiave
        </div>
        <div className="title-large font-display leading-relaxed prose prose-sm max-w-none mx-auto">
          <ReactMarkdown>{concept}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExplanationPartStep({ part, partNumber, totalParts }: { part: ExplanationPart; partNumber: number; totalParts: number }) {
  const isExample = part.part_title.startsWith("📌") || part.part_title.startsWith("🔍");
  
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-level-1",
          isExample ? "bg-tertiary-container" : "bg-secondary-container"
        )}>
          {isExample ? (
            <span className="text-xl">💡</span>
          ) : (
            <BookOpen className={cn("w-6 h-6", isExample ? "text-tertiary" : "text-secondary")} />
          )}
        </div>
        <div className="flex-1">
          <span className="label-large text-foreground">{part.part_title}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {Array.from({ length: totalParts }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full flex-1 transition-all duration-300",
                  i < partNumber ? (isExample ? "bg-tertiary" : "bg-secondary") : "bg-surface-container-highest"
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <div className={cn(
        "p-5 rounded-2xl shadow-level-1",
        isExample ? "bg-tertiary-container/50 border-l-4 border-tertiary" : "bg-surface-container-low"
      )}>
        <div className="body-large text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-p:text-muted-foreground prose-strong:text-foreground prose-em:text-foreground/90">
          <ReactMarkdown>{part.content}</ReactMarkdown>
        </div>
        
        {/* Image from source material */}
        {part.image_url && (
          <div className="mt-4">
            <img 
              src={part.image_url} 
              alt={part.image_description || "Immagine dal materiale"} 
              className="w-full rounded-2xl shadow-level-2 object-contain max-h-64"
            />
            {part.image_description && (
              <p className="text-center body-small text-muted-foreground mt-2 italic">
                {part.image_description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleStep({ example }: { example: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-tertiary-container flex items-center justify-center shadow-level-1">
          <span className="text-2xl">💡</span>
        </div>
        <span className="label-large text-foreground">Esempio pratico</span>
      </div>
      <div className="p-5 rounded-2xl bg-tertiary-container/50 border-l-4 border-tertiary shadow-level-1">
        <div className="body-large text-foreground leading-relaxed prose prose-sm max-w-none">
          <ReactMarkdown>{example}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExerciseStep({
  exercise, exerciseNumber, totalExercises, onComplete, isCompleted,
}: {
  exercise: Exercise; exerciseNumber: number; totalExercises: number;
  onComplete: (correct: boolean) => void; isCompleted: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-level-2">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="label-large text-foreground">Esercizio {exerciseNumber}</span>
            <p className="body-small text-muted-foreground">{exerciseNumber} di {totalExercises}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalExercises }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                i < exerciseNumber - 1 ? "bg-success" : i === exerciseNumber - 1 ? "bg-primary scale-125" : "bg-surface-container-highest"
              )}
            />
          ))}
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-surface-container-low shadow-level-1">
        <ExerciseRenderer exercise={exercise} onComplete={onComplete} isCompleted={isCompleted} />
      </div>
    </div>
  );
}

function SummaryStep({ correctCount, totalExercises, isLastLesson, xpGained }: { correctCount: number; totalExercises: number; isLastLesson: boolean; xpGained: number }) {
  const great = correctCount >= totalExercises * 0.7;
  const percentage = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;
  
  return (
    <div className="text-center space-y-6">
      <div
        className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center animate-bounce-in shadow-level-4"
        style={{ background: great ? "hsl(var(--success))" : "hsl(var(--warning))" }}
      >
        {great ? <Trophy className="w-12 h-12 text-white" /> : <CheckCircle2 className="w-12 h-12 text-white" />}
      </div>
      
      <div>
        <p className={cn("font-display font-bold text-3xl mb-2", great ? "text-success" : "text-warning")}>
          {great ? "Fantastico! 🎉" : "Quasi! 💪"}
        </p>
        <p className="body-large text-muted-foreground">
          {percentage}% corretto — {correctCount}/{totalExercises} esercizi
        </p>
      </div>

      {/* Stats cards */}
      <div className="flex gap-3 justify-center">
        <div className="flex flex-col items-center p-4 rounded-2xl bg-primary-container min-w-[90px] animate-option-pop animate-stagger-1">
          <Zap className="w-5 h-5 text-primary mb-1" />
          <span className="title-medium font-bold text-primary">{xpGained}</span>
          <span className="label-small text-muted-foreground">XP</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-2xl bg-success-container min-w-[90px] animate-option-pop animate-stagger-2">
          <CheckCircle2 className="w-5 h-5 text-success mb-1" />
          <span className="title-medium font-bold text-success">{correctCount}</span>
          <span className="label-small text-muted-foreground">Corretti</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary-container min-w-[90px] animate-option-pop animate-stagger-3">
          <Star className="w-5 h-5 text-secondary mb-1" />
          <span className="title-medium font-bold text-secondary">{percentage}%</span>
          <span className="label-small text-muted-foreground">Precisione</span>
        </div>
      </div>

      <p className="body-small text-muted-foreground">
        {isLastLesson ? "Premi per completare il corso!" : "Premi per passare alla prossima lezione."}
      </p>
    </div>
  );
}
