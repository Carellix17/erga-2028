import { BookOpen, CalendarDays, Hexagon, Home as HomeIcon } from "lucide-react";
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
// DESKTOP: la vecchia sidebar da 256px non esiste più. La nav diventa
// la stessa pillola della versione mobile, ruotata in verticale e
// sospesa in ALTO A SINISTRA (Home in cima, Piano in mezzo, Studio in
// fondo — stesso materiale, stessa sotto-pillola, stessi etichette) e il
// cerchio Core staccato in BASSO A SINISTRA. La pillola è compatta e
// non arriva mai a metà schermo.
export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { t } = useTranslation();

  const pillMaterial =
    "bg-card/95 backdrop-blur-md border border-border text-card-foreground";
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

      {/* ════════ DESKTOP: pillola verticale in alto a sinistra + cerchio
                   Core in basso a sinistra (stesso materiale della mobile) ════════ */}
      <nav className="hidden md:block">
        {/* ── Pillola (desktop): verticale — Home sopra, Piano al centro,
             Studio in basso ── */}
        <div
          className={cn(
            pillMaterial,
            "fixed top-6 left-6 z-50 flex flex-col items-center justify-center gap-0.5 rounded-pill shadow-level-2 px-2 py-2",
          )}
        >
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
                    layoutId="activeTabBackgroundDesktop"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-pill bg-secondary"
                    aria-hidden
                  />
                )}
                <span className="relative z-10 flex items-center justify-center rounded-pill w-12 h-8">
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

        {/* ── Core (desktop): cerchio staccato in basso a sinistra,
             identico al tasto Core della versione mobile ── */}
        <button
          type="button"
          onClick={() => onTabChange("core")}
          aria-label={t("nav.core")}
          aria-current={activeTab === "core" ? "page" : undefined}
          className={cn(
            "fixed bottom-6 left-6 z-50 relative w-[4.5rem] h-[4.5rem] rounded-pill flex items-center justify-center shadow-level-2 transition-transform duration-150 active:scale-90",
            pillMaterial,
          )}
        >
          {activeTab === "core" && (
            <motion.span
              layoutId="activeTabBackgroundDesktop"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute inset-0 rounded-pill bg-secondary"
              aria-hidden
            />
          )}
          <Hexagon className="relative z-10 w-5 h-5" strokeWidth={2} />
          <span className="absolute top-1 right-1 w-3 h-3 rounded-pill bg-muted-foreground border-2 border-card" />
        </button>
      </nav>
    </>
  );
}
