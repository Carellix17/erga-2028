import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { ErgaMarketing, FAQ } from "@/components/landing/ErgaMarketing";
import { SeoHead } from "@/components/SeoHead";

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([name, text]) => ({
    "@type": "Question",
    name,
    acceptedAnswer: {
      "@type": "Answer",
      text,
    },
  })),
};

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const splash = useSplashGate(isLoading);

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <>
      <SeoHead
        title="Erga — App per studiare con piano di studio personalizzato"
        description="Erga è l'app per studiare che trasforma PDF, foto e appunti in lezioni brevi, esercizi e un piano di studio su misura per te. Beta gratuita per le superiori."
        path="/"
        jsonLd={faqSchema}
      />
      <ErgaMarketing />
    </>
  );
}
