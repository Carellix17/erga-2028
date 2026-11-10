import type { ReactNode } from "react";
import { BottomNav, type Tab } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { ScrollEdges } from "@/components/layout/ScrollEdges";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  headerTitle?: string | null;
  hideChrome?: boolean;
  /**
   * Modalità "riempi lo schermo": usata dalle viste che gestiscono da sole il
   * proprio scroll interno (es. Pratica: chat, interrogazione, esercizi).
   * La pagina diventa alta esattamente quanto il viewport reale (dvh, sicuro
   * con le tastiere mobili) e il contenuto si distribuisce in colonna fless,
   * così la barra di input in fondo non finisce MAI sotto la barra di
   * navigazione fissa in basso.
   */
  fillViewport?: boolean;
  children: ReactNode;
}

/** Attached mobile bar and desktop sidebar; one scroll owner per viewport. */
export function AppLayout({
  activeTab,
  onTabChange,
  headerTitle,
  hideChrome = false,
  fillViewport = false,
  children,
}: AppLayoutProps) {
  const isHome = activeTab === "home";

  return (
    <div
      className={cn(
        "erga-app-shell flex min-h-screen min-h-dvh w-full max-w-full flex-col overflow-x-hidden bg-background md:flex-row",
        // Desktop: attached sidebar and a single scrolling content surface.
        "md:h-dvh md:min-h-0 md:overflow-hidden md:gap-0 md:p-0",
        // 📱 Modalità riempi-schermo (Pratica): sigillata anche su mobile
        fillViewport && "h-dvh min-h-0 overflow-hidden",
      )}
    >
      {!hideChrome && <BottomNav activeTab={activeTab} onTabChange={onTabChange} />}
      <div
        id="app-scroll-view"
        className={cn(
          "relative flex min-w-0 max-w-full flex-1 flex-col",
          // 📄 V2-02b — grana del TAVOLO sulla Home: qui è la superficie
          // dell'avorio (la content-card su desktop, il tavolo visibile
          // su mobile, dove questo contenitore è trasparente). Intensità
          // da token --grain-table-tile (calibrata sul composito reale),
          // più presente dei fogli ma sempre solo variazione fine. Il
          // velo è un background-image: sta sotto ogni contenuto.
          // Gate isHome: le altre schede restano lisce finché il
          // proprietario non estende la prova.
          isHome && "table-grain",
          // Normal views scroll here; immersive tools own their internal scroll.
          "md:h-full md:min-h-0 md:border-l md:border-border md:bg-background",
          fillViewport ? "min-h-0 md:overflow-hidden" : "md:overflow-x-hidden md:overflow-y-auto",
        )}
      >
        {!hideChrome && <AppHeader title={headerTitle} integratedHome={isHome} />}
        <ScrollEdges
          enabled={!fillViewport}
          bare={hideChrome}
          className={cn(
            // Clear the floating phone dock (pill, Core circle, and the short veil).
            "mx-auto w-full max-w-lg overflow-visible px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:px-6 md:max-w-2xl md:pb-6 lg:max-w-7xl",
            fillViewport && "flex min-h-0 flex-1 flex-col overflow-hidden",
          )}
        >
          {children}
        </ScrollEdges>
        <div className="erga-earthy-stripe" aria-hidden="true" />
      </div>
    </div>
  );
}

