/**
 * HomeHeader — saluto in cima alla Home (V2-01, DESIGN.md 2.1 §5, §9).
 *
 * Saluto SERIF compatto (Lora 400/500): 32px sul telefono, 40 da sm,
 * 48 da lg — «compact, mai gigantesco». Il nome va a capo sulla seconda
 * riga dentro lo stesso h1 (un solo titolo per gli screen reader).
 * Il sottotitolo è Inter, inchiostro attenuato, e non tronca mai:
 * se serve va a capo (mai ridurre caratteri per far entrare il contenuto).
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
