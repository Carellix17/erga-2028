import { BookOpen, CalendarDays, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "studio" | "piano" | "pratica" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, label: "Studio", icon: BookOpen },
  { id: "piano" as Tab, label: "Piano", icon: CalendarDays },
  { id: "pratica" as Tab, label: "Pratica", icon: GraduationCap },
  { id: "profilo" as Tab, label: "Profilo", icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <div className="flex items-center justify-around h-[64px] px-2 rounded-full bg-background/85 backdrop-blur-xl border border-border shadow-[0_8px_32px_-4px_hsl(var(--foreground)/0.18)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 group focus:outline-none transition-transform active:scale-[0.92]"
            >
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon
                  className="w-[26px] h-[26px] transition-all"
                  strokeWidth={isActive ? 2.4 : 1.9}
                  fill={isActive ? "currentColor" : "none"}
                  fillOpacity={isActive ? 0.15 : 0}
                />
              </div>
              <span
                className={cn(
                  "text-[11px] leading-none tracking-tight transition-all duration-200",
                  isActive ? "text-primary font-bold" : "text-muted-foreground font-medium"
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
