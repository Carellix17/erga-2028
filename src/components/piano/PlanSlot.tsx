import { useEffect, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
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
  Move,
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
import type { MoveSlotTarget } from "@/lib/planner/conflicts";
import { addPlannerDays, plannerMinutesToTime, plannerTimeToMinutes } from "@/lib/planner/freeTime";
import type { PlannerEntry } from "@/lib/plannerEntries";
import { SlotDoneMenu } from "./SlotDoneMenu";

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
  entry?: PlannerEntry;
  onEdit?: () => void;
  onDelete?: () => void;
  onMove?: (entry: PlannerEntry, target?: MoveSlotTarget) => void;
  moveDate?: string;
  pixelsPerHour?: number;
  onMoveInteractionChange?: (active: boolean) => void;
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

interface PointerStart {
  pointerId: number;
  x: number;
  y: number;
  startMinutes: number;
  date: string;
  element: HTMLLIElement;
}

function dragTimeAt(pointer: PointerStart, clientY: number, pixelsPerHour: number) {
  const raw = pointer.startMinutes + ((clientY - pointer.y) / Math.max(1, pixelsPerHour)) * 60;
  const snapped = Math.round(raw / 5) * 5;
  return plannerMinutesToTime(Math.max(0, Math.min(23 * 60 + 55, snapped)));
}

function moveDayLabel(date: string, language: string) {
  const parsed = parseISO(date.slice(0, 10));
  return isValid(parsed) ? format(parsed, "EEEE d MMMM", { locale: language.startsWith("en") ? enUS : it }) : date;
}

export function PlanSlot({

  slot,
  style,
  exiting = false,
  ariaLabel,
  partialProgress,
  entry,
  onEdit,
  onDelete,
  onMove,
  moveDate,
  pixelsPerHour = 96,
  onMoveInteractionChange,
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
  const canMove = !!onMove
    && !!entry
    && !!moveDate
    && slot.kind === "study"
    && !!slot.startTime
    && !isDone
    && slot.status !== "skipped"
    && !exiting;
  const moveRef = useRef({ onMove, onMoveInteractionChange, entry, date: moveDate, startTime: slot.startTime, pixelsPerHour });
  moveRef.current = { onMove, onMoveInteractionChange, entry, date: moveDate, startTime: slot.startTime, pixelsPerHour };
  const pointerStartRef = useRef<PointerStart | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const keyboardActiveRef = useRef(false);
  const cancelMoveRef = useRef<() => void>(() => {});
  const [dragTarget, setDragTarget] = useState<MoveSlotTarget | null>(null);
  const [keyboardTarget, setKeyboardTarget] = useState<MoveSlotTarget | null>(null);
  keyboardActiveRef.current = keyboardTarget !== null;
  const activeMoveTarget = dragTarget ?? keyboardTarget;
  const moveAnnouncement = activeMoveTarget
    ? t("piano.move.keyboardAnnouncement", {
      day: moveDayLabel(activeMoveTarget.date, language),
      time: activeMoveTarget.time,
    })
    : "";
  const interactiveStyle = canMove
    ? { ...(renderedStyle ?? {}), touchAction: "pan-y" as const }
    : renderedStyle;

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const cancelMoveInteraction = () => {
    clearHoldTimer();
    const pointer = pointerStartRef.current;
    if (pointer && pointer.element.hasPointerCapture?.(pointer.pointerId)) {
      try { pointer.element.releasePointerCapture(pointer.pointerId); } catch { /* pointer may already be cancelled */ }
    }
    pointerStartRef.current = null;
    const wasActive = draggingRef.current || keyboardActiveRef.current;
    draggingRef.current = false;
    keyboardActiveRef.current = false;
    setDragTarget(null);
    setKeyboardTarget(null);
    if (wasActive) moveRef.current.onMoveInteractionChange?.(false);
  };
  cancelMoveRef.current = cancelMoveInteraction;

  const handlePointerDown = (event: ReactPointerEvent<HTMLLIElement>) => {
    if (!canMove || event.button !== 0 || event.isPrimary === false) return;
    if (event.target instanceof Element && event.target.closest(".planner-slot-actions, button, a, input")) return;
    const startMinutes = plannerTimeToMinutes(moveRef.current.startTime);
    const date = moveRef.current.date;
    if (startMinutes === null || !date) return;
    const pointerId = event.pointerId;
    pointerStartRef.current = {
      pointerId,
      x: event.clientX,
      y: event.clientY,
      startMinutes,
      date,
      element: event.currentTarget,
    };
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      const pointer = pointerStartRef.current;
      if (!pointer || pointer.pointerId !== pointerId) return;
      draggingRef.current = true;
      setDragTarget({ date: pointer.date, time: dragTimeAt(pointer, pointer.y, moveRef.current.pixelsPerHour) });
      moveRef.current.onMoveInteractionChange?.(true);
      try { pointer.element.setPointerCapture(pointer.pointerId); } catch { /* unsupported pointer capture is harmless */ }
    }, 300);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLLIElement>) => {
    const pointer = pointerStartRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (!draggingRef.current) {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) {
        clearHoldTimer();
        pointerStartRef.current = null;
      }
      return;
    }
    event.preventDefault();
    setDragTarget({
      date: pointer.date,
      time: dragTimeAt(pointer, event.clientY, moveRef.current.pixelsPerHour),
    });
  };

  const finishPointer = (event: ReactPointerEvent<HTMLLIElement>, commit: boolean) => {
    const pointer = pointerStartRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    clearHoldTimer();
    pointerStartRef.current = null;
    if (draggingRef.current && commit) {
      moveRef.current.onMove?.(moveRef.current.entry!, {
        date: pointer.date,
        time: dragTimeAt(pointer, event.clientY, moveRef.current.pixelsPerHour),
      });
    }
    const wasDragging = draggingRef.current;
    draggingRef.current = false;
    setDragTarget(null);
    if (wasDragging) moveRef.current.onMoveInteractionChange?.(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLLIElement>) => {
    if (!canMove) return;
    if (event.key === "Escape" && (draggingRef.current || keyboardActiveRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      cancelMoveInteraction();
      return;
    }
    if (event.target !== event.currentTarget) return;

    const directions: Record<string, number> = {
      ArrowUp: -15,
      ArrowDown: 15,
    };
    if (event.altKey && Object.prototype.hasOwnProperty.call(directions, event.key)) {
      const current = keyboardTarget ?? {
        date: moveRef.current.date!,
        time: moveRef.current.startTime!,
      };
      const currentMinutes = plannerTimeToMinutes(current.time);
      if (currentMinutes === null) return;
      const next = {
        date: current.date,
        time: plannerMinutesToTime(Math.max(0, Math.min(23 * 60 + 55, currentMinutes + directions[event.key]))),
      };
      setKeyboardTarget(next);
      if (!keyboardActiveRef.current) moveRef.current.onMoveInteractionChange?.(true);
      keyboardActiveRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const current = keyboardTarget ?? {
        date: moveRef.current.date!,
        time: moveRef.current.startTime!,
      };
      setKeyboardTarget({
        date: addPlannerDays(current.date, event.key === "ArrowLeft" ? -1 : 1),
        time: current.time,
      });
      if (!keyboardActiveRef.current) moveRef.current.onMoveInteractionChange?.(true);
      keyboardActiveRef.current = true;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "Enter" && keyboardTarget) {
      event.preventDefault();
      event.stopPropagation();
      moveRef.current.onMove?.(moveRef.current.entry!, keyboardTarget);
      setKeyboardTarget(null);
      keyboardActiveRef.current = false;
      moveRef.current.onMoveInteractionChange?.(false);
    }
  };

  const handleBlur = (event: ReactFocusEvent<HTMLLIElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null) || !keyboardActiveRef.current) return;
    setKeyboardTarget(null);
    keyboardActiveRef.current = false;
    moveRef.current.onMoveInteractionChange?.(false);
  };

  const isDragging = dragTarget !== null;
  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancelMoveRef.current();
    };
    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [isDragging]);

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (draggingRef.current || keyboardActiveRef.current) moveRef.current.onMoveInteractionChange?.(false);
  }, []);

  return (
    <li
      role="listitem"
      aria-label={accessibleName}
      data-slot-kind={slot.kind}
      data-slot-state={status?.key}
      data-readonly={isRoutine ? "true" : undefined}
      data-exiting={exiting ? "true" : undefined}
      data-dragging={dragTarget ? "true" : undefined}
      tabIndex={canMove ? 0 : undefined}
      onPointerDown={canMove ? handlePointerDown : undefined}
      onPointerMove={canMove ? handlePointerMove : undefined}
      onPointerUp={canMove ? (event) => finishPointer(event, true) : undefined}
      onPointerCancel={canMove ? (event) => finishPointer(event, false) : undefined}
      onKeyDown={canMove ? handleKeyDown : undefined}
      onBlur={canMove ? handleBlur : undefined}
      className={cn(
        "planner-slot",
        dragTarget && "ring-2 ring-primary shadow-level-2",
        canMove && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        `planner-slot--${slot.kind}`,
        isDone && "planner-slot--done",
        exiting && "planner-slot--exiting",
        !style && "planner-slot--untimed",
      )}
      style={interactiveStyle}
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
        {activeMoveTarget && (
          <span className="inline-flex min-h-11 items-center rounded-md border border-primary bg-background/90 px-3 font-mono text-sm shadow-sm" aria-hidden="true">
            {t("piano.move.dragLabel", { time: activeMoveTarget.time })}
          </span>
        )}
        {canMove && <span className="sr-only" aria-live="polite">{moveAnnouncement}</span>}

        {(entry || onEdit || onDelete || canMove) && !isRoutine && !isPause && (
          <div className="planner-slot-actions">
            {entry && <SlotDoneMenu entry={entry} slot={slot} />}
            {canMove && entry && onMove && <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("piano.move.moveAction", { title: slot.title || slot.subject || typeLabel })} onClick={() => onMove(entry)}><Move aria-hidden="true" /></Button>}
            {onEdit && <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={t("piano.editEntry", { title: slot.title || slot.subject || typeLabel })} onClick={onEdit}><PencilLine aria-hidden="true" /></Button>}
            {onDelete && <Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground hover:text-destructive" aria-label={t("piano.deleteEntry", { title: slot.title || slot.subject || typeLabel })} onClick={onDelete} data-haptic="warning"><Trash2 aria-hidden="true" /></Button>}
          </div>
        )}
      </div>
    </li>
  );
}
