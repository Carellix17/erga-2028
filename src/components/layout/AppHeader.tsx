import { ArrowLeft, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string | null;
  subtitle?: string;
  showBack?: boolean;
  integratedHome?: boolean;
  className?: string;
}

const SETTINGS_ROOTS = ["/app/impostazioni", "/app/settings", "/impostazioni", "/settings"];

/**
 * AppHeader — barra di stato dell'app (decisione del proprietario, 6 ottobre 2026).
 *
 * La barra non mostra più la serie né il piano: restano il contenuto della
 * sezione (o il wordmark sulla Home) e le Impostazioni a destra.
 *
 * Sulla Home del TELEFONO il piano vive accanto al wordmark: «Erga» è una
 * scritta, il piano un tasto — sullo stesso livello, nella stessa riga.
 * Il tasto porta alle Impostazioni, dove la carta del piano lo racconta
 * per esteso. Su desktop e nelle altre sezioni il tasto non esiste.
 */
export function AppHeader({
  title,
  subtitle,
  showBack = false,
  integratedHome = false,
  className,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isSettingsRoute = SETTINGS_ROOTS.some(
    (root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`),
  );

  // Piano: Free / Pro / Beta (useSubscription gestisce il caricamento).
  const { tier } = useSubscription();
  const tierLabel = tier === "beta" ? "Beta" : tier === "pro" ? "Pro" : "Free";

  // Il tasto del piano: SOLO telefono, SOLO Home, accanto alla scritta Erga.
  const planButton = (
    <button
      type="button"
      onClick={() => navigate("/app/impostazioni")}
      aria-label={t("header.subscriptionPlan", { plan: tierLabel })}
      title={t("header.subscriptionPlan", { plan: tierLabel })}
      className={cn(
        "flex h-8 shrink-0 items-center rounded-pill border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "md:hidden",
        // Sulla Home la barra è un overlay senza eventi: solo i controlli
        // reali tornano cliccabili, non l'intera fascia trasparente.
        integratedHome && "pointer-events-auto",
      )}
    >
      {tierLabel}
    </button>
  );

  return (
    <header
      className={cn(
        "z-40 w-full",
        integratedHome
          ? "pointer-events-none absolute inset-x-0 top-0 bg-transparent"
          : "sticky top-0 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-lg min-w-0 items-center gap-2 px-4 sm:px-6 md:max-w-2xl lg:max-w-4xl">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {integratedHome ? (
            <>
              {/* Wordmark: SOLO sulla Home, dove la barra non ha titolo.
                  È un <p>, non un titolo: l'unico h1 della Home è il saluto.
                  Il tasto del piano gli sta accanto, sullo stesso livello
                  (solo telefono: su desktop la barra resta solo scritta). */}
              <p className="font-display text-[1.65rem] font-medium leading-none tracking-tight text-foreground">
                Erga
              </p>
              {planButton}
            </>
          ) : (
            <>
              {showBack && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.back")}
                  onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/app"))}
                  className="h-11 w-11 shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
              )}

              {title && (
                <div className="min-w-0 flex-1 text-left">
                  <h1 className="truncate text-left font-display text-lg font-bold leading-tight text-foreground">{title}</h1>
                  {subtitle && <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className={cn("ml-auto flex shrink-0 items-center gap-2", integratedHome && "pointer-events-auto")}>
          {/* Le Impostazioni restano in cima a destra. Nascoste solo dentro
              le pagine impostazioni, che hanno già la loro navigazione con
              indietro. Niente più serie né piano qui: il piano vive nella
              sua carta (Impostazioni) e accanto al wordmark sulla Home
              del telefono. */}
          {!isSettingsRoute && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("header.settings")}
              title={t("header.settings")}
              onClick={() => navigate("/app/impostazioni")}
              className="h-11 w-11 shrink-0 bg-surface-container-high shadow-none hover:bg-surface-container-highest"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
