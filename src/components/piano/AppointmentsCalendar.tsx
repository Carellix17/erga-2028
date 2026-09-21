import { useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  BookOpen, ClipboardCheck, Columns3, Grid, Hammer, Loader2, Mic, Pencil, PencilLine, Plus, Trash2,
} from "lucide-react";
import {
  eachDayOfInterval, endOfMonth, endOfWeek, format, getDate, isSameMonth, isToday,
  startOfMonth, startOfWeek, startOfToday,
} from "date-fns";
import { it, enUS, type Locale } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { dayKey } from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";

/**
 * 🗓️ Calendario degli appuntamenti del Piano.
 * Visual world: superficie scura in zinc (day cell #1e1e1e, bordi #323232),
 * badge con il numero di eventi del giorno che si espande all'hover
 * (animazione condivisa via layoutId) e pannello "Prossimi eventi"
 * che scivola accanto alla griglia. Il mese è sempre quello reale,
 * letto dall'orologio di sistema, e le voci sono verifiche,
 * interrogazioni, compiti e sessioni dello studente.
 */

/** Una voce del calendario: verifica, compito o sessione di studio. */
export interface CalendarEntry {
  id: string;
  date: Date;
  /** "HH:mm" se noto. */
  time?: string;
  title: string;
  subject: string | null;
  typeLabel: string;
  TypeIcon: typeof Mic;
  original: { kind: "evaluation"; data: Evaluation } | { kind: "studyEvent"; data: StudyEvent };
}

/** Dentro lo stesso giorno: prima le voci con l'ora, poi quelle senza. */
const byTime = (a: CalendarEntry, b: CalendarEntry) =>
  (a.time ?? "zz:zz").localeCompare(b.time ?? "zz:zz");

type DayType = {
  /** Etichetta della cella: "01".."31" per i giorni del mese, "-2"/"+3" fuori. */
  day: string;
  /** Chiave yyyy-MM-dd dei giorni reali (i giorni fuori mese non ce l'hanno). */
  key?: string;
  isToday: boolean;
  classNames: string;
  meetingInfo?: CalendarEntry[];
};

interface DayProps {
  day: DayType;
  onHover: (dayKey: string | null) => void;
}

const Day = ({ day, onHover }: DayProps) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      className={cn("relative flex items-center justify-center py-1", day.classNames)}
      style={{ height: "4rem", borderRadius: 16 }}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover(day.key ?? day.day);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHover(null);
      }}
    >
      <motion.div className="flex flex-col items-center justify-center">
        {!(day.day[0] === "+" || day.day[0] === "-") && (
          <span className="text-sm text-white">{day.day}</span>
        )}
      </motion.div>
      {day.meetingInfo && (
        <motion.div
          className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-zinc-700 p-1 text-[10px] font-bold text-white"
          layoutId={`day-${day.key}-meeting-count`}
          style={{ borderRadius: 999 }}
        >
          {day.meetingInfo.length}
        </motion.div>
      )}

      <AnimatePresence>
        {day.meetingInfo && isHovered && (
          <div className="absolute inset-0 flex size-full items-center justify-center">
            <motion.div
              className="flex size-10 items-center justify-center bg-zinc-700 p-1 text-xs font-bold text-white"
              layoutId={`day-${day.key}-meeting-count`}
              style={{ borderRadius: 999 }}
            >
              {day.meetingInfo.length}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const EVAL_ICONS: Record<EvaluationType, typeof Mic> = {
  orale: Mic,
  interrogazione: Mic,
  scritta: PencilLine,
  compito: BookOpen,
  pratica: Hammer,
};

interface AppointmentsCalendarProps {
  evaluations: Evaluation[];
  events: StudyEvent[];
  subjects: UserSubject[];
  /** Id in dissolvenza prima dell'eliminazione vera. */
  exitingIds: string[];
  onAddEvent: () => void;
  /** Il bottone "Genera piano di studio" appare solo dopo il primo evento aggiunto. */
  showGeneratePlan: boolean;
  onGeneratePlan: () => void;
  isGeneratingPlan: boolean;
  onEditEvaluation: (evaluation: Evaluation) => void;
  onEditStudyEvent: (event: StudyEvent) => void;
  onDeleteEvaluation: (evaluation: Evaluation) => void;
  onDeleteStudyEvent: (event: StudyEvent) => void;
}

export function AppointmentsCalendar({
  evaluations,
  events,
  subjects,
  exitingIds,
  onAddEvent,
  showGeneratePlan,
  onGeneratePlan,
  isGeneratingPlan,
  onEditEvaluation,
  onEditStudyEvent,
  onDeleteEvaluation,
  onDeleteStudyEvent,
}: AppointmentsCalendarProps) {
  const [moreView, setMoreView] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const dateLocale: Locale = i18n.language.startsWith("en") ? enUS : it;

  /** Il mese è sempre quello segnato dall'orologio di sistema. */
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(today), [today]);

  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  /** Tutte le voci del piano, already tradotte e iconizzate. */
  const entries = useMemo<CalendarEntry[]>(() => {
    const fromEvaluations: CalendarEntry[] = evaluations.map((ev) => ({
      id: ev.id,
      date: new Date(ev.date),
      title: ev.title,
      subject: ev.subject_id ? subjectById.get(ev.subject_id)?.name ?? null : null,
      typeLabel: t(`piano.sheet.evalType_${ev.type}`),
      TypeIcon: EVAL_ICONS[ev.type] ?? ClipboardCheck,
      original: { kind: "evaluation", data: ev },
    }));
    const fromEvents: CalendarEntry[] = events.map((ev) => ({
      id: ev.id,
      date: new Date(ev.event_date),
      time: ev.event_time,
      title: ev.title,
      subject: ev.subject && ev.subject !== "Altro" ? ev.subject : null,
      typeLabel:
        ev.event_type === "study" ? t("piano.type_study")
        : ev.event_type === "test" ? t("piano.type_test")
        : t("piano.type_assignment"),
      TypeIcon: ev.event_type === "study" ? BookOpen : ClipboardCheck,
      original: { kind: "studyEvent", data: ev },
    }));
    return [...fromEvaluations, ...fromEvents];
  }, [evaluations, events, subjectById, t]);

  const entriesByKey = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = dayKey(entry.date);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    for (const list of map.values()) {
      list.sort(byTime);
    }
    return map;
  }, [entries]);

  const daysOfWeek = useMemo(() => {
    const week = eachDayOfInterval({ start: startOfWeek(today, { locale: dateLocale }), end: endOfWeek(today, { locale: dateLocale }) });
    return week.map((d) => format(d, "EEE", { locale: dateLocale }).toUpperCase());
  }, [today, dateLocale]);

  const days = useMemo<DayType[]>(() => {
    const grid = eachDayOfInterval({
      start: startOfWeek(monthStart, { locale: dateLocale }),
      end: endOfWeek(endOfMonth(monthStart), { locale: dateLocale }),
    });
    let outsideBefore = 0;
    let outsideAfter = 0;
    return grid.map((date) => {
      if (!isSameMonth(date, monthStart)) {
        const label = date < monthStart ? `-${++outsideBefore}` : `+${++outsideAfter}`;
        return { day: label, isToday: false, classNames: "bg-zinc-700/20" };
      }
      const key = dayKey(date);
      const meetingInfo = entriesByKey.get(key);
      return {
        day: String(getDate(date)).padStart(2, "0"),
        key,
        isToday: isToday(date),
        classNames: cn(
          "bg-[#1e1e1e]",
          meetingInfo && "cursor-pointer",
          isToday(date) && "ring-1 ring-zinc-500",
        ),
        meetingInfo,
      };
    });
  }, [monthStart, dateLocale, entriesByKey]);

  /** Prossimi eventi: da oggi in avanti, raggruppati per giorno. */
  const upcomingDays = useMemo(() => {
    const cutoff = startOfToday();
    const groups = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      if (entry.date < cutoff) continue;
      const key = dayKey(entry.date);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    return [...groups.entries()]
      .map(([key, list]) => ({ key, date: list[0].date, entries: list.sort(byTime) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [entries]);

  /** Il giorno su cui è fermo il mouse sale in cima alla lista. */
  const sortedUpcomingDays = useMemo(() => {
    if (!hoveredDay) return upcomingDays;
    return [...upcomingDays].sort((a, b) => {
      if (a.key === hoveredDay) return -1;
      if (b.key === hoveredDay) return 1;
      return 0;
    });
  }, [upcomingDays, hoveredDay]);

  const handleDayHover = (key: string | null) => setHoveredDay(key);

  const editEntry = (entry: CalendarEntry) =>
    entry.original.kind === "evaluation"
      ? onEditEvaluation(entry.original.data)
      : onEditStudyEvent(entry.original.data);

  const deleteEntry = (entry: CalendarEntry) =>
    entry.original.kind === "evaluation"
      ? onDeleteEvaluation(entry.original.data)
      : onDeleteStudyEvent(entry.original.data);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className="relative mx-auto flex w-full flex-col items-center justify-center gap-8 lg:flex-row">
        <motion.div layout className="w-full max-w-lg">
          <motion.div key="calendar-view" className="flex w-full flex-col gap-4">
            <div className="flex w-full items-center justify-between">
              <motion.h2 className="text-4xl font-bold tracking-wider text-zinc-300">
                {format(monthStart, "MMM", { locale: dateLocale }).toUpperCase()}{" "}
                <span className="opacity-50">{format(monthStart, "yyyy")}</span>
              </motion.h2>
              <motion.button
                type="button"
                aria-pressed={moreView}
                aria-label={t("piano.toggleUpcoming")}
                className="relative flex items-center gap-3 rounded-lg border border-[#323232] px-1.5 py-1 text-[#323232]"
                onClick={() => setMoreView(!moreView)}
              >
                <Columns3 className="z-[2]" />
                <Grid className="z-[2]" />
                <div
                  className="absolute left-0 top-0 h-[85%] w-7 rounded-md bg-zinc-100 transition-transform duration-300"
                  style={{
                    top: "50%",
                    transform: moreView
                      ? "translateY(-50%) translateX(40px)"
                      : "translateY(-50%) translateX(4px)",
                  }}
                />
              </motion.button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="rounded-xl bg-[#323232] py-1 text-center text-xs text-white">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => (
                <Day key={day.key ?? `outside-${index}`} day={day} onHover={handleDayHover} />
              ))}
            </div>

            {/* Bottoni: larghi quanto la griglia, volutamente sottili. */}
            <button
              type="button"
              onClick={onAddEvent}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#323232] bg-[#1e1e1e] text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-zinc-800 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {t("piano.addEventFull")}
            </button>
            <AnimatePresence>
              {showGeneratePlan && (
                <motion.button
                  type="button"
                  onClick={onGeneratePlan}
                  disabled={isGeneratingPlan}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-950 transition-all duration-200 hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-70"
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("piano.generating")}
                    </>
                  ) : (
                    t("piano.generate")
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
        {moreView && (
          <motion.div
            className="w-full max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div key="more-view" className="flex w-full flex-col gap-4">
              <div className="flex w-full flex-col items-start justify-between">
                <motion.h2 className="text-4xl font-bold tracking-wider text-zinc-300">
                  {t("piano.upcoming")}
                </motion.h2>
                <p className="font-medium text-zinc-300/50">{t("piano.upcomingSubtitle")}</p>
              </div>
              <motion.div
                className="flex h-[620px] flex-col items-start justify-start overflow-hidden overflow-y-scroll rounded-xl border-2 border-[#323232] shadow-md"
                layout
              >
                {sortedUpcomingDays.length === 0 ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-6 text-center">
                    <p className="font-medium text-zinc-300">{t("piano.noEvents")}</p>
                    <p className="text-sm text-zinc-300/50">{t("piano.noEventsHint")}</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {sortedUpcomingDays.map(({ key, entries: dayEntries }) => (
                      <motion.div key={key} className="w-full border-b-2 border-[#323232] py-0 last:border-b-0" layout>
                        {dayEntries.map((entry, mIndex) => (
                          <motion.div
                            key={entry.id}
                            className={cn(
                              "group relative border-b border-[#323232] p-3 last:border-b-0",
                              exitingIds.includes(entry.id) &&
                                "opacity-0 scale-95 transition-all duration-300",
                            )}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, delay: mIndex * 0.05 }}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-sm text-white">
                                {format(entry.date, "EEE, d MMM", { locale: dateLocale })}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label="Modifica evento"
                                  onClick={() => editEntry(entry)}
                                  className="rounded-full p-1.5 text-zinc-500 opacity-0 transition-all hover:bg-zinc-800 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Elimina evento"
                                  onClick={() => deleteEntry(entry)}
                                  className="rounded-full p-1.5 text-zinc-500 opacity-0 transition-all hover:bg-zinc-800 hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {entry.time && <span className="text-sm text-white">{entry.time}</span>}
                            </div>
                            <h3 className="mb-1 text-lg font-semibold text-white">{entry.title}</h3>
                            {entry.subject && (
                              <p className="mb-1 text-sm text-zinc-600">{entry.subject}</p>
                            )}
                            <div className="flex items-center text-blue-500">
                              <entry.TypeIcon className="mr-1 h-4 w-4" />
                              <span className="text-sm">{entry.typeLabel}</span>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </MotionConfig>
  );
}
