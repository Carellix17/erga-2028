import { ArrowLeft, Flame, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string | null;
  subtitle?: string;
  showBack?: boolean;
  className?: string;
}

export function AppHeader({ title, subtitle, showBack = false, className }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const dashboard = useHomeDashboard();
  const streakDays = dashboard.data?.streakDays ?? 0;
  const streakLabel = streakDays > 0
    ? t("header.streak", { count: streakDays })
    : t("header.startStreak");

  const openSettings = () => {
    if (location.pathname.startsWith("/app/impostazioni/") && location.pathname !== "/app/impostazioni") {
      navigate("/app/impostazioni");
      return;
    }
    if (location.pathname !== "/app/impostazioni") navigate("/app/impostazioni");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 shadow-level-1 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
        className,
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-lg min-w-0 items-center gap-2 px-3 min-[360px]:px-4 md:max-w-2xl lg:max-w-4xl lg:px-6">
        <div className="flex min-w-0 shrink items-center gap-2">
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("common.back")}
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/app"))}
              className="h-10 w-10 shrink-0 rounded-pill"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t("header.settings")}
            onClick={openSettings}
            className="h-10 w-10 shrink-0 rounded-pill bg-card shadow-none"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div
            className="flex h-10 min-w-10 max-w-[8.5rem] items-center gap-1.5 rounded-pill border border-border bg-surface-container-high px-2.5 text-sm font-semibold text-foreground"
            aria-label={streakLabel}
          >
            <Flame className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="truncate min-[360px]:hidden">{streakDays}</span>
            <span className="hidden truncate min-[360px]:inline">{streakLabel}</span>
          </div>
        </div>

        {title && (
          <div className="ml-auto min-w-0 max-w-[44%] text-right">
            <h1 className="truncate font-display text-lg font-bold leading-tight text-foreground">{title}</h1>
            {subtitle && <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>}
          </div>
        )}
      </div>
    </header>
  );
}
