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
 * Saluti possibili: solo due, "Buongiorno" e "Buonasera" (vedi
 * useWelcomeMessage). Il saluto del pomeriggio non esiste più: era il caso
 * più largo (7,52em) e teneva basso tutto il titolo.
 *
 * Scala display (-20% rispetto alla precedente 54 → 88 → 96 → 108px): il saluto è
 * il titolo più importante della pagina e domina la gerarchia,
 * con interlinea serrata e tracking negativo.
 *
 * I gradini sono calcolati, non stimati: il vincolo è che il saluto stia
 * SEMPRE in un solo rigo e che il nome vada a capo sul secondo rigo (i due
 * span sono `block`; `break-words` resta solo sul nome, così il saluto non
 * può spezzarsi a metà parola). Il caso più largo è ora "Buongiorno":
 * 5,136em con `tracking-tight` (misurato su Ubuntu Sans 500 reale).
 * Larghezze utili dei contenitori di AppLayout (max-w-lg px-4 →
 * sm:px-6 → md:max-w-2xl → lg:max-w-4xl): 288px su viewport 320px, 464px su
 * sm, 624px su md, 848px su lg. Da qui:
 * - base 2.7rem (43.2px → 222px, margine ampio) = 3.375rem -20%;
 * - sm 4.4rem (70.4px → 362px su 464px) = 5.5rem -20%;
 * - md 4.8rem (76.8px → 394px su 624px) = 6rem -20%;
 * - lg 5.4rem (86.4px → 444px su 848px) = 6.75rem -20%.
 *
 * Peso: resta `font-medium` (500), fornito da Ubuntu Sans.
 *
 * Due righe: il saluto sta sulla prima riga e il nome dell'utente va a capo
 * sulla seconda, come nel mock della Home in landing. Restano dentro lo
 * stesso `h1` — un solo titolo per gli screen reader — separati da due
 * `span` a blocco; lo spazio tra i due mantiene leggibile il nome
 * accessibile ("Buongiorno Vale").
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
        <h1 className="text-balance font-welcome-title text-[2.7rem] font-medium leading-[1.05] tracking-tight text-foreground sm:text-[4.4rem] md:text-[4.8rem] lg:text-[5.4rem]">
          {greeting ? (
            <>
              <span className="block">{greeting}</span>{" "}
              <span className="block break-words">{userName}</span>
            </>
          ) : (
            <span className="block break-words">{userName}</span>
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
