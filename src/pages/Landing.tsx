import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { ErgaMarketing } from "@/components/landing/ErgaMarketing";

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const splash = useSplashGate(isLoading);

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return <ErgaMarketing />;
}
