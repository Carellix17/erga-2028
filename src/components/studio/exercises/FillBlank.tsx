import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { MathText } from "../MathText";

interface FillBlankProps {
  sentenceWithBlank: string;
  correctAnswer: string;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function FillBlank({
  sentenceWithBlank, correctAnswer, onComplete, isCompleted,
}: FillBlankProps) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setShowResult(true);
    onComplete(answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim());
  };

  const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  const parts = sentenceWithBlank.split("___");

  return (
    <div className="space-y-5">
      <div className="title-medium text-foreground leading-relaxed p-4 rounded-2xl bg-surface-container">
        {parts.map((part, index) => (
          <span key={index}>
            <MathText text={part} />
            {index < parts.length - 1 && (
              <span className="inline-block mx-1 align-middle">
                {showResult ? (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-xl font-semibold transition-all border",
                    isCorrect
                      ? "border-success bg-success/10 text-success animate-feedback-correct"
                      : "border-destructive bg-destructive/10 text-destructive animate-feedback-wrong"
                  )}>
                    {answer || "___"}
                    {isCorrect ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                  </span>
                ) : (
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="inline-block w-36 h-9 mx-1 rounded-xl border-2 border-primary/30 focus:border-primary text-center font-semibold"
                    placeholder="..."
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoFocus
                  />
                )}
              </span>
            )}
          </span>
        ))}
      </div>

      {!showResult && (
        <Button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="w-full h-12 rounded-2xl"
        >
          <Send className="w-4 h-4 mr-2" />
          {t("exercise.verify")}
        </Button>
      )}

      {showResult && (
        <div role="status" aria-live="polite" className="animate-fade-up">
          {isCorrect ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-success bg-success/10 p-4 text-center font-medium text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              {t("exercise.exact")}
            </div>
          ) : (
            <div className="rounded-2xl border border-success bg-surface-container-low p-4 text-center">
              <p className="mb-1 inline-flex items-center gap-1 body-small text-muted-foreground">
                <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                {t("exercise.correctAnswer")}
              </p>
              <p className="inline-flex items-center justify-center gap-1 title-medium font-semibold text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                {correctAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
