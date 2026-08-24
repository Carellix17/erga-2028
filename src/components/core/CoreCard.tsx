import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MATERIALE UNICO DEL CORE.
 *
 * È lo stile della scheda "Settimana" della Routine, estratto in un solo posto:
 * stessi angoli (--radius-card = 24px), stesso bordo (--border), stesso fondo
 * (--card) e stessa ombra (--shadow-level-1). Tutte le schede del Core usano
 * questa costante, così non possono più "deragliare" una dall'altra.
 *
 * Nota tecnica: prima qui c'era `border-outline-variant/60`, che Tailwind
 * compilava in `hsl(var(--outline-variant) / 0.6)` → con la variabile già
 * alpha (`--ink / 0.12`) il risultato aveva DUE slash-alpha ed era CSS non
 * valido: il browser scartava la regola e il bordo tornava a --border.
 * Ora scriviamo direttamente il token vero, che è quello che si vedeva già.
 */
export const CORE_CARD_CLASS =
  "rounded-card border border-border bg-card text-card-foreground shadow-level-1";

interface CoreCardProps {
  /** Titolo della scheda (diventa anche il nome accessibile della sezione). */
  title: string;
  /** Testo di spiegazione sotto il titolo. */
  description?: string;
  /** Icona a sinistra del titolo. */
  icon?: LucideIcon;
  /** Controllo allineato a destra del titolo (es. "Aggiungi blocco"). */
  action?: ReactNode;
  /** Contenuto della scheda. */
  children: ReactNode;
  /** id HTML della scheda, usato dai pannelli delle schede (tabs). */
  id?: string;
  className?: string;
  /** Classi extra solo per il contenitore del contenuto. */
  contentClassName?: string;
}

/**
 * Scheda standard del Core: icona + titolo + descrizione + contenuto.
 * Sostituirla altrove = cambiare aspetto di tutto il Core in un colpo solo.
 */
export function CoreCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  id,
  className,
  contentClassName,
}: CoreCardProps) {
  const titleId = `core-card-${id ?? title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(CORE_CARD_CLASS, "p-5", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />}
          <h2 id={titleId} className="title-medium font-display truncate text-foreground">
            {title}
          </h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {description && <p className="body-small mt-1.5 text-muted-foreground">{description}</p>}

      <div className={cn("mt-4", contentClassName)}>{children}</div>
    </section>
  );
}
