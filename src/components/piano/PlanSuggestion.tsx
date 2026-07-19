import { Brain, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface PlanSuggestionProps {
  explanation: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function PlanSuggestion({ explanation, onAccept, onDecline }: PlanSuggestionProps) {
  const { t } = useTranslation();
  return (
    <div className="bg-primary-container rounded-xl p-5 shadow-level-2 animate-scale-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="title-small">{t("piano.suggestionTitle")}</h3>
          <p className="body-small text-muted-foreground">{t("piano.suggestionAi")}</p>
        </div>
      </div>
      
      <p className="body-medium text-muted-foreground leading-relaxed mb-5">
        {explanation}
      </p>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDecline}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-1.5" />
          {t("piano.modify")}
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          className="flex-1"
        >
          <Check className="w-4 h-4 mr-1.5" />
          {t("piano.accept")}
        </Button>
      </div>
    </div>
  );
}
