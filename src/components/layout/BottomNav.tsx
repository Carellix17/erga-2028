import { BookOpen, Brain, CalendarDays, Home as HomeIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type Tab = "home" | "studio" | "piano" | "pratica" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "home" as Tab, i18nKey: "nav.home", icon: HomeIcon },
  { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays },
  { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen },
];

// 🌲 P24 — la nav del Capo: Home · Piano · Studio nella pillola,
// e il PROFILO STACCATO AL LATO (cerchio accanto alla pillola su mobile,
// riga in fondo alla sidebar su desktop), stesso colore della nav,
// icona profilo e puntino lime. Pratica non è più in nav: vive nella Home.
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none md:static md:z-auto md:px-0 md:pointer-events-auto md:w-64 md:h-screen md:sticky md:top-0 md:self-start md:shrink-0">
      <div className="max-w-lg mx-auto pointer-events-auto mb-[max(env(safe-area-inset-bottom,0px),1rem)] flex items-center gap-2.5 md:max-w-none md:mx-0 md:mb-0 md:h-full md:items-stretch">
        {/* ── Pillola (mobile) / Sidebar (desktop) ── */}
        <div className="bg-nav text-nav-foreground rounded-full shadow-level-2 border border-white/10 flex-1 min-w-0 md:rounded-none md:border-0 md:border-r md:h-full md:flex md:flex-col">
          {/* Telefono: pillola */}
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
                      isActive ? "bg-white/15 w-12 h-8" : "w-12 h-8 bg-transparent",
                    )}
                  >
                    <Icon
                      className={cn("w-[22px] h-[22px]", isActive ? "text-white" : "text-white/55")}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                  </span>
                  <span className={cn("label-small", isActive ? "text-white" : "text-white/55")}>{t(tab.i18nKey)}</span>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-opacity duration-200",
                      isActive ? "bg-lime opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* Desktop: sidebar */}
          <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0 md:px-3 md:py-6">
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
                      isActive ? "bg-white/12" : "hover:bg-white/[0.06]",
                    )}
                  >
                    <Icon
                      className={cn("w-5 h-5", isActive ? "text-white" : "text-white/55")}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />
                    <span
                      className={cn(
                        "flex-1 text-left text-[15px] font-semibold",
                        isActive ? "text-white" : "text-white/55",
                      )}
                    >
                      {t(tab.i18nKey)}
                    </span>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-lime" : "bg-transparent")} />
                  </button>
                );
              })}
            </div>
            {/* Profilo in fondo alla sidebar */}
            <div className="mt-auto pt-6">
              <button
                onClick={() => onTabChange("profilo")}
                aria-current={activeTab === "profilo" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime/70",
                  activeTab === "profilo" ? "bg-white/12" : "hover:bg-white/[0.06]",
                )}
              >
                <span className="relative">
                  <User
                    className={cn("w-5 h-5", activeTab === "profilo" ? "text-white" : "text-white/55")}
                    strokeWidth={2}
                  />
                  <span
                    className={cn(
                      "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-lime border border-nav",
                      activeTab === "profilo" ? "opacity-100" : "opacity-60",
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "flex-1 text-left text-[15px] font-semibold",
                    activeTab === "profilo" ? "text-white" : "text-white/55",
                  )}
                >
                  {t("nav.profilo")}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Profilo mobile: cerchio accanto alla pillola ── */}
        <button
          type="button"
          onClick={() => onTabChange("profilo")}
          aria-label={t("nav.profilo")}
          aria-current={activeTab === "profilo" ? "page" : undefined}
          className={cn(
            "md:hidden relative w-[4.5rem] h-[4.5rem] rounded-full bg-nav text-nav-foreground border border-white/10 shadow-level-2 flex items-center justify-center flex-shrink-0 transition-transform duration-150 active:scale-90",
            activeTab === "profilo" && "ring-2 ring-lime/40",
          )}
        >
          <User className="w-5 h-5" strokeWidth={2} />
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-lime border-2 border-nav" />
        </button>
      </div>
    </nav>
  );
}
