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

  if (!isAuthenticated) {
    // Se non è loggato, via al login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se è arrivato qui, è loggato (o con Google o con User/Pass). Fallo passare!
  return <>{children}</>;
}
