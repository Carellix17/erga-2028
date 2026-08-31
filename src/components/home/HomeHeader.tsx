/**
 * HomeHeader — saluto minimale in cima alla Home.
 * Il nome arriva dai dati reali del profilo, il saluto cambia in base all'ora.
 * L'avatar con il profilo vive nella barra in alto a destra (AppHeader):
 * qui non c'è più alcun pulsante duplicato.
 *
 * ⚠️ Tipografia: questo è l'UNICO punto dell'app in cui si usa Radja
 * (font-welcome → /fonts/Radja-q2MP5.ttf, dichiarato in src/index.css).
 * Il resto dell'app resta su Montserrat. La utility `welcome` vive nel layer
 * utilities e quindi vince su `h1 { font-family: 'Montserrat' }` di
 * @layer base: per questo va messa anche sull'h1, altrimenti il titolo
 * erediterebbe comunque Montserrat dalla regola sugli elementi h1.
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
      <div className="font-welcome min-w-0">
        <h1 className="font-welcome truncate text-2xl font-semibold leading-tight tracking-tight text-foreground">
          {greeting ? `${greeting}, ${userName}` : userName}
        </h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
