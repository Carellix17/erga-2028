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
 * D2 (DESIGN.md 1.1 §9) — Navigazione principale unificata.
 *
 * Quattro destinazioni con etichette persistenti, nello stesso ordine su
 * ogni formato: Home, Piano, Studio, Core. Core è una destinazione come le
 * altre: niente cerchio staccato. Le voci sono SOLO destinazioni — gli
 * strumenti (chat, esercizi, interrogazione, palestra) vivono nel Banco
 * di Studio.
 *
 * · TELEFONO (<768px): UN dock flottante rettangolare (raggio 0), opaco
 *   (bg-card) con bordo e ombra controllati, Core incluso. Selezione =
 *   testo nel tono profondo di marca + barretta geometrica ottanio sopra
 *   la voce + aria-current. Safe area rispettata; lo spazio del dock è
 *   riservato dal contenuto (vedi AppLayout).
 * · FINESTRE MEDIE (768–1199px): rail sospesa compatta, icone con
 *   etichette; stessa voce attiva con tinta di marca e barretta.
 * · DESKTOP (≥1200px): sidebar sospesa con etichette e spazio, brand in
 *   cima e menu che scorre da solo se lo schermo è basso.
 *
 * La navigazione non sparisce con lo scroll ordinario; nelle sessioni
 * immersive è la shell a ritirarla (hideChrome in AppLayout), lasciando
 * l'uscita chiara della sessione stessa.
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
  const activeTxt = "text-brand-deep";

  return (
    <>
      {/* ════════ TELEFONO (<768px): dock flottante rettangolare unico ════════ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none md:hidden"
        aria-label={t("nav.ariaPrimary") || "Navigazione principale"}
      >
        <div
          className={cn(
            material,
            "mx-auto max-w-lg pointer-events-auto shadow-level-3",
            "mb-[max(env(safe-area-inset-bottom,0px),0.75rem)]",
          )}
        >
          <div className="grid grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {/* Indicatore geometrico: barretta ottanio sopra la voce attiva.
                      Si anima brevemente alla selezione e poi resta ferma. */}
                  {isActive && (
                    <motion.span
                      layoutId="dockTabIndicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 bg-brand"
                      aria-hidden
                    />
                  )}
                  <span className="relative">
                    <Icon
                      className={cn("h-[22px] w-[22px]", isActive ? activeTxt : idleTxt)}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      aria-hidden="true"
                    />
                    {tab.id === "core" && (
                      <span
                        className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-muted-foreground ring-2 ring-card"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] leading-none",
                      isActive ? "font-semibold text-brand-deep" : "font-medium text-muted-foreground",
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

      {/* ════════ RAIL (768–1199px) e SIDEBAR (≥1200px): colonna sospesa ════════
           In-flow dentro l'app shell sigillata (vedi AppLayout): colonna flex
           che non scorre mai. Da 1200px le voci passano da verticali (rail,
           icona sopra etichetta) a orizzontali (sidebar, con il brand esteso). */}
      <nav
        className="hidden md:flex md:h-full md:w-[84px] md:shrink-0 md:flex-col xl:w-64"
        aria-label={t("nav.ariaPrimary") || "Navigazione principale"}
      >
        <div className={cn(material, "flex h-full w-full flex-col overflow-hidden shadow-level-2")}>
          {/* ── Brand: icona sulla rail, nome completo sulla sidebar ── */}
          <div className="flex shrink-0 items-center justify-center px-2 pb-4 pt-5 xl:justify-start xl:gap-2 xl:px-5 xl:pb-6 xl:pt-6">
            <span className="grid h-7 w-7 place-items-center bg-surface-container-high">
              <Brain className="h-4 w-4 text-foreground" strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="hidden text-xl font-bold tracking-tight xl:block">Erga</span>
          </div>

          {/* ── Menu: scorre DA SOLO se lo schermo è basso (tablet landscape) ── */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-1 scrollbar-thin xl:px-3">
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
                    "xl:flex-row xl:justify-start xl:gap-3 xl:px-3",
                    isActive ? "bg-brand-tint" : "hover:bg-surface-container-high",
                  )}
                >
                  {/* Indicatore geometrico: barretta in alto sulla rail,
                      verticale a sinistra sulla sidebar. */}
                  {isActive && (
                    <motion.span
                      layoutId="railTabIndicator"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute top-1 left-1/2 h-[3px] w-6 -translate-x-1/2 bg-brand xl:top-1/2 xl:left-1 xl:h-5 xl:w-[3px] xl:-translate-x-0 xl:-translate-y-1/2"
                      aria-hidden
                    />
                  )}
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
                      "text-[13px] leading-none xl:flex-1 xl:text-left xl:text-[15px] xl:font-semibold",
                      isActive ? "font-semibold text-brand-deep" : "font-medium text-muted-foreground",
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
