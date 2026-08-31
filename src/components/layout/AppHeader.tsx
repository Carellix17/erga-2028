import { ArrowLeft, Flame, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string | null;
  subtitle?: string;
  showBack?: boolean;
  integratedHome?: boolean;
  className?: string;
}

const SETTINGS_ROOTS = ["/app/impostazioni", "/app/settings", "/impostazioni", "/settings"];

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
  const dashboard = useHomeDashboard();
  const streakDays = dashboard.data?.streakDays ?? 0;
  const streakLabel = streakDays > 0
    ? t("header.streak", { count: streakDays })
    : t("header.startStreak");
  const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
  const isSettingsRoute = SETTINGS_ROOTS.some(
    (root) => normalizedPath === root || normalizedPath.startsWith(`${root}/`),
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
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.back")}
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/app"))}
              className="h-11 w-11 shrink-0 rounded-pill"
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
        </div>

        <div className={cn("ml-auto flex shrink-0 items-center gap-2", integratedHome && "pointer-events-auto")}>
          <button
            type="button"
            onClick={() => navigate("/app/ritmo")}
            aria-label={t("header.openFocusStats", { count: streakDays })}
            title={t("header.openFocusStats", { count: streakDays })}
            className="flex min-h-11 min-w-11 max-w-[8.5rem] items-center gap-1.5 rounded-pill bg-surface-container-high px-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Flame className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="truncate min-[360px]:hidden">{streakDays}</span>
            <span className="hidden truncate min-[360px]:inline">{streakLabel}</span>
          </button>

          {/* Il profilo è la casa dell'avatar: le Impostazioni vivono lì,
              in alto a destra. L'avatar resta nascosto solo nelle rotte
              impostazioni (che hanno già la loro navigazione con indietro). */}
          {!isSettingsRoute && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("home.header.avatarAria")}
              title={t("home.header.avatarAria")}
              onClick={() => navigate("/app/profilo")}
              className="h-11 w-11 shrink-0 rounded-pill bg-surface-container-high shadow-none hover:bg-surface-container-highest"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
