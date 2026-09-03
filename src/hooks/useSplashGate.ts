import { useEffect, useState } from "react";
import { stampSplashStart, splashElapsedMs } from "@/components/shared/splashState";

const MIN_VISIBLE_MS = 650; // lo spettacolino minimo, anche su telefoni fulminei
const MAX_VISIBLE_MS = 1500; // 🚨 valvola di sicurezza: oltre questo il sipario si alza COMUNQUE

/**
 * 🎬 P14 — Cancello del sipario: restituisce showSplash finché l'app non è
 * pronta E non è trascorso il tempo minimo di scena. `leaving` pilota la
 * dissolvenza finale. Il cronometro è condiviso: dei tre cancelli d'avvio
 * (Landing, ProtectedRoute, Index) lo spettacolo resta UNO SOLO.
 *
 * 🚨 Nessuna attesa infinita: se la rete (sessione, profilo, primo fetch) è
 * lenta o non risponde, dopo MAX_VISIBLE_MS l'interfaccia viene sbloccata
 * lo stesso — meglio una vista con dati in arrivo che uno splash eterno.
 */
export function useSplashGate(isLoading: boolean): { showSplash: boolean; leaving: boolean } {
  const [showSplash, setShowSplash] = useState(() => {
    stampSplashStart();
    return isLoading;
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    stampSplashStart();

    // Valvola di sicurezza sempre armata, anche mentre isLoading resta true.
    const hardWait = Math.max(0, MAX_VISIBLE_MS - splashElapsedMs());
    const hard1 = window.setTimeout(() => setLeaving(true), hardWait);
    const hard2 = window.setTimeout(() => setShowSplash(false), hardWait + 420);

    if (isLoading) {
      return () => {
        window.clearTimeout(hard1);
        window.clearTimeout(hard2);
      };
    }

    const wait = Math.max(0, MIN_VISIBLE_MS - splashElapsedMs());
    const t1 = window.setTimeout(() => setLeaving(true), wait);
    const t2 = window.setTimeout(() => setShowSplash(false), wait + 420); // durata dissolvenza
    return () => {
      window.clearTimeout(hard1);
      window.clearTimeout(hard2);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isLoading]);

  return { showSplash, leaving };
}
