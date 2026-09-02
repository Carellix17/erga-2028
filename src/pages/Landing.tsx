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
        title="Erga — Dal tuo materiale a un percorso di studio"
        description="Carica PDF, documenti o immagini e trasforma il materiale in lezioni brevi, esercizi e un piano di studio personalizzato. Beta gratuita per le scuole superiori."
        path="/"
        jsonLd={faqSchema}
      />
      <ErgaMarketing />
    </>
  );
}
