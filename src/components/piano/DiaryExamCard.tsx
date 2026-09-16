import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Mic, MoreHorizontal, Pencil, Target, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { tintStyle } from "@/lib/pianoPalette";
import { useTheme } from "@/contexts/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countdownFor, type DiaryExam } from "./diaryUtils";

/**
 * 🎯 P49 — LA CARD DELLA VERIFICA (o interrogazione).
 *
 * In cima materia e tipo di prova, con il conto alla rovescia che cambia
 * tono avvicinandosi: OGGI / Domani / Tra N giorni. Sotto, il titolo e
 * l'argomento; se lo studente ha collegato un percorso di Studio, il tasto
 * "Apri il percorso" lo porta dritto lì. Il voto obiettivo, se c'è, resta
 * in vista: è il motivo per cui si studia.
 *
 * Nota di coerenza col sistema di design: niente barra laterale spessa —
 * il colore della materia arriva dal fondo tinto (~18%) più il contorno
 * sottile e il puntino pieno, la stessa ricetta dei blocchi del calendario.
 */

const EXAM_TYPE_ICON = {
  scritta: Pencil,
  orale: Mic,
  interrogazione: Mic,
  pratica: BookOpen,
  test: BookOpen,
} as const;

const COUNTDOWN_STYLE: Record<string, string> = {
  today: "bg-destructive text-destructive-foreground",
  tomorrow: "bg-primary text-primary-foreground",
  soon: "bg-secondary-container text-foreground",
  later: "bg-surface-container text-muted-foreground",
  past: "bg-surface-container text-muted-foreground line-through",
};

interface DiaryExamCardProps {
  exam: DiaryExam;
  /** "HH:MM" o null: l'orario reale della prova, se lo studente l'ha indicato. */
  onEdit: (exam: DiaryExam) => void;
  onDelete: (exam: DiaryExam) => void;
  /** Apre la stanza Studio sul percorso collegato (se `exam.courseId` esiste). */
  onOpenCourse: (courseId: string) => void;
}

export function DiaryExamCard({ exam, onEdit, onDelete, onOpenCourse }: DiaryExamCardProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? enUS : it;
  const { resolved } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // La tinta cambia col tema (testo chiaro di notte, scuro di giorno): stessa
  // ricetta dei blocchi del calendario, mai un colore illeggibile.
  const dark = resolved === "dark";
  const countdown = countdownFor(exam.date);
  const Icon = EXAM_TYPE_ICON[exam.type] ?? BookOpen;
  const tint = tintStyle(exam.hex, { dark });

  const countdownLabel =
    countdown.tone === "today"
      ? t("piano.diary.countdownToday")
      : countdown.tone === "tomorrow"
        ? t("piano.diary.countdownTomorrow")
        : countdown.tone === "past"
          ? t("piano.diary.countdownPast")
          : t("piano.diary.countdownInDays", { days: countdown.days });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="relative rounded-card p-3.5"
      style={{ backgroundColor: tint.backgroundColor, border: tint.border }}
      data-exam-id={exam.id}
      data-exam-tone={countdown.tone}
    >
      {/* Riga alta: materia, tipo, conto alla rovescia */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-small inline-flex items-center gap-1.5 text-foreground">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: exam.hex }} />
          {exam.subjectName ?? t("piano.diary.noSubject")}
        </span>
        <span className="label-small inline-flex items-center gap-1 rounded-pill bg-surface-container/80 px-2 py-0.5 text-foreground">
          <Icon className="h-3 w-3" />
          {t(`piano.sheet.evalType_${exam.type === "test" ? "compito" : exam.type}`)}
        </span>
        <span className={cn("label-small ml-auto rounded-pill px-2.5 py-0.5", COUNTDOWN_STYLE[countdown.tone])}>
          {countdownLabel}
        </span>
      </div>

      {/* Titolo + argomento */}
      <p className="mt-2 text-[15px] font-bold leading-snug break-words text-foreground">{exam.title}</p>
      {exam.topicLabel && (
        <p className="mt-0.5 body-small break-words text-foreground/80">
          {t("piano.topicPrefix", { topic: exam.topicLabel })}
        </p>
      )}

      {/* Orario, voto obiettivo, percorso collegato */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="label-small tabular-nums text-foreground/70">
          {format(exam.date, "EEEE d MMMM", { locale })}
          {exam.time ? ` · ${exam.time}` : ""}
        </span>
        {exam.goal != null && (
          <span className="label-small inline-flex items-center gap-1 text-foreground">
            <Target className="h-3 w-3" />
            {t("piano.goalBadge", { goal: exam.goal })}
          </span>
        )}
        {exam.courseId && (
          <button
            type="button"
            onClick={() => onOpenCourse(exam.courseId as string)}
            aria-label={t("piano.diary.openCourse", { title: exam.courseTitle ?? exam.title })}
            className="label-small inline-flex items-center gap-1 rounded-pill bg-card px-2.5 py-1 text-foreground shadow-level-1 transition-colors hover:bg-surface-container-high"
          >
            <ArrowUpRight className="h-3 w-3" />
            {t("piano.diary.openCourseShort")}
          </button>
        )}
      </div>

      {/* Tasto secondario: modifica / elimina */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("piano.diary.taskMenu", { title: exam.title })}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-card/70 hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(exam)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("piano.modify")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(exam)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("piano.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
