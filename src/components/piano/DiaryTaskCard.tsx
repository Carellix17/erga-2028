import { useState } from "react";
import { motion } from "framer-motion";
import { Check, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiaryTask } from "./diaryUtils";

/**
 * ✅ P49 — LA CARD DEL COMPITO, come sul diario di carta.
 *
 * La spunta tonda a sinistra è il gesto principale: un tocco e il compito è
 * "fatto" (testo barrato, opacità ridotta, spunta che entra con un piccolo
 * respiro). Il resto della card serve a leggere: materia con il suo colore,
 * titolo, note/pagine, orario. Il tasto "⋯" tiene modifica ed eliminazione
 * fuori dalla portata del dito distratto.
 */

interface DiaryTaskCardProps {
  task: DiaryTask;
  /** Spunta in corso di salvataggio: la card resta cliccabile ma mostra l'attesa. */
  isToggling?: boolean;
  onToggle: (task: DiaryTask) => void;
  onEdit: (task: DiaryTask) => void;
  onDelete: (task: DiaryTask) => void;
}

export function DiaryTaskCard({
  task,
  isToggling = false,
  onToggle,
  onEdit,
  onDelete,
}: DiaryTaskCardProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "relative flex items-start gap-3 rounded-card border border-border/40 bg-card p-3.5 shadow-level-1 transition-colors",
        task.completed && "bg-surface-container-low",
      )}
      data-task-id={task.id}
      data-task-completed={task.completed ? "true" : "false"}
    >
      {/* Spunta: area toccabile 44px, cerchio tondo 26px */}
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? t("piano.diary.markUndone") : t("piano.diary.markDone")}
        onClick={() => onToggle(task)}
        disabled={isToggling}
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.94]"
      >
        <span
          className={cn(
            "flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 transition-all duration-200",
            task.completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-transparent hover:border-primary/60",
          )}
        >
          {isToggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          )}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        {/* Materia + orario */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="label-small inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-foreground"
            style={{ backgroundColor: `color-mix(in srgb, ${task.hex} 16%, transparent)` }}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: task.hex }} />
            {task.subjectName ?? t("piano.diary.noSubject")}
          </span>
          {task.time && (
            <span className="label-small tabular-nums text-muted-foreground">{task.time}</span>
          )}
          {task.completed && (
            <span className="label-small rounded-pill bg-primary px-2 py-0.5 text-primary-foreground">
              {t("piano.diary.doneBadge")}
            </span>
          )}
        </div>

        {/* Titolo: si tocca per modificare (mai un click "per caso" che cancella) */}
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="mt-1 block w-full text-left"
        >
          <span
            className={cn(
              "block text-[15px] font-semibold leading-snug break-words transition-all duration-200",
              task.completed ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {task.title}
          </span>
        </button>

        {task.note && task.note !== task.title && (
          <p
            className={cn(
              "mt-0.5 body-small break-words text-muted-foreground",
              task.completed && "line-through opacity-70",
            )}
          >
            {task.note}
          </p>
        )}

        {task.localOnly && (
          <p className="mt-1 label-small text-muted-foreground">{t("piano.diary.localOnly")}</p>
        )}
      </div>

      {/* Tasto secondario: modifica / elimina */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("piano.diary.taskMenu", { title: task.title })}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(task)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("piano.modify")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(task)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("piano.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
