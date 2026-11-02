import type { CSSProperties } from "react";
import {
  BookOpen,
  Bus,
  CalendarClock,
  Check,
  Circle,
  CircleDashed,
  ClipboardCheck,
  Coffee,
  GraduationCap,
  Lock,
  Moon,
  PencilLine,
  SkipForward,
  Trash2,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { TFunction } from "i18next";
import { format, isValid, parseISO } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StudyEventStatus } from "@/lib/planner/types";

export type PlanSlotKind = "study" | "evaluation" | "assignment" | "busy" | "pause" | "routine";

export interface PlanSlotData {
  id: string;
  kind: PlanSlotKind;
  title?: string | null;
  subject?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  lessonFrom?: number | null;
  lessonTo?: number | null;
  status?: StudyEventStatus;
  completed?: boolean;
  moveCount?: number;
  originalDate?: string | null;
  originalTime?: string | null;
  a11ySummary?: {
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number | null;
    lessonFrom?: number | null;
    lessonTo?: number | null;
  };
  routineKind?: string;
  routineLabel?: string | null;
  pauseNumber?: number;
}

export interface PlanSlotProps {
  slot: PlanSlotData;
  style?: CSSProperties;
  exiting?: boolean;
  ariaLabel?: string;
  partialProgress?: { done: number; total: number };
  onEdit?: () => void;
  onDelete?: () => void;
}

const formatDuration = (minutes: number, language: string) => {
  const locale = language.startsWith("en") ? "en" : "it";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(new Intl.NumberFormat(locale, { style: "unit", unit: "hour", unitDisplay: "long" }).format(hours));
  }
  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "long" }).format(remainingMinutes));
  }
  return parts.join(locale === "en" ? " and " : " e ");
};

function getTypeLabel(kind: PlanSlotKind, t: TFunction, pauseNumber = 1) {
  if (kind === "study") return t("piano.type_study");
  if (kind === "evaluation") return t("piano.type_test");
  if (kind === "assignment") return t("piano.type_assignment");
  if (kind === "busy") return t("piano.timelineBusy");
  if (kind === "routine") return t("piano.timelineRoutine");
  return t("piano.timelinePauseNumber", { count: pauseNumber });
}

function getSlotIcon(kind: PlanSlotKind): LucideIcon {
  switch (kind) {
    case "study": return BookOpen;
    case "evaluation": return ClipboardCheck;
    case "assignment": return PencilLine;
    case "busy": return CalendarClock;
    case "pause": return Coffee;
    case "routine": return CalendarClock;
  }
}

function getRoutineIcon(routineKind?: string, label?: string | null): LucideIcon {
  const normalizedLabel = label?.toLocaleLowerCase() ?? "";
  if (routineKind === "school") return GraduationCap;
  if (routineKind === "meal") return Utensils;
  if (routineKind === "sleep") return Moon;
  if (routineKind === "transport" || /trasport|transport|bus|pullman/.test(normalizedLabel)) return Bus;
  return CalendarClock;
}

function getRoutineLabel(slot: PlanSlotData, t: TFunction) {
  const custom = slot.routineLabel?.trim() || slot.title?.trim();
  if (custom) return custom;
  if (slot.routineKind === "school") return t("piano.routine_school");
  if (slot.routineKind === "meal") return t("piano.routine_meal");
  if (slot.routineKind === "sleep") return t("piano.routine_sleep");
  if (slot.routineKind === "transport") return t("piano.timelineTransport");
  return t("piano.routine_other");
}

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return "";
  return end ? `${start}–${end}` : start;
}

function lessonRange(slot: PlanSlotData, t: TFunction) {
  if (slot.lessonFrom == null || slot.lessonTo == null) return "";
  return t("piano.timelineLessonRange", { from: slot.lessonFrom + 1, to: slot.lessonTo + 1 });
}

function statusFor(slot: PlanSlotData, t: TFunction) {
  if (slot.completed || slot.status === "done") return { label: t("piano.timelineDone"), Icon: Check, key: "done" };
  if (slot.status === "skipped") return { label: t("piano.timelineSkipped"), Icon: SkipForward, key: "skipped" };
  if (slot.status === "partial") return { label: t("piano.timelinePartial"), Icon: CircleDashed, key: "partial" };
  return { label: t("piano.timelineNotStarted"), Icon: Circle, key: "planned" };
}

function movedFrom(slot: PlanSlotData, language: string, t: TFunction) {
  if (!slot.moveCount || slot.moveCount < 1) return "";
  let day = "";
  if (slot.originalDate) {
    const parsed = parseISO(slot.originalDate.slice(0, 10));
    if (isValid(parsed)) day = format(parsed, "d MMM", { locale: language.startsWith("en") ? enUS : it });
  }
  const when = [day, slot.originalTime].filter(Boolean).join(" ") || t("piano.timelinePreviousTime");
  return t("piano.timelineMovedFrom", { when });
}

export function PlanSlot({
  slot,
  style,
  exiting = false,
  ariaLabel,
  partialProgress,
  onEdit,
  onDelete,
}: PlanSlotProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const typeLabel = getTypeLabel(slot.kind, t, slot.pauseNumber);
  const Icon = getSlotIcon(slot.kind);
  const range = lessonRange(slot, t);
  const a11ySlot = slot.a11ySummary ? { ...slot, ...slot.a11ySummary } : slot;
  const a11yRange = lessonRange(a11ySlot, t);
  const isDone = slot.completed || slot.status === "done";
  const isRoutine = slot.kind === "routine";
  const isPause = slot.kind === "pause";
  const status = !isRoutine && !isPause ? statusFor(slot, t) : null;
  const StatusIcon = status?.Icon;
  const progressLabel = slot.status === "partial" && partialProgress && partialProgress.total > 0
    ? t("piano.timelinePartialProgress", partialProgress)
    : "";
  const moveLabel = !isRoutine && !isPause ? movedFrom(slot, language, t) : "";
  const timeRange = formatTimeRange(slot.startTime, slot.endTime);
  const a11yTimeRange = formatTimeRange(a11ySlot.startTime, a11ySlot.endTime);
  const duration = typeof slot.durationMinutes === "number" && slot.durationMinutes >= 0
    ? formatDuration(slot.durationMinutes, language)
    : "";
  const a11yDuration = typeof a11ySlot.durationMinutes === "number" && a11ySlot.durationMinutes >= 0
    ? formatDuration(a11ySlot.durationMinutes, language)
    : "";
  const isAutoLessonTitle = !!range && !!slot.title
    && /^da minilezione\s+\d+\s+a\s+\d+$/i.test(slot.title.trim());
  const routineText = isRoutine ? getRoutineLabel(slot, t) : "";
  const visibleTitle = isRoutine ? routineText : isAutoLessonTitle ? range : slot.title;
  const a11yTitleIsRange = !!a11yRange && !!slot.title
    && /^da minilezione\s+\d+\s+a\s+\d+$/i.test(slot.title.trim());
  const titlePieces = slot.kind === "routine"
    ? [routineText]
    : slot.kind === "pause"
      ? []
      : [slot.subject, !a11yTitleIsRange ? slot.title : "", a11yRange];
  const a11yPieces = [
    typeLabel,
    ...titlePieces,
    a11yTimeRange,
    a11yDuration && slot.kind === "study" ? t("piano.timelineEstimate", { duration: a11yDuration }) : "",
    a11yDuration && slot.kind !== "study" ? t("piano.timelineDuration", { duration: a11yDuration }) : "",
    status?.label,
    progressLabel,
    moveLabel,
    isRoutine ? t("piano.timelineReadOnly") : "",
  ].filter(Boolean);
  const accessibleName = ariaLabel ?? a11yPieces.join(", ");
  const renderedStyle = style ? {
    ...style,
    ...(typeof style.height === "number" ? { height: Math.max(44, style.height) } : {}),
  } : undefined;
  const routineIcon = isRoutine ? getRoutineIcon(slot.routineKind, slot.routineLabel) : null;
  const RoutineIcon = routineIcon;

  return (
    <li
      role="listitem"
      aria-label={accessibleName}
      data-slot-kind={slot.kind}
      data-slot-state={status?.key}
      data-readonly={isRoutine ? "true" : undefined}
      data-exiting={exiting ? "true" : undefined}
      className={cn(
        "planner-slot",
        `planner-slot--${slot.kind}`,
        isDone && "planner-slot--done",
        exiting && "planner-slot--exiting",
        !style && "planner-slot--untimed",
      )}
      style={renderedStyle}
    >
      <div className="planner-slot-content">
        <div className="planner-slot-heading">
          <span className="planner-slot-kind" data-slot-icon={slot.kind}>
            {isRoutine && <Lock className="planner-slot-type-icon" aria-hidden="true" />}
            {RoutineIcon ? <RoutineIcon className="planner-slot-type-icon" aria-hidden="true" /> : <Icon className="planner-slot-type-icon" aria-hidden="true" />}
            <span>{typeLabel}</span>
          </span>
          {timeRange && <time className="planner-slot-time font-mono tabular-nums">{timeRange}</time>}
          {duration && <span className="planner-slot-duration">{duration}</span>}
        </div>

        {(slot.subject || visibleTitle) && (
          <div className="planner-slot-copy">
            {slot.subject && slot.kind !== "busy" && <span className="planner-slot-subject">{slot.subject}</span>}
            {visibleTitle && <p className="planner-slot-title">{visibleTitle}</p>}
          </div>
        )}

        {status && StatusIcon && <span className="planner-slot-status" data-status={status.key}>
          <StatusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{status.label}</span>
          {progressLabel && <span className="planner-slot-progress">{progressLabel}</span>}
        </span>}
        {moveLabel && <span className="planner-slot-moved">{moveLabel}</span>}

        {(onEdit || onDelete) && !isRoutine && (
          <div className="planner-slot-actions">
            {onEdit && <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("piano.editEntry", { title: slot.title || slot.subject || typeLabel })} onClick={onEdit}><PencilLine aria-hidden="true" /></Button>}
            {onDelete && <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground hover:text-destructive" aria-label={t("piano.deleteEntry", { title: slot.title || slot.subject || typeLabel })} onClick={onDelete} data-haptic="warning"><Trash2 aria-hidden="true" /></Button>}
          </div>
        )}
      </div>
    </li>
  );
}
