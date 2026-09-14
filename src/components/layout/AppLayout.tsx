import type { ReactNode } from "react";
import { BottomNav, type Tab } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
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

/**
 * 🏠 App shell — Erga
 *
 * MOBILE (<768px): scroll del documento, navbar in basso fissa (pillola).
 *
 * DESKTOP/TABLET (≥768px): viewport "sigillata" (h-dvh + overflow-hidden) con
 * due card sospese e indipendenti, stile Apple Music su macOS/iPadOS:
 * - a sinistra la sidebar-card (vedi BottomNav): arrotondata, staccata dal
 *   bordo, ferma mentre il contenuto scorre;
 * - a destra la content-card: è l'UNICA a scorrere (overflow-y-auto), con
 *   l'intestazione appiccicosa che resta in cima al suo scroll.
 * Lo scroll dell'app su desktop avviene quindi dentro #app-scroll-view
 * (vedi src/lib/appScroll.ts), mai sulla finestra → zero doppie scrollbar.
 * Con hideChrome il contenuto è full-bleed (lezioni/esercizi a schermo intero).
 */
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
        "flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background bg-dot-grid md:flex-row",
        // 🖥️ Shell desktop: viewport sigillata con distacco perimetrale (p-3)
        // e spazio tra le due card (gap-3). Su mobile niente cambia.
        "md:h-dvh md:min-h-0 md:overflow-hidden md:gap-3 md:p-3",
        // 📱 Modalità riempi-schermo (Pratica): sigillata anche su mobile
        fillViewport && "h-dvh min-h-0 overflow-hidden",
      )}
    >
      {!hideChrome && <BottomNav activeTab={activeTab} onTabChange={onTabChange} />}
      <div
        id="app-scroll-view"
        className={cn(
          "relative flex min-w-0 max-w-full flex-1 flex-col",
          // 🖥️ Content-card: superficie dedicata, angoli arrotondati, ombra.
          // In modalità normale è lei a scorrere (header incluso); in modalità
          // fillViewport lo scroll è gestito dalle viste interne.
          "md:h-full md:min-h-0 md:rounded-3xl md:border md:border-border md:bg-background md:shadow-level-2",
          fillViewport ? "min-h-0 md:overflow-hidden" : "md:overflow-x-hidden md:overflow-y-auto",
        )}
      >
        {!hideChrome && <AppHeader title={headerTitle} integratedHome={isHome} />}
        <main
          className={cn(
            "mx-auto w-full max-w-lg overflow-visible px-4 pb-24 sm:px-6 md:max-w-2xl md:pb-6 lg:max-w-4xl",
            fillViewport && "flex min-h-0 flex-1 flex-col overflow-hidden",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
