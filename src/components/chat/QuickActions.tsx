import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { t } = useTranslation();
  const quickActions = [
    { label: t("chat.quick.explain"), emoji: "💡", cls: "bg-primary-container text-primary border-primary/20" },
    { label: t("chat.quick.example"), emoji: "📝", cls: "bg-secondary-container text-secondary-foreground border-secondary/20" },
    { label: t("chat.quick.summarize"), emoji: "📋", cls: "bg-tertiary-container text-tertiary border-tertiary/20" },
    { label: t("chat.quick.quiz"), emoji: "⚡", cls: "bg-warning/10 text-warning border-warning/20" },
  ];
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.label)}
          className={`whitespace-nowrap flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border label-large hover:shadow-level-1 hover:scale-[1.04] active:scale-95 transition-all duration-400 ease-m3-emphasized ${action.cls}`}
        >
          <span>{action.emoji}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
