import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlanChanges, planChangesKeys } from "@/hooks/usePlanChanges";
import { PlanConflictError, studyEventsKeys, useApplyPlanChanges, useStudyEventsQuery, type StudyEvent } from "@/hooks/useStudyEvents";
import type { PlanChange, PlanChangeRow } from "@/lib/planner/types";
import { createInversePlanChanges, UndoCompletedSlotError, UndoTargetUnavailableError } from "./planChangeUndo";

interface PlanHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HISTORY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function asPlanChanges(value: PlanChangeRow["changes"]): PlanChange[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PlanChange => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const op = (entry as { op?: unknown }).op;
    return op === "insert" || op === "update" || op === "delete";
  });
}

function isConflict(error: unknown): boolean {
  return error instanceof PlanConflictError
    || (error instanceof Error && (error.message === "version_conflict" || error.message === "409"));
}

function isUndoable(row: PlanChangeRow, locallyUndone: boolean): boolean {
  return !locallyUndone
    && row.applied_at !== null
    && row.undone_at === null
    && row.status !== "undone"
    && row.status !== "reversed";
}

export function PlanHistory({ open, onOpenChange }: PlanHistoryProps) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const historyQuery = usePlanChanges(open);
  const eventsQuery = useStudyEventsQuery(open);
  const applyChanges = useApplyPlanChanges();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locallyUndone, setLocallyUndone] = useState<Set<string>>(() => new Set());
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? enUS : it;
  const since = useMemo(() => Date.now() - HISTORY_WINDOW_MS, []);
  const records = useMemo(() => (historyQuery.data ?? []).filter((row) => {
    const timestamp = Date.parse(row.applied_at ?? row.created_at);
    return Number.isFinite(timestamp) && timestamp >= since && row.applied_at !== null;
  }), [historyQuery.data, since]);
  const eventKey = studyEventsKeys.all(currentUser);
  const changesKey = planChangesKeys.all(currentUser);

  useEffect(() => {
    if (open) setErrorMessage(null);
  }, [open]);

  const dateLabel = (value: string) => {
    const date = parseISO(value);
    return isValid(date) ? format(date, "d MMMM yyyy, HH:mm", { locale }) : value;
  };

  const undo = async (row: PlanChangeRow) => {
    setErrorMessage(null);
    const changes = asPlanChanges(row.changes);
    if (!changes.length) {
      setErrorMessage(t("piano.planHistory.unavailable"));
      return;
    }
    setUndoingId(row.id);

    try {
      await queryClient.invalidateQueries({ queryKey: eventKey });
      const latest = queryClient.getQueryData<StudyEvent[]>(eventKey) ?? eventsQuery.data ?? [];
      const inverse = createInversePlanChanges(changes, [], [], latest);
      await applyChanges.mutateAsync({ reason: "manual", changes: inverse });
      setLocallyUndone((current) => new Set(current).add(row.id));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventKey }),
        queryClient.invalidateQueries({ queryKey: changesKey }),
      ]);
    } catch (error) {
      if (error instanceof UndoCompletedSlotError) {
        setErrorMessage(t("piano.planHistory.completed", { slot: error.slotTitle }));
      } else if (isConflict(error)) {
        setErrorMessage(t("piano.planHistory.conflict"));
        await queryClient.invalidateQueries({ queryKey: eventKey });
      } else if (error instanceof UndoTargetUnavailableError) {
        setErrorMessage(t("piano.planHistory.unavailable"));
      } else {
        console.error("Error undoing a plan package:", error);
        setErrorMessage(t("piano.errorSave"));
      }
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile
          ? "flex h-[90dvh] max-h-[90dvh] w-full max-w-none flex-col gap-0 overflow-hidden p-0"
          : "flex h-full w-[480px] max-w-[min(480px,100vw)] flex-col gap-0 overflow-hidden p-0"}
      >
        <SheetHeader className="shrink-0 border-b border-border p-5 pr-16 text-left">
          <SheetTitle>{t("piano.planHistory.title")}</SheetTitle>
          <SheetDescription>{t("piano.planHistory.description")}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-destructive p-3 text-sm text-destructive">{errorMessage}</p>}

          {historyQuery.isLoading && <p role="status">{t("piano.loading")}</p>}
          {historyQuery.isError && (
            <div role="alert" className="space-y-2">
              <p>{t("piano.planHistory.loadError")}</p>
              <Button variant="outline" onClick={() => void historyQuery.refetch()}>{t("piano.retry")}</Button>
            </div>
          )}
          {eventsQuery.isError && <p role="status" className="mb-3 text-sm text-muted-foreground">{t("piano.planHistory.eventsRefreshError")}</p>}

          {!historyQuery.isLoading && !historyQuery.isError && records.length === 0 && (
            <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">{t("piano.planHistory.empty")}</p>
          )}

          <ol className="space-y-3">
            {records.map((row) => {
              const changes = asPlanChanges(row.changes);
              const isBusy = undoingId === row.id;
              const canUndo = isUndoable(row, locallyUndone.has(row.id));
              return (
                <li key={row.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <time className="text-sm text-muted-foreground" dateTime={row.applied_at ?? row.created_at}>
                        {dateLabel(row.applied_at ?? row.created_at)}
                      </time>
                      <p className="mt-1 font-medium">{t("piano.planHistory.package", { count: changes.length })}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                    </div>
                    {canUndo ? (
                      <Button
                        variant="outline"
                        onClick={() => void undo(row)}
                        disabled={applyChanges.isPending}
                        className="min-h-11 min-w-11"
                      >
                        {isBusy ? t("piano.planHistory.undoing") : t("piano.slotUndo")}
                      </Button>
                    ) : (
                      <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">{t("piano.planHistory.undone")}</span>
                    )}
                  </div>
                  <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                    {changes.slice(0, 4).map((change, index) => {
                      const itemTitle = change.op === "delete"
                        ? change.before?.title
                        : change.after.title;
                      return <li key={`${row.id}-${index}`} className="truncate">{itemTitle || t("piano.type_study")}</li>;
                    })}
                    {changes.length > 4 && <li className="text-muted-foreground">{t("piano.planHistory.more", { count: changes.length - 4 })}</li>}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}
