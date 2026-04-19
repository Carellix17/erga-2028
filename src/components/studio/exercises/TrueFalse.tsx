import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrueFalseProps {
  statement: string;
  correct: boolean;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function TrueFalse({
  statement, correct, onComplete, isCompleted,
}: TrueFalseProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (value: boolean) => {
    if (showResult) return;
    setSelected(value);
    setTimeout(() => {
      setShowResult(true);
      onComplete(value === correct);
    }, 280);
  };

  const isCorrect = selected === correct;

  return (
    <div className="space-y-5">
      <p className="text-lg font-bold text-foreground leading-snug">{statement}</p>

      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => {
          const isSelected = selected === value;
          const isCorrectOption = value === correct;
          const wrongHere = showResult && isSelected && !isCorrectOption;
          const rightHere = showResult && isCorrectOption;

          return (
            <button
              key={String(value)}
              onClick={() => handleSelect(value)}
              disabled={showResult}
              className={cn(
                "relative p-5 min-h-[120px] rounded-2xl border-2 bg-card font-bold transition-all duration-200 flex flex-col items-center justify-center gap-3",
                !showResult && !isSelected && "border-border hover:border-primary/60 active:scale-[0.97]",
                !showResult && isSelected && "border-primary ring-glow-primary scale-[1.02]",
                rightHere && "border-success ring-glow-success",
                wrongHere && "border-destructive ring-glow-error animate-shake",
                showResult && !isSelected && !isCorrectOption && "opacity-40",
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                !showResult && "bg-muted",
                rightHere && "bg-success",
                wrongHere && "bg-destructive",
                !showResult && isSelected && "bg-primary",
              )}>
                {value ? (
                  <Check className={cn("w-8 h-8", (rightHere || wrongHere || (!showResult && isSelected)) ? "text-white" : "text-success")} strokeWidth={3} />
                ) : (
                  <X className={cn("w-8 h-8", (rightHere || wrongHere || (!showResult && isSelected)) ? "text-white" : "text-destructive")} strokeWidth={3} />
                )}
              </div>
              <span className={cn(
                "text-base",
                rightHere && "text-success",
                wrongHere && "text-destructive",
              )}>
                {value ? "Vero" : "Falso"}
              </span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className={cn(
          "p-4 rounded-2xl text-center font-semibold animate-fade-up",
          isCorrect ? "pastel-green text-success" : "pastel-red text-destructive"
        )}>
          {isCorrect ? "Esatto! 🎉" : `L'affermazione è ${correct ? "vera" : "falsa"}.`}
        </div>
      )}
    </div>
  );
}
