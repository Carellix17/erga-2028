import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { MathText } from "../MathText";

interface TrueFalseProps {
  statement: string;
  correct: boolean;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function TrueFalse({
  statement, correct, onComplete, isCompleted,
}: TrueFalseProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleSelect = (value: boolean) => {
    if (showResult) return;
    setSelected(value);
    const reveal = () => {
      setShowResult(true);
      onComplete(value === correct);
    };
    // Con «riduci movimento» attivo il risultato arriva subito.
    if (prefersReducedMotion) {
      reveal();
      return;
    }
    setTimeout(reveal, 300);
  };

  const isCorrect = selected === correct;

  return (
    <div className="space-y-5">
      <p className="title-medium text-foreground leading-relaxed"><MathText text={statement} /></p>
      
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => {
          const isSelected = selected === value;
          const isCorrectOption = value === correct;
          
          return (
            <button
              key={String(value)}
              onClick={() => handleSelect(value)}
              disabled={showResult}
              className={cn(
                "p-5 rounded-2xl border-2 font-semibold transition-all duration-300 ease-m3-emphasized flex flex-col items-center gap-2",
                !showResult && !isSelected && "border-outline-variant bg-surface-container-lowest text-foreground hover:border-primary/50 active:scale-[0.95]",
                !showResult && isSelected && "border-primary bg-primary/10 text-foreground scale-[1.03] shadow-level-1",
                showResult && isCorrectOption && "border-success bg-success/10 animate-feedback-correct",
                showResult && isSelected && !isCorrectOption && "border-destructive bg-destructive/10 animate-feedback-wrong",
                showResult && !isSelected && !isCorrectOption && "opacity-50",
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                !showResult && "bg-surface-container-highest",
                showResult && isCorrectOption && "bg-success text-success-foreground",
                showResult && isSelected && !isCorrectOption && "bg-destructive text-destructive-foreground",
              )}>
                {showResult && isCorrectOption ? (
                  <Check className="h-6 w-6 text-success-foreground" aria-hidden="true" />
                ) : showResult && isSelected ? (
                  <X className="h-6 w-6 text-destructive-foreground" aria-hidden="true" />
                ) : value ? (
                  <Check className="h-6 w-6 text-success" aria-hidden="true" />
                ) : (
                  <X className="h-6 w-6 text-destructive" aria-hidden="true" />
                )}
              </div>
              <span className={cn(
                "title-medium",
                showResult && isCorrectOption && "text-success",
                showResult && isSelected && !isCorrectOption && "text-destructive",
              )}>
                {value ? t("exercise.true") : t("exercise.false")}
              </span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "flex items-center justify-center gap-2 rounded-2xl border p-4 text-center font-medium animate-fade-up",
            isCorrect ? "border-success bg-success/10 text-success" : "border-destructive bg-destructive/10 text-destructive"
          )}>
          {isCorrect ? (
            <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <X className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span>{isCorrect ? t("exercise.exact") : correct ? t("exercise.statementIsTrue") : t("exercise.statementIsFalse")}</span>
        </div>
      )}
    </div>
  );
}
