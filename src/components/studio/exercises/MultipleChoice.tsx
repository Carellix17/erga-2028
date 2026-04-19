import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
    setTimeout(() => {
      setShowResult(true);
      onComplete(index === correctIndex);
    }, 280);
  };

  const isCorrect = selectedIndex === correctIndex;

  return (
    <div className="space-y-5">
      <p className="text-lg font-bold text-foreground leading-snug">{question}</p>

      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectOption = index === correctIndex;
          const wrongHere = showResult && isSelected && !isCorrectOption;
          const rightHere = showResult && isCorrectOption;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={cn(
                "w-full p-4 text-left rounded-2xl border-2 bg-card transition-all duration-200",
                !showResult && !isSelected && "border-border hover:border-primary/60 active:scale-[0.98]",
                !showResult && isSelected && "border-primary ring-glow-primary scale-[1.01]",
                rightHere && "border-success ring-glow-success",
                wrongHere && "border-destructive ring-glow-error animate-shake",
                showResult && !isSelected && !isCorrectOption && "border-border opacity-40"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-all",
                  !showResult && !isSelected && "border-border text-muted-foreground bg-background",
                  !showResult && isSelected && "border-primary bg-primary text-primary-foreground",
                  rightHere && "border-success bg-success text-white",
                  wrongHere && "border-destructive bg-destructive text-white",
                )}>
                  {rightHere ? (
                    <CheckCircle2 className="w-5 h-5" strokeWidth={2.5} />
                  ) : wrongHere ? (
                    <XCircle className="w-5 h-5" strokeWidth={2.5} />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className={cn(
                  "text-base flex-1 font-medium",
                  rightHere && "text-success font-bold",
                  wrongHere && "text-destructive font-bold",
                )}>
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className={cn(
          "p-4 rounded-2xl text-center font-semibold animate-fade-up",
          isCorrect ? "pastel-green text-success" : "pastel-red text-destructive"
        )}>
          {isCorrect ? "Perfetto! 🎉" : "La risposta corretta è evidenziata sopra."}
        </div>
      )}
    </div>
  );
}
