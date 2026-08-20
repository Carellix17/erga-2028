import { useEffect, useState } from "react";
import { stampSplashStart, splashElapsedMs } from "@/components/shared/splashState";

const DEFAULT_MIN_VISIBLE_MS = 2000; // lo spettacolino minimo dentro l'app
const FADE_MS = 420; // durata della dissolvenza finale

export type SplashGateOptions = {
  /**
   * Tempo minimo di scena. 0 = nessuna attesa artificiale: appena l'auth è
   * risolta si passa al contenuto, senza dissolvenza.
   */
  minVisibleMs?: number;
  /**
   * false = mai splash. Usato dalla landing pubblica: lì il primo pixel
   * utile deve essere l'hero, non un logo.
   */
  enabled?: boolean;
};

/**
 * 🎬 P14 — Cancello del sipario: restituisce showSplash finché l'app non è
 * pronta E non è trascorso il tempo minimo di scena. `leaving` pilota la
 * dissolvenza finale. Il cronometro è condiviso: dei tre cancelli d'avvio
 * (Landing, ProtectedRoute, Index) lo spettacolo resta UNO SOLO.
 *
 * Le opzioni servono a non pagare quel tempo minimo dove danneggia:
 * sulla pagina pubblica 2s di splash sono 2s di LCP regalati.
 */
export function useSplashGate(
  isLoading: boolean,
  options: SplashGateOptions = {},
): { showSplash: boolean; leaving: boolean } {
  const { minVisibleMs = DEFAULT_MIN_VISIBLE_MS, enabled = true } = options;

  const [showSplash, setShowSplash] = useState(() => {
    if (!enabled) return false;
    stampSplashStart();
    return isLoading;
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShowSplash(false);
      setLeaving(false);
      return;
    }

    stampSplashStart();

    if (isLoading) {
      setShowSplash(true);
      setLeaving(false);
      return;
    }

    // Nessun tempo minimo richiesto: via subito, senza dissolvenza.
    if (minVisibleMs === 0) {
      setShowSplash(false);
      return;
    }

    const wait = Math.max(0, minVisibleMs - splashElapsedMs());
    const t1 = window.setTimeout(() => setLeaving(true), wait);
    const t2 = window.setTimeout(() => setShowSplash(false), wait + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isLoading, enabled, minVisibleMs]);

  return { showSplash: enabled && showSplash, leaving };
}
