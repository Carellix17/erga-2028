/**
 * HomeHeader — saluto in cima alla Home.
 * Il nome arriva dai dati reali del profilo, il saluto cambia in base all'ora.
 * L'avatar con il profilo vive nella barra in alto a destra (AppHeader):
 * qui non c'è più alcun pulsante duplicato.
 *
 * Tipografia: il saluto è l'unico punto dell'app che usa 'Zalando Sans Expanded'
 * (utility `font-welcome`), caricato da Google Fonts con asse dei pesi 200–900.
 * La classe sta sia sul div sia sull'h1: la regola `h1 { font-family }` di
 * @layer base vince sull'ereditarietà, solo il layer utilities la scavalca.
 *
 * Scala display: il saluto è il titolo più importante della pagina, quindi
 * domina la gerarchia (36 → 48 → 60px) con interlinea serrata e tracking
 * negativo; va a capo in modo bilanciato (`text-balance`) invece di troncarsi,
 * così un nome lungo resta leggibile senza rompere il layout.
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
        <h1 className="text-balance break-words font-welcome text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {greeting ? `${greeting}, ${userName}` : userName}
        </h1>
        {subtitle && (
          <p className="mt-2 truncate text-base leading-snug text-muted-foreground sm:mt-3">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
