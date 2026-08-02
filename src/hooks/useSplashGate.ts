import { useEffect, useState } from "react";
import { stampSplashStart, splashElapsedMs } from "@/components/shared/splashState";

const MIN_VISIBLE_MS = 2000; // lo spettacolino minimo, anche su telefoni fulminei

/**
 * 🎬 P14 — Cancello del sipario: restituisce showSplash finché l'app non è
 * pronta E non è trascorso il tempo minimo di scena. `leaving` pilota la
 * dissolvenza finale. Il cronometro è condiviso: dei tre cancelli d'avvio
 * (Landing, ProtectedRoute, Index) lo spettacolo resta UNO SOLO.
 */
export function useSplashGate(isLoading: boolean): { showSplash: boolean; leaving: boolean } {
  const [showSplash, setShowSplash] = useState(() => {
    stampSplashStart();
    return isLoading;
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    stampSplashStart();
    if (isLoading) {
      setShowSplash(true);
      return;
    }
    const wait = Math.max(0, MIN_VISIBLE_MS - splashElapsedMs());
    const t1 = window.setTimeout(() => setLeaving(true), wait);
    const t2 = window.setTimeout(() => setShowSplash(false), wait + 420); // durata dissolvenza
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isLoading]);

  return { showSplash, leaving };
}
