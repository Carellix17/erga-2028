import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronRight, CheckCircle2, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { prepareLessonExercises } from "@/lib/lessonExercises";
import { cn } from "@/lib/utils";

interface FinalTestProps {
  exercises: Exercise[];
  onClose: () => void;
  /** 🅐 FONDAMENTA — al termine porta con sé l'esito, così la schermata
   * chiamante può salvarlo nel database. */
  onComplete: (result: { score: number; correct: number; total: number }) => void;
}

export function FinalTest({ exercises, onClose, onComplete }: FinalTestProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [answered, setAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);

  // P50 — anche nel test finale le opzioni arrivano mescolate (ordine stabile,
  // diverso da quello scritto dall'AI: la risposta non è mai al "posto solito").
  const prepared = useMemo(
    () => prepareLessonExercises(exercises, "test-finale"),
    [exercises],
  );

  const total = prepared.length;
  const correctCount = Object.values(results).filter(Boolean).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const great = score >= 70;

  // ♿ P50 — test finale a schermo pieno: ESC per uscire e fuoco dentro.
  // 🅐 FONDAMENTA — e il focus torna al mittente alla chiusura.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    rootRef.current?.focus?.();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      (previouslyFocusedRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  const progress = showResults ? 100 : ((currentIndex + 1) / (total + 1)) * 100;

  const handleAnswer = useCallback((correct: boolean) => {
    setResults((prev) => ({ ...prev, [currentIndex]: correct }));
    setAnswered(true);
  }, [currentIndex]);

  const handleContinue = useCallback(() => {
    if (showResults) {
      onComplete({ score, correct: correctCount, total });
      return;
    }
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, total, showResults, onComplete, score, correctCount]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("finalTest.title")}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in focus:outline-none"
    >
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-button"
            aria-label={t("finalTest.close")}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 h-1 m3-progress-track">
            {/* ⚙️ P48 — la quota viaggia come variabile (0-1): la barra si
                srotola con una trasformazione invece di cambiare larghezza. */}
            <div
              className="h-full m3-progress-indicator"
              style={{ "--m3-progress": progress / 100 } as CSSProperties}
            />
          </div>
          <span className="label-medium text-muted-foreground whitespace-nowrap">
            {showResults ? t("finalTest.results") : `${currentIndex + 1}/${total}`}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Target className="w-4 h-4 text-brand-deep" />
          <p className="body-small text-muted-foreground text-center">
            <span className="text-foreground title-small">{t("finalTest.title")}</span> · {t("finalTest.subtitle")}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full" key={showResults ? "results" : currentIndex}>
          <div className="animate-fade-up">
            {showResults ? (
              <ResultsView score={score} correctCount={correctCount} total={total} great={great} />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-tertiary flex items-center justify-center">
                      <Award className="w-5 h-5 text-tertiary-foreground" />
                    </div>
                    <div>
                      <span className="label-large uppercase tracking-wide text-muted-foreground">
                        {t("finalTest.question")}
                      </span>
                      <p className="body-small text-muted-foreground">
                        {t("lesson.exerciseOf", { number: currentIndex + 1, total })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-surface-container-high">
                  <ExerciseRenderer
                    exercise={prepared[currentIndex]}
                    onComplete={handleAnswer}
                    isCompleted={answered}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 p-4 pb-8 mb-20 safe-area-bottom">
        <Button
          onClick={handleContinue}
          disabled={!showResults && !answered}
          className={cn(
            "w-full h-14 transition-all duration-300 ease-m3-emphasized",
            !(showResults || answered) && "bg-surface-container-highest text-muted-foreground shadow-level-0"
          )}
          size="lg"
        >
          {showResults ? t("finalTest.closeButton") : currentIndex === total - 1 ? t("finalTest.seeResults") : t("lesson.continue")}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ResultsView({ score, correctCount, total, great }: { score: number; correctCount: number; total: number; great: boolean }) {
  const { t } = useTranslation();
  return (
    <div role="status" className="text-center space-y-8">
      <div
        className="w-24 h-24 rounded-full mx-auto flex items-center justify-center animate-settle-in shadow-level-3"
        style={{ background: great ? "hsl(var(--success))" : "hsl(var(--warning))" }}
      >
        {/* 🌿 P21h — niente trofeo (decreto P21c) e niente ghost: il colore
            giusto arriva dai gettoni semantici, che di notte si vestono da soli */}
        <CheckCircle2 className={cn("w-12 h-12", great ? "text-success-foreground" : "text-warning-foreground")} />
      </div>

      <div>
        <p className={cn("text-5xl font-display font-bold mb-2", great ? "text-success" : "text-warning")}>
          {score}%
        </p>
        <p className={cn("font-display font-bold text-2xl mb-2", great ? "text-success" : "text-warning")}>
          {great ? t("finalTest.great") : t("finalTest.improve")}
        </p>
        <p className="body-medium text-muted-foreground">
          {t("finalTest.answeredCorrectly", {
            correct: <span className="font-semibold">{correctCount}</span>,
            total: <span className="font-semibold">{total}</span>,
          })}
        </p>
      </div>

      <p className="body-small text-muted-foreground">
        {great ? t("finalTest.greatHint") : t("finalTest.improveHint")}
      </p>
    </div>
  );
}
