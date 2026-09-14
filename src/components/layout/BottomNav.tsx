import { BookOpen, Brain, CalendarDays, Hexagon, Home as HomeIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export type Tab = "home" | "studio" | "piano" | "pratica" | "core";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "home" as Tab, i18nKey: "nav.home", icon: HomeIcon },
  { id: "piano" as Tab, i18nKey: "nav.piano", icon: CalendarDays },
  { id: "studio" as Tab, i18nKey: "nav.studio", icon: BookOpen },
];

// P24 × MONOCROMO — la nav è una PILLOLA SOSPESA materica:
// vetro chiaro (bg-white/90 + blur), bordo definito, voce attiva in
// NERO PIENO (stile bottoni primari) e indicatore neutro.
// Core: cerchio staccato AL LATO (esagono, il centro di personalizzazione),
// stesso materiale della pillola. Pratica vive nella Home.
//
// DESKTOP (≥768px): sidebar-card sospesa stile Apple Music su macOS/iPadOS —
// arrotondata (rounded-3xl), staccata dal bordo della finestra, FERMA mentre
// il contenuto scorre nella card accanto. Se le voci eccedono l'altezza
// disponibile (tablet in landscape) il menu scorre DA SOLO dentro la card:
// brand in cima e Core in fondo restano sempre visibili.
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();

  const pillMaterial =
    "bg-card/95 backdrop-blur-md border border-border text-card-foreground";
  const activeFill = "bg-primary text-primary-foreground";
  const idleTxt = "text-muted-foreground";

  return (
    <>
      {/* ════════ MOBILE: barra in basso (pillola + cerchio Core) ════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pointer-events-none md:hidden">
        {/* ── Alone nero sfumato ── fascia scura che avvolge la pillola
             e sfuma verso il contenuto della pagina per massimizzare il contrasto. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/85 to-transparent"
          aria-hidden
        />
        <div className="max-w-lg mx-auto pointer-events-auto mb-[max(env(safe-area-inset-bottom,0px),1rem)] flex items-center gap-2.5">
          {/* ── Pillola ── */}
          <div className={cn(pillMaterial, "rounded-pill shadow-level-2 flex-1 min-w-0")}>
            {/* Telefono: pillola con SOTTO-PILLOLA FLUIDA (layoutId) */}
            <div className="relative grid grid-cols-3 items-center justify-items-center h-[4.5rem] px-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className="relative w-full flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeTabBackground"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="absolute inset-0 rounded-pill bg-secondary"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex items-center justify-center rounded-pill",
                        "w-12 h-8",
                      )}
                    >
                      <Icon
                        className={cn("w-[22px] h-[22px]", isActive ? "text-foreground" : idleTxt)}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                    </span>
                    <span
                      className={cn(
                        "label-small relative z-10",
                        isActive ? "font-bold text-foreground" : idleTxt,
                      )}
                    >
                      {t(tab.i18nKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Core mobile: cerchio accanto alla pillola, stesso materiale ── */}
          <button
            type="button"
            onClick={() => onTabChange("core")}
            aria-label={t("nav.core")}
            aria-current={activeTab === "core" ? "page" : undefined}
            className={cn(
              "relative w-[4.5rem] h-[4.5rem] rounded-pill flex items-center justify-center flex-shrink-0 shadow-level-2 transition-transform duration-150 active:scale-90",
              pillMaterial,
            )}
          >
            {activeTab === "core" && (
              <motion.span
                layoutId="activeTabBackground"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-pill bg-secondary"
                aria-hidden
              />
            )}
            <Hexagon className="relative z-10 w-5 h-5" strokeWidth={2} />
            <span className="absolute top-1 right-1 w-3 h-3 rounded-pill bg-muted-foreground border-2 border-card" />
          </button>
        </div>
      </nav>

      {/* ════════ DESKTOP: sidebar-card sospesa (Apple Music) ════════
           In-flow dentro l'app shell sigillata (vedi AppLayout): niente
           posizionamento fixed, è una colonna flex a sé che non scorre mai. */}
      <nav className="hidden md:flex md:h-full md:w-64 md:shrink-0 md:flex-col" aria-label="Navigazione principale">
        <div
          className={cn(
            pillMaterial,
            "flex h-full w-full flex-col rounded-3xl shadow-level-2 overflow-hidden",
          )}
        >
          {/* ── Brand ── sempre visibile in cima */}
          <div className="flex items-center gap-2 px-5 pb-6 pt-6 shrink-0">
            <span className="w-7 h-7 rounded-pill bg-surface-container-high flex items-center justify-center">
              <Brain className="w-4 h-4" strokeWidth={2} />
            </span>
            <span className="font-bold text-xl tracking-tight">Erga</span>
          </div>

          {/* ── Menu ── scorre DA SOLO se lo schermo è basso (tablet landscape) */}
          <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto px-3 scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-button transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? activeFill : "hover:bg-surface-container-high",
                  )}
                >
                  <Icon
                    className={cn("w-5 h-5", isActive ? "" : idleTxt)}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={cn(
                      "flex-1 text-left text-[15px] font-semibold",
                      isActive ? "" : idleTxt,
                    )}
                  >
                    {t(tab.i18nKey)}
                  </span>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-pill",
                      isActive ? "bg-primary-foreground" : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* ── Core ── sempre visibile in fondo, mai tagliato dallo scroll */}
          <div className="shrink-0 px-3 pt-3 pb-4">
            <button
              onClick={() => onTabChange("core")}
              aria-current={activeTab === "core" ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-button transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === "core" ? activeFill : "hover:bg-surface-container-high",
              )}
            >
              <span className="relative">
                <Hexagon
                  className={cn("w-5 h-5", activeTab === "core" ? "" : idleTxt)}
                  strokeWidth={2}
                />
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-pill bg-muted-foreground border border-card",
                    activeTab === "core" ? "opacity-100" : "opacity-60",
                  )}
                />
              </span>
              <span
                className={cn(
                  "flex-1 text-left text-[15px] font-semibold",
                  activeTab === "core" ? "" : idleTxt,
                )}
              >
                {t("nav.core")}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
