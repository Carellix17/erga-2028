import { BookOpen, CalendarDays, Hexagon, Home as HomeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/landing/BrandMark";

export type Tab = "home" | "studio" | "piano" | "core";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/** Phone: white pill (Home, Piano, Studio) plus a white Core circle. Tablet rail and desktop sidebar stay attached. */
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();
  const tabs = [
    { id: "home" as Tab, i18nKey: "nav.home", icon: HomeIcon },
    { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays },
    { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen },
    { id: "core" as Tab, i18nKey: "nav.core", icon: Hexagon },
  ];
  const pillTabs = tabs.filter((tab) => tab.id !== "core");
  const coreTab = tabs.find((tab) => tab.id === "core")!;

  return (
    <>
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:hidden"
        aria-label={t("nav.ariaPrimary")}
      >
        <div className="dock-veil" aria-hidden="true" />
        <div className="pointer-events-auto relative mx-auto flex max-w-lg items-center gap-2.5">
          <div className="grid h-16 min-w-0 flex-1 grid-cols-3 overflow-hidden rounded-pill bg-primary p-1 text-primary-foreground">
            {pillTabs.map(({ id, i18nKey, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => activeTab !== id && onTabChange(id)}
                  aria-current={isActive ? "page" : undefined}
                  data-haptic={isActive ? "off" : "medium"}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-pill px-1 text-base font-normal leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none",
                    isActive ? "bg-nest text-sand" : "text-primary-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                  <span>{t(i18nKey)}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => activeTab !== coreTab.id && onTabChange(coreTab.id)}
            aria-current={activeTab === coreTab.id ? "page" : undefined}
            data-haptic={activeTab === coreTab.id ? "off" : "medium"}
            className={cn(
              "grid h-16 w-16 shrink-0 place-items-center rounded-pill bg-primary p-1 text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none",
              activeTab === coreTab.id ? "text-sand" : "text-primary-foreground",
            )}
          >
            <span
              className={cn(
                "grid h-full w-full place-items-center rounded-pill",
                activeTab === coreTab.id && "bg-nest",
              )}
            >
              <coreTab.icon className="h-6 w-6" strokeWidth={activeTab === coreTab.id ? 2 : 1.75} aria-hidden="true" />
              <span className="sr-only">{t(coreTab.i18nKey)}</span>
            </span>
          </button>
        </div>
      </nav>

      <nav
        className="hidden h-full w-[84px] shrink-0 flex-col bg-sheet md:flex lg:w-56"
        aria-label={t("nav.ariaPrimary")}
      >
        <div className="flex h-20 shrink-0 items-center justify-center gap-3 px-4 lg:justify-start lg:px-6">
          <BrandMark className="h-8 w-7 shrink-0 text-foreground" />
          <span className="hidden font-display text-xl font-normal tracking-tight lg:block">Erga</span>
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
                activeTab === id ? "bg-nest font-normal text-sand" : "font-normal text-muted-foreground hover:bg-foreground/10",
              )}
            >
              {activeTab === id && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-px bg-sand" />}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={activeTab === id ? 2 : 1.75} aria-hidden="true" />
              <span className="text-[13px] leading-tight lg:text-[15px]">{t(i18nKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
