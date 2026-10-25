/**
 * HomeHeader — saluto in cima alla Home, con la scala UI del design v4.
 *
 * Il nome va a capo sulla seconda riga dentro lo stesso h1 (un solo titolo
 * per gli screen reader). Il sottotitolo usa inchiostro attenuato e va a capo
 * senza ridurre i caratteri. HomeView riserva lo spazio della barra assoluta
 * prima di montare questo header, così saluto e wordmark non si sovrappongono.
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
      <div className="min-w-0">
        <h1 className="text-balance font-display text-[2rem] font-medium leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[2.5rem] lg:text-[3rem]">
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
          <p className="mt-2 text-[15px] leading-snug text-muted-foreground sm:mt-2.5">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}
