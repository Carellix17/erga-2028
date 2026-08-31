import { User } from "lucide-react";

/**
 * HomeHeader — saluto minimale in cima alla Home.
 * Il nome arriva dai dati reali del profilo, il saluto cambia in base all'ora.
 * L'avatar in alto a destra è opzionale: viene mostrato solo se la Home
 * riceve un gestore di clic (la navigazione resta decisa dalla pagina).
 */
export interface HomeHeaderProps {
  greeting?: string;
  userName?: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  onAvatarClick?: () => void;
  avatarAriaLabel?: string;
}

export function HomeHeader({
  greeting,
  userName = "",
  subtitle,
  avatarUrl,
  onAvatarClick,
  avatarAriaLabel = "Profilo",
}: HomeHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {greeting ? `${greeting}, ${userName}` : userName}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {onAvatarClick && (
        <button
          type="button"
          onClick={onAvatarClick}
          aria-label={avatarAriaLabel}
          className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-container-high transition-colors hover:bg-surface-container-highest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-foreground" aria-hidden="true" />
          )}
        </button>
      )}
    </header>
  );
}
