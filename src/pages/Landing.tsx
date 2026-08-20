import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { hasStoredSessionHint } from "@/lib/authSessionHint";
import { ErgaMarketing } from "@/components/landing/ErgaMarketing";

/**
 * Valutato una volta all'import, non a ogni render: serve a sapere *prima*
 * del primo paint se abbiamo davanti un visitatore anonimo. Se lo è, lo
 * splash non deve nemmeno essere sfiorato — altrimenti l'LCP della pagina
 * che deve convertire diventa uno schermo di cortesia da 2,4 secondi.
 */
const RETURNING_VISITOR = hasStoredSessionHint();

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();

  // Solo chi ha una sessione salvata vede l'attesa, e senza tempo minimo:
  // così non gli lampeggia la pagina pubblica prima del redirect a /app.
  const splash = useSplashGate(isLoading, {
    enabled: RETURNING_VISITOR,
    minVisibleMs: 0,
  });

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return <ErgaMarketing />;
}
