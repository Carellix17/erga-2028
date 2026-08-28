import { Home, CalendarDays, BookOpen, Hexagon } from "lucide-react";

export type HomeTab = "home" | "piano" | "studio" | "core";

export interface HomeBottomNavProps {
  activeTab?: HomeTab;
  onTabChange?: (tab: HomeTab) => void;
}

const TABS: { id: HomeTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "piano", label: "Piano", icon: CalendarDays },
  { id: "studio", label: "Studio", icon: BookOpen },
  { id: "core", label: "Core", icon: Hexagon },
];

export function HomeBottomNav({ activeTab = "home", onTabChange }: HomeBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-[max(env(safe-area-inset-bottom,0px),12px)] pointer-events-auto">
        <div className="rounded-full bg-white border border-slate-200/80 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] flex items-center justify-around h-[64px] px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className="h-11 flex-1 flex flex-col items-center justify-center gap-1 rounded-full"
              >
                <span className={`h-8 w-12 rounded-full flex items-center justify-center ${isActive ? "bg-slate-900 text-white" : "text-slate-500"}`}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span className={`text-[10px] font-medium ${isActive ? "text-slate-900 font-semibold" : "text-slate-500"}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
