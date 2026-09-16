import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, isSameDay, isToday } from "date-fns";
import { it, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * 📆 P49 — IL NASTRO DEI GIORNI del diario.
 *
 * Una fila di 7 giorni centrata sul giorno scelto (3 prima, 3 dopo, il giorno
 * scelto in mezzo): lo studente vede a colpo d'occhio la settimana intorno a
 * sé e salta a un giorno con un dito, senza aprire il calendario del mese.
 * Le frecce laterali spostano il nastro di una settimana; quando il giorno
 * scelto non è oggi compare la scorciatoia "Oggi".
 */

interface DiaryDayStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  /** I 7 giorni da mostrare (calcolati dalla vista con `stripDays`). */
  days: Date[];
  /** Colori (max 3) delle materie con qualcosa in programma, giorno per giorno. */
  dotsForDay: (date: Date) => string[];
  /** Giorni che hanno almeno un impegno: il pallino vuoto non si mostra. */
  hasContentForDay?: (date: Date) => boolean;
}

export function DiaryDayStrip({
  selectedDate,
  onSelectDate,
  days,
  dotsForDay,
  hasContentForDay,
}: DiaryDayStripProps) {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language.startsWith("en") ? enUS : it;
  const first = days[0] ?? selectedDate;
  const last = days[days.length - 1] ?? selectedDate;

  return (
    <section className="rounded-card border border-border/40 bg-card p-3 shadow-level-1" aria-label={t("piano.diary.stripLabel")}>
      {/* Intestazione: frecce + intervallo di giorni */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectDate(addDays(selectedDate, -7))}
          aria-label={t("piano.diary.prevWeek")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <p className="label-small min-w-0 text-center text-muted-foreground">
          {format(first, "d MMM", { locale })} – {format(last, "d MMM yyyy", { locale })}
        </p>

        <button
          type="button"
          onClick={() => onSelectDate(addDays(selectedDate, 7))}
          aria-label={t("piano.diary.nextWeek")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* I 7 giorni */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const dots = dotsForDay(day);
          const empty = hasContentForDay ? !hasContentForDay(day) : dots.length === 0;

          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              type="button"
              onClick={() => onSelectDate(day)}
              aria-current={selected ? "date" : undefined}
              aria-label={format(day, "EEEE d MMMM", { locale })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-button px-0.5 py-2 transition-all duration-200",
                selected
                  ? "bg-primary text-primary-foreground shadow-level-1"
                  : "text-muted-foreground hover:bg-surface-container-high",
              )}
            >
              <span className={cn("label-small uppercase", selected ? "opacity-90" : "opacity-70")}>
                {format(day, "EEEEE", { locale })}
              </span>
              <span className={cn("font-display text-sm font-bold tabular-nums", !selected && today && "text-foreground")}>
                {format(day, "d")}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {dots.map((hex) => (
                  <span
                    key={hex}
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {dots.length === 0 && !empty && (
                  <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", selected ? "bg-primary-foreground/40" : "bg-border")} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scorciatoia per tornare a oggi (solo quando serve) */}
      {!isToday(selectedDate) && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={() => onSelectDate(new Date())}
            className="label-small rounded-pill border border-border bg-surface-container-low px-3 py-1 text-foreground transition-colors hover:bg-surface-container-high"
          >
            {t("piano.diary.backToToday")}
          </button>
        </div>
      )}
    </section>
  );
}
