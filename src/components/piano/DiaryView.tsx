import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Check, MoreHorizontal, Pencil, Plus, Sparkles, Timer, BookOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiaryDayStrip } from "./DiaryDayStrip";
import { DiaryTaskCard } from "./DiaryTaskCard";
import { DiaryExamCard } from "./DiaryExamCard";
import type { DiaryDay, DiaryExam, DiarySession, DiaryTask } from "./diaryUtils";
import { stripDays } from "./diaryUtils";

/**
 * 📔 P49 — IL DIARIO DEL GIORNO.
 *
 * Il cuore della stanza Piano: la giornata scelta, nell'ordine in cui si
 * legge un diario scolastico —
 *   1. le verifiche e le interrogazioni (con quanto mancano),
 *   2. i compiti per casa, da spuntare,
 *   3. le sessioni di studio, da far partire in Focus.
 * In alto il nastro dei giorni per spostarsi; in fondo i due tasti per
 * aggiungere un compito o una verifica proprio in questo giorno.
 *
 * La schermata non conosce il database: riceve la giornata già calcolata
 * (buildDiaryDay) e risale gli eventi con i callbacks. Così resta leggibile
 * e collaudabile.
 */

interface DiaryViewProps {
  day: DiaryDay;
  onSelectDate: (date: Date) => void;
  /** Colori delle materie del giorno (serve al nastro). */
  dotsForDay: (date: Date) => string[];
  hasContentForDay: (date: Date) => boolean;
  /** Id della voce la cui spunta è in corso di salvataggio. */
  togglingId: string | null;
  onToggleTask: (task: DiaryTask) => void;
  onEditEntry: (entry: DiaryTask["entry"]) => void;
  onDeleteEntry: (entry: DiaryTask["entry"]) => void;
  onEditExam: (exam: DiaryExam) => void;
  onDeleteExam: (exam: DiaryExam) => void;
  onEditSession: (session: DiarySession) => void;
  onDeleteSession: (session: DiarySession) => void;
  onStartFocus: () => void;
  onOpenCourse: (courseId: string) => void;
  onAddTask: () => void;
  onAddExam: () => void;
}

export function DiaryView({
  day,
  onSelectDate,
  dotsForDay,
  hasContentForDay,
  togglingId,
  onToggleTask,
  onEditEntry,
  onDeleteEntry,
  onEditExam,
  onDeleteExam,
  onEditSession,
  onDeleteSession,
  onStartFocus,
  onOpenCourse,
  onAddTask,
  onAddExam,
}: DiaryViewProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const { progress, tasks, exams, sessions } = day;

  return (
    <div className="min-w-0 space-y-4">
      {/* 1 — Il nastro dei giorni */}
      <DiaryDayStrip
        selectedDate={day.date}
        onSelectDate={onSelectDate}
        days={stripDays(day.date)}
        dotsForDay={dotsForDay}
        hasContentForDay={hasContentForDay}
      />

      {/* 2 — Titolo del giorno + progresso dei compiti */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-extrabold capitalize leading-tight text-foreground">
            {format(day.date, "EEEE d MMMM", { locale })}
          </h2>
          {progress.total > 0 && (
            <p className="label-small mt-0.5 text-muted-foreground">
              {t("piano.diary.tasksProgress", { done: progress.done, total: progress.total })}
            </p>
          )}
        </div>
        {progress.total > 0 && (
          <div className="flex min-w-[120px] flex-1 items-center gap-2 sm:max-w-[180px]">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high">
              <span
                className="block h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress.pct}%` }}
              />
            </span>
            <span className="label-small tabular-nums text-muted-foreground">{progress.pct}%</span>
          </div>
        )}
      </div>

      {/* 3 — Verifiche e interrogazioni */}
      {exams.length > 0 && (
        <section className="min-w-0 space-y-2.5">
          <SectionTitle icon={CalendarCheck} label={t("piano.diary.sectionExams")} count={exams.length} />
          <div className="space-y-2.5">
            {exams.map((exam) => (
              <DiaryExamCard
                key={exam.id}
                exam={exam}
                onEdit={onEditExam}
                onDelete={onDeleteExam}
                onOpenCourse={onOpenCourse}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4 — Compiti per il giorno */}
      <section className="min-w-0 space-y-2.5">
        <SectionTitle icon={Check} label={t("piano.diary.sectionTasks")} count={tasks.length} />
        {tasks.length > 0 ? (
          <>
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <DiaryTaskCard
                  key={task.id}
                  task={task}
                  isToggling={togglingId === task.id}
                  onToggle={onToggleTask}
                  onEdit={(item) => onEditEntry(item.entry)}
                  onDelete={(item) => onDeleteEntry(item.entry)}
                />
              ))}
            </div>
            {progress.total > 0 && progress.done === progress.total && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1.5 rounded-button bg-surface-container-low py-2 label-small text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("piano.diary.allDone")}
              </motion.p>
            )}
            {day.hasLocalOnlyTasks && (
              <p className="label-small text-muted-foreground">{t("piano.diary.localOnlyHint")}</p>
            )}
          </>
        ) : (
          <div className="rounded-card border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="body-medium text-muted-foreground">{t("piano.diary.noTasks")}</p>
          </div>
        )}
      </section>

      {/* 5 — Sessioni di studio (con Focus) */}
      {sessions.length > 0 && (
        <section className="min-w-0 space-y-2.5">
          <SectionTitle icon={Timer} label={t("piano.diary.sectionStudy")} count={sessions.length} />
          <div className="space-y-2.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start gap-3 rounded-card border border-border/40 bg-card p-3.5 shadow-level-1"
                data-session-id={session.id}
              >
                <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: session.hex }} />
                <div className="min-w-0 flex-1">
                  <span className="label-small text-muted-foreground">
                    {session.subjectName ?? t("piano.diary.noSubject")}
                    {session.time ? ` · ${session.time}` : ""}
                  </span>
                  <p className="text-[15px] font-semibold leading-snug break-words text-foreground">
                    {session.title}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onStartFocus}
                    className="h-9 rounded-button"
                    aria-label={t("piano.diary.startFocus")}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {t("piano.focus")}
                  </Button>
                  <SessionMenu
                    title={session.title}
                    onEdit={() => onEditSession(session)}
                    onDelete={() => onDeleteSession(session)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6 — Giornata vuota: incoraggiamento, non un vuoto che sembra un errore */}
      {day.isEmpty && (
        <div className="rounded-card border border-border/40 bg-card px-5 py-8 text-center shadow-level-1">
          <BookOpen className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 font-display text-base font-bold text-foreground">{t("piano.diary.emptyTitle")}</p>
          <p className="mt-1 body-small text-muted-foreground">{t("piano.diary.emptyHint")}</p>
        </div>
      )}

      {/* 7 — Aggiunta rapida, proprio su questo giorno */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          onClick={onAddTask}
          className="h-12 rounded-button"
          aria-label={t("piano.diary.addTask")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t("piano.diary.addTask")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onAddExam}
          className="h-12 rounded-button border-outline-variant bg-surface-container-low"
          aria-label={t("piano.diary.addExam")}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t("piano.diary.addExam")}
        </Button>
      </div>
    </div>
  );
}

/** Titolo di sezione: icona, nome e numero di voci. */
function SectionTitle({ icon: Icon, label, count }: { icon: typeof Check; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="label-large text-foreground">{label}</h3>
      <span className="label-small rounded-pill bg-surface-container px-2 py-0.5 text-muted-foreground">{count}</span>
    </div>
  );
}

/**
 * Il "⋯" delle sessioni di studio: modifica ed elimina stanno in un menu,
 * mai un pulsante distruttivo a portata di pollice mentre si scorre.
 */
function SessionMenu({ title, onEdit, onDelete }: { title: string; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("piano.diary.taskMenu", { title })}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          {t("piano.modify")}
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t("piano.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
