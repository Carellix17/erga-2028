import { BookOpen, CalendarDays, Hexagon, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/landing/BrandMark";

export type Tab = "home" | "studio" | "piano" | "core";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/** Attached app navigation. Equal-width mobile slots need no layout measurement. */
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();
  const tabs = [
    { id: "home" as Tab, i18nKey: "nav.home", icon: HomeIcon },
    { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays },
    { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen },
    { id: "core" as Tab, i18nKey: "nav.core", icon: Hexagon },
  ];
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sheet pb-[env(safe-area-inset-bottom,0px)] md:hidden"
        aria-label={t("nav.ariaPrimary")}
      >
        <div className="relative mx-auto grid h-16 max-w-lg grid-cols-4">
          <span
            aria-hidden="true"
            className="app-nav-indicator pointer-events-none absolute inset-y-0 left-0 w-1/4 border-t-2 border-primary bg-secondary/60"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {tabs.map(({ id, i18nKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => activeTab !== id && onTabChange(id)}
              aria-current={activeTab === id ? "page" : undefined}
              data-haptic={activeTab === id ? "off" : "medium"}
              className={cn(
                "relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                activeTab === id ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={activeTab === id ? 2 : 1.75} aria-hidden="true" />
              <span>{t(i18nKey)}</span>
            </button>
          ))}
        </div>
      </nav>

      <nav
        className="hidden h-full w-[84px] shrink-0 flex-col bg-sheet md:flex lg:w-56"
        aria-label={t("nav.ariaPrimary")}
      >
        <div className="flex h-20 shrink-0 items-center justify-center gap-3 px-4 lg:justify-start lg:px-6">
          <BrandMark className="h-8 w-7 shrink-0 text-foreground" />
          <span className="hidden font-display text-xl font-semibold tracking-tight lg:block">Erga</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-2 lg:px-3">
          {tabs.map(({ id, i18nKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => activeTab !== id && onTabChange(id)}
              aria-current={activeTab === id ? "page" : undefined}
              data-haptic={activeTab === id ? "off" : "medium"}
              className={cn(
                "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-button px-2 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex-row lg:justify-start lg:gap-3 lg:px-3",
                activeTab === id ? "bg-secondary font-semibold text-foreground" : "font-medium text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {activeTab === id && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-px bg-primary" />}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={activeTab === id ? 2 : 1.75} aria-hidden="true" />
              <span className="text-[13px] leading-tight lg:text-[15px]">{t(i18nKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
