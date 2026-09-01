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
 * Scala display: il saluto resta il titolo più importante della pagina e
 * domina la gerarchia (32 → 44 → 52px) con interlinea serrata e tracking
 * negativo; va a capo in modo bilanciato (`text-balance`) invece di troncarsi,
 * così un nome lungo resta leggibile senza rompere il layout.
 *
 * Peso e larghezza: 'Zalando Sans Expanded' è già un carattere allargato,
 * quindi a `font-bold` (700) e 60px il saluto copriva l'intera larghezza
 * dello schermo e risultava "spesso". Scendiamo di un gradino sul peso
 * (`font-semibold`, 600 — peso reale della famiglia, mai sintetizzato) e di
 * circa il 10% sulla misura ai tre breakpoint: la gerarchia resta intatta,
 * il blocco torna a respirare ai lati.
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
        <h1 className="text-balance break-words font-welcome text-[2rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[2.75rem] lg:text-[3.25rem]">
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
