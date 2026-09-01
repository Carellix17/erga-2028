/**
 * HomeHeader — saluto minimale in cima alla Home.
 * Il nome arriva dai dati reali del profilo, il saluto cambia in base all'ora.
 * L'avatar con il profilo vive nella barra in alto a destra (AppHeader):
 * qui non c'è più alcun pulsante duplicato.
 *
 * Tipografia: il saluto è l'unico punto dell'app che usa 'Zalando Sans Expanded'
 * (utility `font-welcome`), caricato da Google Fonts con asse dei pesi 200–900.
 * La classe sta sia sul div sia sull'h1: la regola `h1 { font-family }` di
 * @layer base vince sull'ereditarietà, solo il layer utilities la scavalca.
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
      <div className="min-w-0 font-welcome">
        <h1 className="truncate font-welcome text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {greeting ? `${greeting}, ${userName}` : userName}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
