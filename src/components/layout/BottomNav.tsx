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
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-[68px] max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-3">
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
