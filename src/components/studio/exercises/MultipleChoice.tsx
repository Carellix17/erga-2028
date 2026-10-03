import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "../MathText";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface MultipleChoiceProps {
  question: string;
  options: string[];
  correctIndex: number;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function MultipleChoice({
  question, options, correctIndex, onComplete, isCompleted,
}: MultipleChoiceProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
    const reveal = () => {
      setShowResult(true);
      onComplete(index === correctIndex);
    };
    // Auto-invio al tocco (stile Duolingo). Con «riduci movimento» attivo il
    // risultato arriva subito: la pausa serviva solo a far vedere l'animazione.
    if (prefersReducedMotion) {
      reveal();
      return;
    }
    setTimeout(reveal, 300);
  };

  const isCorrect = selectedIndex === correctIndex;

  return (
    <div className="space-y-5">
      <p className="title-medium text-foreground"><MathText text={question} /></p>
      
      <div className="space-y-2.5">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectOption = index === correctIndex;
          
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={cn(
                "w-full p-4 text-left rounded-2xl border-2 transition-all duration-300 ease-m3-emphasized animate-option-pop",
                // Default
                !showResult && !isSelected && "border-outline-variant bg-surface-container-lowest text-foreground hover:border-primary/50 hover:bg-primary/5 active:scale-[0.97]",
                // Selected pre-submit
                !showResult && isSelected && "border-primary bg-primary/10 text-foreground scale-[1.02] shadow-level-1",
                // Correct answer revealed — GREEN
                showResult && isCorrectOption && "border-emerald-500 bg-emerald-500/15 dark:bg-emerald-950/40 animate-feedback-correct",
                // Wrong answer selected — RED
                showResult && isSelected && !isCorrectOption && "border-rose-500 bg-rose-500/15 dark:bg-rose-950/40 animate-feedback-wrong",
                // Other options after submit — muted
                showResult && !isSelected && !isCorrectOption && "border-outline-variant opacity-50"
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                  !showResult && !isSelected && "bg-surface-container-highest text-muted-foreground",
                  !showResult && isSelected && "bg-primary text-primary-foreground",
                  showResult && isCorrectOption && "bg-emerald-600 text-white",
                  showResult && isSelected && !isCorrectOption && "bg-rose-600 text-white",
                )}>
                  {showResult && isCorrectOption ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : showResult && isSelected && !isCorrectOption ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className={cn(
                  "body-large flex-1",
                  showResult && isCorrectOption && "text-emerald-900 dark:text-emerald-100 font-medium",
                  showResult && isSelected && !isCorrectOption && "text-rose-900 dark:text-rose-100 font-medium",
                )}>
                  <MathText text={option} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
          "p-4 rounded-2xl text-center font-medium flex items-center justify-center gap-2 animate-fade-up border",
          isCorrect
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            : "border-rose-500/40 bg-rose-500/15 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
        )}>
          {isCorrect ? t("exercise.perfect") : t("exercise.correctHighlighted")}
          {!isCorrect && (
            <span className="sr-only"> {t("exercise.correctWas", { answer: options[correctIndex] })}</span>
          )}
        </div>
      )}
    </div>
  );
}
