import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 🎬 P14: il sipario condivide il cronometro con Landing e Index
  const splash = useSplashGate(isLoading);
  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  // 🛡️ Finché la sessione non è stata letta NON si può decidere se l'utente
  // è loggato: senza questa attesa, su reti lente si finiva al login pur
  // essendo autenticati. Il sipario è già caduto: mostriamo la sua grafica.
  if (isLoading) {
    return <SplashScreen leaving={false} />;
  }

  if (!isAuthenticated) {

    // Se non è loggato, via al login conservando la destinazione in `?next=`
    // (il Login la usa per il redirect dopo OAuth/password). Lo stato
    // `location.state` da solo non basta: il Login legge solo `?next`.
    const fromPath = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(fromPath)}`}
        state={{ from: location }}
        replace
      />
    );
  }

  // Se è arrivato qui, è loggato (o con Google o con User/Pass). Fallo passare!
  return <>{children}</>;
}
