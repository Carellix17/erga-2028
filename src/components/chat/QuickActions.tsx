import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Lightbulb, FileText, ClipboardList, Zap } from "lucide-react";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const { t } = useTranslation();
  // 🎨 P9d: una sola veste monocromatica — la personalita' la porta il SIMBOLO, non i pastelli.
  // 🌿 P21g: decreto "emoji fuori dall'UI" -> stessa personalita', ma con le icone gemelle
  // di casa (lucide): lampadina, foglio, blocco appunti, fulmine.
  const CHIP = "bg-card text-foreground border-outline-variant/60";
  const quickActions = [
    { label: t("chat.quick.explain"), Icon: Lightbulb, cls: CHIP },
    { label: t("chat.quick.example"), Icon: FileText, cls: CHIP },
    { label: t("chat.quick.summarize"), Icon: ClipboardList, cls: CHIP },
    { label: t("chat.quick.quiz"), Icon: Zap, cls: CHIP },
  ];
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.label)}
          className={`whitespace-nowrap flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border label-large hover:bg-surface-container-high active:scale-[0.97] transition-all duration-200 ease-m3-emphasized ${action.cls}`}
        >
          <action.Icon className="w-4 h-4" strokeWidth={2} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
