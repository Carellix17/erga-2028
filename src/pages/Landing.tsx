import { Navigate, Link } from "react-router-dom";
import { Brain } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { DemoFlow } from "@/components/demo/DemoFlow";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// 🌿 P21d ERGA OPAL — LA VETRINA. Resta vestita di chiaro (carta avorio)
// anche quando l'app è in smoking nero: la magia è `.force-light`.
// Via blob sfocati, puntini e colori scritti a mano: titolo 800, una goccia
// di salvia sulla seconda riga, pill-firma in alto a destra.

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  // 🎬 P14: il sipario d'apertura — un solo spettacolo per tutti i cancelli
  const splash = useSplashGate(isLoading);

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <div className="force-light min-h-screen bg-background relative">
      <header className="flex items-center justify-between max-w-5xl mx-auto px-5 sm:px-8 h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" strokeWidth={1.75} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">Erga</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <LanguageSwitcher />
          <Link
            to="/login"
            className="px-3 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("landing.signIn")}
          </Link>
          <Link
            to="/registrati"
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            {t("landing.signUp")}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
            {t("landing.tagline")}
          </p>
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-[1.05] text-foreground tracking-tight">
            {t("landing.titleTop")}
            <br />
            <span className="text-tertiary">{t("landing.titleBottom")}</span>
          </h1>
          <p className="mt-5 text-muted-foreground text-base sm:text-lg leading-relaxed">
            {t("landing.subtitle")}
          </p>
        </div>

        <DemoFlow />
      </main>

      <footer className="pb-8 text-center text-xs text-muted-foreground">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
