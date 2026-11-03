import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO, type Locale } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UserRoutine } from "@/hooks/useUserRoutines";
import type { PlannerEntry } from "@/lib/plannerEntries";
import {
  addPlannerDays,
  plannerDateKey,
  plannerMinutesToTime,
  plannerTimeToMinutes,
  plannerWeekday,
  type PlannerRoutine,
} from "@/lib/planner/freeTime";
import {
  findConflicts,
  findFirstFreeTime,
  type FindConflictsResult,
  type MoveConflictEvent,
  type MoveSlotSaveTarget,
  type MoveSlotTarget,
} from "@/lib/planner/conflicts";

export interface MoveSlotRequest {
  event: StudyEvent;
  target?: MoveSlotTarget;
}

interface MoveSlotSheetProps {
  request: MoveSlotRequest | null;
  entries: readonly PlannerEntry[];
  routines: readonly UserRoutine[];
  routinesLoading?: boolean;
  isSaving?: boolean;
  now?: Date;
  onOpenChange: (open: boolean) => void;
  onSave: (event: StudyEvent, target: MoveSlotSaveTarget) => Promise<"applied" | "conflict" | "failed">;
}

function normalizeTime(value?: string | null): string {
  const minute = plannerTimeToMinutes(value);
  if (minute === null) return "";
  const snapped = Math.min(23 * 60 + 55, Math.round(minute / 5) * 5);
  return plannerMinutesToTime(snapped);
}

function eventDuration(event: StudyEvent): number {
  const start = plannerTimeToMinutes(event.event_time);
  const end = plannerTimeToMinutes(event.end_time);
  return start !== null && end !== null && end > start ? end - start : 60;
}

function displayDay(value: string, locale: Locale): string {
  const parsed = parseISO(value.slice(0, 10));
  return isValid(parsed) ? format(parsed, "EEE", { locale }).replace(/\.$/, "") : value;
}

function longDay(value: string, locale: Locale): string {
  const parsed = parseISO(value.slice(0, 10));
  return isValid(parsed) ? format(parsed, "EEEE d MMMM", { locale }) : value;
}

function routineForPlanner(routine: UserRoutine): PlannerRoutine {
  return {
    id: routine.id,
    kind: routine.kind,
    label: routine.label,
    start_time: routine.start_time,
    end_time: routine.end_time,
    days_of_week: routine.days_of_week,
  };
}

function asConflictEvent(entry: PlannerEntry): MoveConflictEvent {
  const date = plannerDateKey(entry.date) ?? entry.date.toISOString().slice(0, 10);
  const eventType = entry.kind === "study" ? "study" : entry.kind === "evaluation" ? "test" : "assignment";
  return {
    id: entry.id,
    event_date: date,
    event_time: entry.time ?? null,
    end_time: entry.endTime ?? null,
    event_type: eventType,
    subject: entry.subject,
    label: entry.title,
    status: entry.status,
    is_completed: entry.completed,
    source: entry.source,
    locked: entry.locked,
  };
}

export function MoveSlotSheet({
  request,
  entries,
  routines,
  routinesLoading = false,
  isSaving = false,
  now,
  onOpenChange,
  onSave,
}: MoveSlotSheetProps) {
  const { t, i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? enUS : it;
  const [selectedDay, setSelectedDay] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const event = request?.event;
  const originalDay = event ? plannerDateKey(event.event_date) ?? event.event_date.slice(0, 10) : "";
  const originalTime = event ? normalizeTime(event.event_time) : "";
  const originalDuration = event ? eventDuration(event) : 60;
  const originalEnd = event && plannerTimeToMinutes(originalTime) !== null
    ? plannerMinutesToTime(plannerTimeToMinutes(originalTime)! + originalDuration)
    : "";

  useEffect(() => {
    if (!request) return;
    setSelectedDay(plannerDateKey(request.target?.date ?? request.event.event_date) ?? originalDay);
    setTime(normalizeTime(request.target?.time ?? request.event.event_time));
    setDuration(eventDuration(request.event));
    setSubmitting(false);
  }, [request, originalDay]);

  const selectedStart = plannerTimeToMinutes(time);
  const selectedEnd = selectedStart === null ? null : selectedStart + duration;
  const endTime = selectedEnd !== null && selectedEnd < 24 * 60 ? plannerMinutesToTime(selectedEnd) : "";
  const validPosition = !!selectedDay && selectedStart !== null && selectedStart % 5 === 0 && !!endTime && duration >= 1;
  const conflictRoutines = useMemo(() => routines.map(routineForPlanner), [routines]);
  const conflictEvents = useMemo(() => entries.map(asConflictEvent), [entries]);
  const analysis: FindConflictsResult = useMemo(() => {
    if (!event || !validPosition || selectedStart === null || !endTime) {
      return { valid: false, hasConflict: false, conflicts: [], proposals: [] };
    }
    return findConflicts({
      id: event.id,
      eventTime: time,
      endTime,
      original: {
        date: originalDay,
        eventTime: originalTime,
        endTime: originalEnd || endTime,
      },
      routines: conflictRoutines,
      events: conflictEvents,
    }, selectedDay);
  }, [
    conflictEvents,
    conflictRoutines,
    endTime,
    event,
    originalDay,
    originalEnd,
    originalTime,
    selectedDay,
    selectedStart,
    time,
    validPosition,
  ]);
  const weekStart = selectedDay
    ? addPlannerDays(selectedDay, 1 - plannerWeekday(selectedDay))
    : "";
  const weekDays = weekStart ? Array.from({ length: 7 }, (_, index) => addPlannerDays(weekStart, index)) : [];
  const dataUnavailable = routinesLoading;
  const busy = isSaving || submitting;
  const clearPosition = selectedDay === originalDay && time === originalTime && endTime === originalEnd;
  const previewText = useMemo(() => {
    if (!request || !validPosition || !endTime) return t("piano.move.chooseValidTime");
    const status = analysis.hasConflict ? t("piano.move.conflictsFound") : t("piano.move.noConflict");
    return t("piano.move.preview", {
      fromDay: displayDay(originalDay, locale),
      fromTime: originalTime,
      toDay: displayDay(selectedDay, locale),
      time,
      endTime,
      status,
    });
  }, [analysis.hasConflict, endTime, locale, originalDay, originalTime, request, selectedDay, t, time, validPosition]);

  const setTarget = (target: MoveSlotTarget, targetEndTime?: string) => {
    const start = plannerTimeToMinutes(target.time);
    const end = plannerTimeToMinutes(targetEndTime);
    setSelectedDay(target.date);
    setTime(normalizeTime(target.time));
    setDuration(start !== null && end !== null && end > start ? end - start : originalDuration);
  };

  const chooseFirstFree = () => {
    if (!event || !selectedDay || !validPosition) return;
    const first = findFirstFreeTime({
      fromDay: selectedDay,
      fromTime: time,
      durationMinutes: duration,
      now: now ?? new Date(),
      routines: conflictRoutines,
      events: conflictEvents,
      excludeEventId: event.id,
    });
    if (first) setTarget(first);
  };

  const chooseTomorrow = () => {
    if (!selectedDay || !time) return;
    setTarget({ date: addPlannerDays(selectedDay, 1), time }, plannerMinutesToTime((selectedStart ?? 0) + duration));
  };

  const chooseProposal = (kind: "after" | "shorten") => {
    const proposal = analysis.proposals.find((item) => item.kind === kind);
    if (proposal && proposal.kind !== "keep") setTarget(proposal, proposal.endTime);
  };

  const handleSave = async () => {
    if (!event || !validPosition || !analysis.valid || analysis.hasConflict || dataUnavailable || busy || clearPosition) return;
    setSubmitting(true);
    try {
      await onSave(event, { date: selectedDay, time, endTime });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!busy) onOpenChange(open);
  };

  return (
    <Sheet open={!!request} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="pb-safe max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5 pr-10">
          <SheetTitle>{t("piano.move.title", { title: event?.title ?? "" })}</SheetTitle>
          <SheetDescription>{t("piano.move.description")}</SheetDescription>
        </SheetHeader>

        {event && (
          <div className="space-y-5">
            <section aria-label={t("piano.move.chooseDay")}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("piano.move.chooseDay")}</h3>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={t("piano.move.previousWeek")}
                    onClick={() => setSelectedDay(addPlannerDays(selectedDay, -7))}
                    disabled={busy || !selectedDay}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={t("piano.move.nextWeek")}
                    onClick={() => setSelectedDay(addPlannerDays(selectedDay, 7))}
                    disabled={busy || !selectedDay}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1" role="group" aria-label={t("piano.move.weekDays")}>
                {weekDays.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={day === selectedDay ? "default" : "outline"}
                    className="h-auto min-h-11 min-w-0 flex-col gap-0 px-1 py-2 text-xs"
                    aria-label={longDay(day, locale)}
                    aria-pressed={day === selectedDay}
                    onClick={() => setSelectedDay(day)}
                    disabled={busy}
                  >
                    <span>{displayDay(day, locale)}</span>
                    <span>{Number(day.slice(-2))}</span>
                  </Button>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="move-slot-time">{t("piano.move.time")}</Label>
                <Input
                  id="move-slot-time"
                  type="time"
                  step={300}
                  value={time}
                  disabled={busy}
                  onChange={(change) => {
                    setDuration(originalDuration);
                    setTime(change.target.value);
                  }}
                  className="min-h-11"
                />
              </div>
              <div className="flex flex-col gap-2 sm:pt-6">
                <Button type="button" variant="outline" className="min-h-11" onClick={chooseFirstFree} disabled={busy || dataUnavailable || !validPosition}>
                  {t("piano.move.firstFree")}
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={chooseTomorrow} disabled={busy || !selectedDay || !time}>
                  {t("piano.move.tomorrowSameTime")}
                </Button>
              </div>
            </div>

            <p className="rounded-lg bg-muted/50 p-3 text-sm" aria-live="polite">{previewText}</p>
            {dataUnavailable && <p role="status" className="text-sm text-muted-foreground">{t("piano.move.loadingRoutines")}</p>}

            {analysis.hasConflict && (
              <div role="status" aria-live="polite" className="rounded-lg border border-destructive p-3 text-destructive">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-semibold">{t("piano.move.conflictTitle")}</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {analysis.conflicts.map((conflict, index) => (
                        <li key={`${conflict.kind}-${conflict.startTime}-${index}`}>
                          {t(conflict.kind === "routine" ? "piano.move.routineConflict" : "piano.move.eventConflict", {
                            label: conflict.label,
                            start: conflict.startTime,
                            end: conflict.endTime,
                          })}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {analysis.proposals.map((proposal) => (
                    <Button
                      key={proposal.kind}
                      type="button"
                      variant={proposal.kind === "keep" ? "ghost" : "outline"}
                      className="min-h-11 w-full justify-start"
                      disabled={busy}
                      onClick={() => {
                        if (proposal.kind === "keep") onOpenChange(false);
                        else chooseProposal(proposal.kind);
                      }}
                    >
                      {proposal.kind === "after"
                        ? t("piano.move.after", { time: proposal.time })
                        : proposal.kind === "shorten"
                          ? t("piano.move.shorten", { time: proposal.endTime })
                          : t("piano.move.keep")}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SheetFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("piano.move.cancel")}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={busy || dataUnavailable || !validPosition || !analysis.valid || analysis.hasConflict || clearPosition}
            onClick={() => void handleSave()}
          >
            {busy ? t("piano.move.saving") : t("piano.move.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
