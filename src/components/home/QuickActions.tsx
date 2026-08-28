import { FileUp, Zap, MessageCircle, Timer, type LucideIcon } from "lucide-react";

export interface QuickActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export interface QuickActionsProps {
  onImportPdf?: () => void;
  onQuizEspresso?: () => void;
  onAskErga?: () => void;
  onFocusLibero?: () => void;
  actions?: QuickActionItem[];
}

const DEFAULT_ACTIONS: QuickActionItem[] = [
  { id: "pdf", label: "Importa PDF", icon: FileUp },
  { id: "quiz", label: "Quiz Espresso", icon: Zap },
  { id: "ask", label: "Chiedi a Erga", icon: MessageCircle },
  { id: "focus", label: "Focus Libero", icon: Timer },
];

export function QuickActions({
  onImportPdf,
  onQuizEspresso,
  onAskErga,
  onFocusLibero,
  actions,
}: QuickActionsProps) {
  const items = actions ?? [
    { ...DEFAULT_ACTIONS[0], onClick: onImportPdf },
    { ...DEFAULT_ACTIONS[1], onClick: onQuizEspresso },
    { ...DEFAULT_ACTIONS[2], onClick: onAskErga },
    { ...DEFAULT_ACTIONS[3], onClick: onFocusLibero },
  ];

  return (
    <div className="w-full overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
      <div className="flex gap-2 px-1 py-1">
        {items.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="h-11 shrink-0 rounded-full bg-white border border-slate-200/80 px-4 flex items-center gap-2 text-[13px] font-medium text-slate-700 whitespace-nowrap"
            >
              <Icon className="h-4 w-4 text-slate-600" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
