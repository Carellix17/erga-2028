/**
 * HomeHeader — saluto in cima alla Home.
 * Il nome arriva dai dati reali del profilo, il saluto cambia in base all'ora.
 * L'avatar con il profilo vive nella barra in alto a destra (AppHeader):
 * qui non c'è più alcun pulsante duplicato.
 *
 * Tipografia: solo il saluto e il nome nell'h1 usano 'Ubuntu Sans'
 * (utility `font-welcome-title`), caricato da Google Fonts nel solo peso 500.
 * La classe va direttamente sull'h1 per scavalcare la famiglia di @layer base.
 * Il div mantiene `font-welcome`: il sottotitolo resta in Zalando Sans Expanded.
 *
 * Scala display: il saluto resta il titolo più importante della pagina e
 * domina la gerarchia (48 → 66 → 78px, +50% rispetto alla scala precedente)
 * con interlinea serrata e tracking
 * negativo; va a capo in modo bilanciato (`text-balance`) invece di troncarsi,
 * così un nome lungo resta leggibile senza rompere il layout.
 *
 * Peso: resta `font-medium` (500), ora fornito da Ubuntu Sans.
 * Dimensioni, interlinea, spaziatura e comportamento responsive non cambiano:
 * cambia esclusivamente la famiglia del messaggio di benvenuto.
 *
 * Due righe: il saluto ("Buongiorno", "Buon pomeriggio", "Buonasera") sta
 * sulla prima riga e il nome dell'utente va a capo sulla seconda, come nel
 * mock della Home in landing. Restano dentro lo stesso `h1` — un solo titolo
 * per gli screen reader — separati da due `span` a blocco; lo spazio tra i
 * due mantiene leggibile il nome accessibile ("Buongiorno Vale").
 */
import { cn } from "@/lib/utils";

export interface HomeHeaderProps {
  greeting?: string;
  userName?: string;
  subtitle?: string | null;
  /** Classi extra per il layout esterno (es. respiro sotto il saluto). */
  className?: string;
}

export function HomeHeader({
  greeting,
  userName = "",
  subtitle,
  className,
}: HomeHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 font-welcome">
        <h1 className="text-balance break-words font-welcome-title text-[3rem] font-medium leading-[1.05] tracking-tight text-foreground sm:text-[4.125rem] lg:text-[4.875rem]">
          {greeting ? (
            <>
              <span className="block">{greeting}</span>{" "}
              <span className="block">{userName}</span>
            </>
          ) : (
            userName
          )}
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
