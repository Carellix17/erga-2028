import { BookOpen, Brain, CalendarDays, Hexagon, Home as HomeIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type Tab = "home" | "studio" | "piano" | "core";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/**
 * BottomNav — navigazione principale (DESIGN.md 2.1 §10).
 *
 * Quattro destinazioni con etichette persistenti, stesso ordine su ogni
 * formato: Home, Piano, Studio, Core. Le voci sono SOLO destinazioni —
 * gli strumenti vivono nel Banco di Studio.
 *
 * · TELEFONO (<768px): la PILOLA ALLUNGATA di una volta, su richiesta del
 *   proprietario (6 ottobre 2026): dock flottante a pillola, carta opaca,
 *   con lo SLIDER SUPERFLUIDO — la sotto-pillola `layoutId` che scivola
 *   tra le voci con la molla di framer-motion. Colori di adesso: la
 *   selezione è INCHIOSTRO (pillola bg-primary) con contenuto su carta.
 * · FINESTRE MEDIE (768–1023px): rail compatta, icone con etichette.
 * · DESKTOP (≥1024px): sidebar calda con brand esteso (soglia 2.1 §10).
 *
 * La navigazione non sparisce con lo scroll; nelle sessioni immersive è
 * la shell a ritirarla (hideChrome in AppLayout).
 */
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: "home" as Tab, i18nKey: "nav.home", icon: HomeIcon },
    { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays },
    { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen },
    { id: "core" as Tab, i18nKey: "nav.core", icon: Hexagon },
  ];

  const material = "bg-card border border-border text-card-foreground";
  const idleTxt = "text-muted-foreground";
  const activeTxt = "text-foreground";

  return (
    <>
      {/* ════════ TELEFONO (<768px): pillola allungata con slider fluido ════════ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none md:hidden"
        aria-label={t("nav.ariaPrimary") || "Navigazione principale"}
      >
        <div
          className={cn(
            material,
            "mx-auto max-w-lg pointer-events-auto rounded-pill shadow-level-5",
            "mb-[max(env(safe-area-inset-bottom,0px),0.75rem)]",
          )}
        >
          {/* Il padding interno (px-2 py-1.5) tiene la sotto-pillola lontana
              dalle estremità curve della pillola. */}
          <div className="relative grid grid-cols-4 items-center justify-items-center rounded-pill px-2 py-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-pill py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {/* SLIDER SUPERFLUIDO: la sotto-pillola inchiostro scivola
                      sulla voce attiva (stessa molla di sempre: 400/30). */}
                  {isActive && (
                    <motion.span
                      layoutId="activeTabBackground"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute inset-0 rounded-pill bg-primary"
                      aria-hidden
                    />
                  )}
                  <span className="relative z-10">
                    <Icon
                      className={cn(
                        "h-[22px] w-[22px]",
                        isActive ? "text-primary-foreground" : idleTxt,
                      )}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      aria-hidden="true"
                    />
                    {tab.id === "core" && (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-muted-foreground",
                          isActive ? "ring-2 ring-primary" : "ring-2 ring-card",
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "relative z-10 text-[13px] leading-none",
                      isActive ? "font-semibold text-primary-foreground" : "font-medium text-muted-foreground",
                    )}
                  >
                    {t(tab.i18nKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ════════ RAIL (768–1023px) e SIDEBAR (≥1024px): colonna sospesa ════════
           In-flow dentro l'app shell sigillata (vedi AppLayout): colonna flex
           che non scorre mai. Da 1024px le voci passano da verticali (rail,
           icona sopra etichetta) a orizzontali (sidebar, con il brand esteso). */}
      <nav
        className="hidden md:flex md:h-full md:w-[84px] md:shrink-0 md:flex-col lg:w-64"
        aria-label={t("nav.ariaPrimary") || "Navigazione principale"}
      >
        <div className={cn(material, "flex h-full w-full flex-col overflow-hidden rounded-card shadow-level-2")}>
          {/* ── Brand: icona sulla rail, nome completo sulla sidebar ── */}
          <div className="flex shrink-0 items-center justify-center px-2 pb-4 pt-5 lg:justify-start lg:gap-2 lg:px-5 lg:pb-6 lg:pt-6">
            <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-surface-container-high">
              <Brain className="h-4 w-4 text-foreground" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="hidden font-display text-xl font-medium tracking-tight lg:block">Erga</span>
          </div>

          {/* ── Menu: scorre DA SOLO se lo schermo è basso (tablet landscape) ── */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-1 scrollbar-thin lg:px-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex w-full flex-col items-center justify-center gap-1 rounded-button py-2.5 transition-colors duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "lg:flex-row lg:justify-start lg:gap-3 lg:px-3",
                    isActive ? "bg-surface-container-high" : "hover:bg-surface-container-high/60",
                  )}
                >
                  <span className="relative">
                    <Icon
                      className={cn("h-5 w-5", isActive ? activeTxt : idleTxt)}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      aria-hidden="true"
                    />
                    {tab.id === "core" && (
                      <span
                        className={cn(
                          "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-muted-foreground ring-2 ring-card",
                          isActive ? "opacity-100" : "opacity-60",
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] leading-none lg:flex-1 lg:text-left lg:text-[15px]",
                      isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                    )}
                  >
                    {t(tab.i18nKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
