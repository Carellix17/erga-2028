/**
 * HomeHeader — saluto minimale in cima alla Home.
 * Il nome arriva dai dati reali del profilo, il saluto cambia in base all'ora.
 * L'avatar con il profilo vive nella barra in alto a destra (AppHeader):
 * qui non c'è più alcun pulsante duplicato.
 */
export interface HomeHeaderProps {
  greeting?: string;
  userName?: string;
  subtitle?: string | null;
}

export function HomeHeader({
  greeting,
  userName = "",
  subtitle,
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
    </header>
  );
}
