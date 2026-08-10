import { BookOpen, Brain, CalendarDays, GraduationCap, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Tab = "studio" | "piano" | "pratica" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen },
  { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays },
  { id: "pratica" as Tab, i18nKey: "nav.pratica", icon: GraduationCap },
  { id: "profilo" as Tab, i18nKey: "nav.profilo", icon: User },
];

// 🌲 P24 BOSCO — la nav è un PIANO dell'ambiente, non un oggetto sospeso:
// niente più -translate-y né ombra da palco; la pillola (mobile) e la sidebar
// (desktop) sono ancorate, la voce attiva porta il PUNTINO LIME della foto.
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none md:static md:z-auto md:px-0 md:pointer-events-auto md:w-64 md:h-screen md:sticky md:top-0 md:self-start md:shrink-0">
      <div className="bg-nav text-nav-foreground max-w-lg mx-auto pointer-events-auto rounded-full shadow-level-2 border border-white/10 mb-[max(env(safe-area-inset-bottom,0px),1rem)] md:max-w-none md:mx-0 md:h-full md:rounded-none md:border-0 md:border-r md:mb-0">
        {/* ── Telefono: pillola bosco ancorata ── */}
        <div className="flex items-center justify-around h-[4.5rem] px-2 rounded-full md:hidden">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/70"
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-200",
                    isActive ? "bg-white/15 w-12 h-8" : "w-12 h-8 bg-transparent"
                  )}
                >
                  <Icon
                    className={cn("w-[22px] h-[22px]", isActive ? "text-white" : "text-white/55")}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </span>
                <span className={cn("label-small", isActive ? "text-white" : "text-white/55")}>
                  {t(tab.i18nKey)}
                </span>
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-opacity duration-200",
                    isActive ? "bg-lime opacity-100" : "opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* ── Desktop: sidebar bosco ancorata ── */}
        <div className="hidden md:flex md:flex-col md:h-full md:px-3 md:py-6">
          <div className="flex items-center gap-2 px-3 pb-6">
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
              <Brain className="w-4 h-4" strokeWidth={2} />
            </span>
            <span className="font-bold text-xl tracking-tight">Erga</span>
          </div>
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/70",
                    isActive ? "bg-white/12" : "hover:bg-white/[0.06]"
                  )}
                >
                  <Icon
                    className={cn("w-5 h-5", isActive ? "text-white" : "text-white/55")}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={cn(
                      "flex-1 text-left text-[15px] font-semibold",
                      isActive ? "text-white" : "text-white/55"
                    )}
                  >
                    {t(tab.i18nKey)}
                  </span>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-lime" : "bg-transparent")} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
