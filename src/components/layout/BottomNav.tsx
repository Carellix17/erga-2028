import { BookOpen, CalendarDays, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Tab = "studio" | "piano" | "pratica" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen, color: "bg-primary-container text-primary" },
  { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays, color: "bg-primary-container text-primary" },
  { id: "pratica" as Tab, i18nKey: "nav.pratica", icon: GraduationCap, color: "bg-primary-container text-primary" },
  { id: "profilo" as Tab, i18nKey: "nav.profilo", icon: User, color: "bg-primary-container text-primary" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-3 sm:px-4 pb-8 sm:pb-6 pointer-events-none md:static md:z-auto md:pb-0 md:px-0 md:sm:px-0 md:sm:pb-0 md:w-64 md:h-screen md:sticky md:top-0 md:left-0 md:self-start md:pointer-events-auto md:shrink-0">
      <div className="bg-white/70 backdrop-blur-md border-[0.5px] border-white/40 max-w-lg mx-auto pointer-events-auto rounded-full -translate-y-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out md:max-w-none md:mx-0 md:w-full md:h-full md:rounded-none md:translate-y-0 md:bg-white/60 md:border-0 md:border-r-[0.5px] md:border-white/50 md:shadow-none">
        <div className="flex items-center justify-around h-[4.5rem] sm:px-6 rounded-full opacity-100 shadow px-[10px] pb-0 md:shadow-none md:rounded-none md:flex-col md:items-stretch md:justify-start md:gap-1 md:h-full md:px-3 md:py-6 md:pb-6">
          <div className="hidden md:flex items-center gap-2 px-3 pb-6">
            <span className="font-display font-bold text-xl text-foreground tracking-tight">Erga</span>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 py-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl md:flex-none md:flex-row md:items-center md:justify-start md:w-full md:py-2 md:px-2 md:gap-3"
              >
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-600",
                    isActive
                      ? `${tab.color} w-16 h-9 shadow-level-1`
                      : "w-12 h-9 bg-transparent group-hover:bg-foreground/[0.08]",
                    "md:w-11 md:h-11 md:rounded-2xl md:shrink-0"
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-400",
                      isActive ? "" : "text-muted-foreground"
                    )}
                    fill={isActive ? "currentColor" : "none"}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "label-small mt-1.5 transition-all duration-400 md:mt-0 md:text-base",
                    isActive ? "text-foreground font-bold" : "text-muted-foreground",
                    "md:mt-1.5"
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  {t(tab.i18nKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
