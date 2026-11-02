import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { triggerHaptic } from "@/utils/haptics";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { usePlannerData, plannerDataKeys } from "@/hooks/usePlannerData";
import { useAutoReplan, type AutoReplanApplyRequest, type AutoReplanApplyResult, type AutoReplanPreview, type ReplanPrompt } from "@/hooks/useAutoReplan";
import { StudyPlanSkeleton } from "./StudyPlanSkeleton";
import { AppointmentsCalendar } from "./AppointmentsCalendar";
import { ChangePreview } from "./ChangePreview";
import { PlanHistory } from "./PlanHistory";
import { NoSpaceDialog } from "./NoSpaceDialog";
import { AddEventSheet, type EvalFormInput } from "./AddEventSheet";
import { EditStudyEventSheet } from "./EditStudyEventSheet";
import {
  useEvaluations, useAddEvaluation, useUpdateEvaluation, useDeleteEvaluation,
  type Evaluation,
} from "@/hooks/useEvaluations";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  PlanConflictError,
  studyEventsKeys,
  useStudyEventsQuery,
  useAddStudyEvents,
  useDeleteStudyEvent,
  useUpdateStudyEvent,
  useApplyPlanChanges,
  type StudyEvent,
} from "@/hooks/useStudyEvents";
import { planChangesKeys } from "@/hooks/usePlanChanges";
import { buildPlan, type PlanWarning, type ScheduleEvaluation } from "@/lib/planner/schedule";
import { plannerDateKey } from "@/lib/planner/freeTime";
import type { PlanChange, PlanChangeReason } from "@/lib/planner/types";
import { createInversePlanChanges, UndoCompletedSlotError, UndoTargetUnavailableError } from "./planChangeUndo";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PianoViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

interface PlanProposal {
  reason: PlanChangeReason;
  changes: PlanChange[];
  warnings: PlanWarning[];
  evaluations: readonly Pick<ScheduleEvaluation, "id" | "title" | "subject">[];
  afterApplyPrompt?: ReplanPrompt;
}

interface PackageToastOptions {
  title: string;
  description?: ReactNode;
  chooseTime?: boolean;
}

interface AutomaticPlanBanner {
  evaluationId: string;
  subject: string;
  date: string;
  proposal: PlanProposal;
}

interface UndoPlanRecord {
  changes: PlanChange[];
  eventsBefore: StudyEvent[];
  eventsAfter: StudyEvent[];
}

function planChangesFromSlots(slots: ReturnType<typeof buildPlan>["slots"]): PlanChange[] {
  return slots.map((slot) => ({
    op: "insert",
    after: {
      event_date: slot.event_date,
      event_time: slot.event_time,
      end_time: slot.end_time,
      context_id: slot.context_id,
      lesson_from: slot.lesson_from,
      lesson_to: slot.lesson_to,
      evaluation_id: slot.evaluation_id,
      source: slot.source,
      subject: slot.subject,
      title: slot.title,
    },
  }));
}

function isPlanConflict(error: unknown): boolean {
  return error instanceof PlanConflictError
    || (error instanceof Error && (error.message === "version_conflict" || error.message === "409"));
}

/** Calendario e scadenze; ogni giorno apre tutti gli impegni, anche senza materiali. */
export function PianoView({ hasFiles }: PianoViewProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [eventDate, setEventDate] = useState<string | undefined>();
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [editingStudyEvent, setEditingStudyEvent] = useState<StudyEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<StudyEvent | null>(null);
  const [evalToDelete, setEvalToDelete] = useState<Evaluation | null>(null);
  const [isPreparingPlan, setIsPreparingPlan] = useState(false);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [automaticBanner, setAutomaticBanner] = useState<AutomaticPlanBanner | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoPrompt, setAutoPrompt] = useState<ReplanPrompt | null>(null);
  // Elementi che si stanno "dissolvendo" prima dell'eliminazione vera.
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const dismissedAutomaticIds = useRef(new Set<string>());
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, dismiss } = useToast();
  const { t, i18n } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const plannerDataQuery = usePlannerData();

  const notify = (options: Parameters<typeof toast>[0]) => {
    triggerHaptic(options.variant === "destructive" ? "error" : "success");
    return toast(options);
  };
  const friendlyError = (kind: "save" | "edit" | "delete") => {
    switch (kind) {
      case "save": return t("piano.errorSave");
      case "edit": return t("piano.errorEdit");
      case "delete": return t("piano.errorDelete");
    }
  };
  const reportOperationError = (kind: "save" | "edit" | "delete", error: unknown, context: string) => {
    console.error(context, error);
    notify({ title: t("piano.error"), description: friendlyError(kind), variant: "destructive" });
  };

  const eventsQuery = useStudyEventsQuery(true);
  const addEvents = useAddStudyEvents();
  const deleteEvent = useDeleteStudyEvent();
  const updateEvent = useUpdateStudyEvent();
  const applyPlanChanges = useApplyPlanChanges();
  const events = eventsQuery.data ?? [];
  const evaluationsQuery = useEvaluations(true);
  const evaluations = evaluationsQuery.data ?? [];
  const addEvaluation = useAddEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const deleteEvaluation = useDeleteEvaluation();
  const { data: userSubjects = [] } = useUserSubjects();
  const { data: courses = [] } = useFileContextsQuery();
  const isLoading = eventsQuery.isLoading || evaluationsQuery.isLoading;
  const loadError = eventsQuery.isError || evaluationsQuery.isError || plannerDataQuery.isError;
  const isDeleting = deleteEvent.isPending;
  const eventQueryKey = studyEventsKeys.all(currentUser);

  const eligibleEvaluations = useMemo(() => {
    const data = plannerDataQuery.data;
    if (!data) return [];
    const today = plannerDateKey(new Date());
    return data.evaluations.filter((evaluation) => {
      const dueDay = plannerDateKey(evaluation.date);
      const alreadyHasStudySlot = data.events.some((event) =>
        event.evaluation_id === evaluation.id && event.event_type === "study",
      );
      return !evaluation.is_completed && !!dueDay && dueDay > today && !alreadyHasStudySlot;
    });
  }, [plannerDataQuery.data]);
  const canPreparePlan = eligibleEvaluations.length > 0
    && (hasFiles || eligibleEvaluations.some((evaluation) => evaluation.topic_id === null));

  const makeProposal = useCallback((selectedEvaluations: readonly ScheduleEvaluation[]): PlanProposal | null => {
    const data = plannerDataQuery.data;
    if (!data) return null;
    const result = buildPlan(data.buildPlanInput({
      today: new Date(),
      horizonDays: 30,
      evaluations: selectedEvaluations,
    }));
    return {
      reason: "generate",
      changes: planChangesFromSlots(result.slots),
      warnings: result.warnings,
      evaluations: [...selectedEvaluations],
    };
  }, [plannerDataQuery.data]);

  useEffect(() => {
    if (!plannerDataQuery.data || plannerDataQuery.isError || automaticBanner || previewOpen || historyOpen) return;
    const target = eligibleEvaluations.find((evaluation) => !dismissedAutomaticIds.current.has(evaluation.id));
    if (!target) return;
    const nextProposal = makeProposal([target]);
    if (!nextProposal || nextProposal.changes.length === 0) return;
    setAutomaticBanner({
      evaluationId: target.id,
      subject: target.subject || target.title,
      date: target.date,
      proposal: nextProposal,
    });
  }, [automaticBanner, eligibleEvaluations, historyOpen, makeProposal, plannerDataQuery.data, plannerDataQuery.isError, previewOpen]);

  const preparePlan = async () => {
    if (!plannerDataQuery.data) return;
    setIsPreparingPlan(true);
    try {
      const nextProposal = makeProposal(eligibleEvaluations);
      if (!nextProposal) return;
      eligibleEvaluations.forEach((evaluation) => dismissedAutomaticIds.current.add(evaluation.id));
      setAutomaticBanner(null);
      setProposal(nextProposal);
      setPreviewOpen(true);
      if (!nextProposal.changes.length && nextProposal.warnings.length === 0) {
        notify({ title: t("piano.changePreview.empty") });
      }
    } catch (error) {
      console.error("Error preparing the study plan:", error);
      notify({ title: t("piano.error"), description: t("piano.errorSave"), variant: "destructive" });
    } finally {
      setIsPreparingPlan(false);
    }
  };

  const openWeekView = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("view", "week");
      return next;
    });
  };

  const invalidatePlannerQueries = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: eventQueryKey }),
    queryClient.invalidateQueries({ queryKey: plannerDataKeys.all(currentUser) }),
    queryClient.invalidateQueries({ queryKey: planChangesKeys.all(currentUser) }),
  ]);

  const undoAppliedPlan = async (record: UndoPlanRecord) => {
    try {
      await queryClient.invalidateQueries({ queryKey: eventQueryKey });
      const latest = queryClient.getQueryData<StudyEvent[]>(eventQueryKey) ?? eventsQuery.data ?? [];
      const inverse = createInversePlanChanges(record.changes, record.eventsBefore, record.eventsAfter, latest);
      await applyPlanChanges.mutateAsync({ reason: "manual", changes: inverse });
      await invalidatePlannerQueries();
      notify({ title: t("piano.changePreview.undone") });
    } catch (error) {
      if (error instanceof UndoCompletedSlotError) {
        notify({ title: t("piano.planHistory.completed", { slot: error.slotTitle }), variant: "destructive" });
      } else if (isPlanConflict(error)) {
        notify({ title: t("piano.planHistory.conflict"), variant: "destructive" });
        await invalidatePlannerQueries();
      } else if (error instanceof UndoTargetUnavailableError) {
        notify({ title: t("piano.planHistory.unavailable"), variant: "destructive" });
      } else {
        console.error("Error undoing plan changes:", error);
        notify({ title: t("piano.errorSave"), variant: "destructive" });
      }
    }
  };

  const applyPlanPackage = async (
    reason: PlanChangeReason,
    changes: PlanChange[],
    toastOptions: PackageToastOptions,
  ): Promise<AutoReplanApplyResult> => {
    if (!changes.length) return "failed";
    const record: UndoPlanRecord = {
      changes,
      eventsBefore: queryClient.getQueryData<StudyEvent[]>(eventQueryKey) ?? events,
      eventsAfter: [],
    };
    try {
      await applyPlanChanges.mutateAsync({ reason, changes });
      await queryClient.refetchQueries({ queryKey: eventQueryKey, type: "active" });
      record.eventsAfter = queryClient.getQueryData<StudyEvent[]>(eventQueryKey) ?? [];
      await invalidatePlannerQueries();
      const toastId: { current?: string } = {};
      const description = toastOptions.chooseTime ? (
        <div className="flex flex-wrap items-center gap-2">
          {toastOptions.description && <span>{toastOptions.description}</span>}
          <Button
            variant="link"
            className="min-h-11 px-1"
            onClick={() => {
              openWeekView();
              if (toastId.current) dismiss(toastId.current);
            }}
          >
            {t("piano.autoReplan.chooseTime")}
          </Button>
        </div>
      ) : toastOptions.description;
      const toastResult = notify({
        title: toastOptions.title,
        ...(description ? { description } : {}),
        duration: 10_000,
        "aria-live": "polite",
        action: (
          <ToastAction
            altText={t("piano.slotUndo")}
            className="h-11"
            onClick={(event) => {
              event.preventDefault();
              void undoAppliedPlan(record).finally(() => {
                if (toastId.current) dismiss(toastId.current);
              });
            }}
          >
            {t("piano.slotUndo")}
          </ToastAction>
        ),
      });
      toastId.current = toastResult.id;
      return "applied";
    } catch (error) {
      console.error("Error applying planner changes:", error);
      if (isPlanConflict(error)) {
        notify({ title: t("piano.planHistory.conflict"), variant: "destructive" });
        await invalidatePlannerQueries();
        return "conflict";
      }
      notify({ title: t("piano.error"), description: t("piano.errorSave"), variant: "destructive" });
      return "failed";
    }
  };

  const applyAutoReplan = async (request: AutoReplanApplyRequest): Promise<AutoReplanApplyResult> => {
    const day = request.targetDate
      ? format(parseISO(request.targetDate.slice(0, 10)), "EEEE", { locale: (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? enUS : it })
      : "";
    const title = request.kind === "moved" || request.kind === "kept"
      ? t("piano.autoReplan.movedToast", { day, time: request.targetTime?.slice(0, 5) ?? "" })
      : request.kind === "partial"
        ? t("piano.autoReplan.partialToast")
        : request.kind === "split"
          ? t("piano.autoReplan.splitToast")
          : t("piano.autoReplan.noSpaceToast", { deadline: request.deadline ?? "" });
    return applyPlanPackage(request.reason, request.changes, {
      title,
      chooseTime: request.kind === "moved" || request.kind === "kept",
    });
  };

  const applyProposal = async (selectedChanges: PlanChange[]) => {
    if (!proposal || selectedChanges.length === 0) return;
    const activeProposal = proposal;
    const result = await applyPlanPackage(activeProposal.reason, selectedChanges, {
      title: t("piano.changePreview.applied", { count: selectedChanges.length }),
      ...(activeProposal.warnings.length > 0
        ? { description: t("piano.changePreview.appliedWithWarnings", { count: activeProposal.warnings.length }) }
        : {}),
    });
    if (result !== "applied") return;
    if (activeProposal.afterApplyPrompt) setAutoPrompt(activeProposal.afterApplyPrompt);
    setPreviewOpen(false);
    setProposal(null);
  };

  const openReplanPreview = (nextProposal: AutoReplanPreview) => {
    setProposal({
      reason: nextProposal.reason,
      changes: nextProposal.changes,
      warnings: nextProposal.warnings,
      evaluations: nextProposal.evaluations,
    });
    setPreviewOpen(true);
  };

  const autoReplan = useAutoReplan({
    plannerData: plannerDataQuery.data,
    events: eventsQuery.data,
    enabled: !isLoading && !loadError,
    blocked: isLoading || loadError || previewOpen || historyOpen || !!autoPrompt
      || showAddSheet || !!editingEval || !!editingStudyEvent || !!eventToDelete || !!evalToDelete
      || searchParams.has("slot") || applyPlanChanges.isPending,
    prompt: autoPrompt,
    onPromptChange: setAutoPrompt,
    onPreview: openReplanPreview,
    onApply: applyAutoReplan,
  });

  /** Elimina con dissolvenza: marca l'elemento, lascia partire l'animazione, poi rimuove davvero. */
  const withExit = async (ids: string[], action: () => Promise<unknown>) => {
    setExitingIds(ids);
    if (!reducedMotion) await new Promise((resolve) => setTimeout(resolve, 180));
    try {
      await action();
    } finally {
      setExitingIds([]);
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    const ev = eventToDelete;
    setEventToDelete(null);
    try {
      await withExit([ev.id], () => deleteEvent.mutateAsync(ev.id));
      notify({ title: t("piano.toastEventDeleted"), description: t("piano.toastRemovedFromCalendar", { title: ev.title }) });
    } catch (error) {
      reportOperationError("delete", error, "Error deleting study event:");
    }
  };

  const handleDeleteEval = async () => {
    if (!evalToDelete) return;
    const ev = evalToDelete;
    setEvalToDelete(null);
    try {
      await withExit([ev.id], () => deleteEvaluation.mutateAsync(ev.id));
      notify({ title: t("piano.toastEvalDeleted") });
    } catch (error) {
      reportOperationError("delete", error, "Error deleting evaluation:");
    }
  };

  const handleSubmitEval = async (input: EvalFormInput, editingId: string | null) => {
    try {
      if (input.category === "altro" && !editingId) {
        // P46: impegno extra-scolastico → study_events (colonne esistenti,
        // event_type 'assignment' e materia "Altro": nessuna migrazione).
        const notes = input.description?.trim();
        const endTime = input.endTime?.trim();
        await addEvents.mutateAsync([{
          subject: "Altro",
          title: input.title,
          date: format(parseISO(input.date), "yyyy-MM-dd"),
          time: input.startTime ?? undefined,
          type: "assignment",
          ...(notes ? { notes } : {}),
          ...(endTime ? { endTime } : {}),
        }]);
        notify({ title: t("piano.toastEventSaved"), description: t("piano.toastAddedToCalendar", { title: input.title }) });
        return;
      }
      // Solo le colonne realmente presenti in `evaluations`: i campi di sola UI
      // (category, startTime, endTime) romperebbero l'insert sul database.
      const { category: _category, startTime: _startTime, endTime: _endTime, ...payload } = input;
      if (editingId) {
        await updateEvaluation.mutateAsync({ id: editingId, ...payload });
        notify({ title: t("piano.toastSaved") });
      } else {
        await addEvaluation.mutateAsync(payload);
        notify({ title: t("piano.toastEventSaved"), description: t("piano.toastAddedToCalendar", { title: input.title }) });
      }
      void plannerDataQuery.refetch();
    } catch (error) {
      reportOperationError(
        editingId ? "edit" : "save",
        error,
        editingId ? "Error editing planner event:" : "Error saving planner event:",
      );
      throw error;
    }
  };

  const handleSaveStudyEvent = async (input: Parameters<typeof updateEvent.mutateAsync>[0]) => {
    try {
      await updateEvent.mutateAsync(input);
      notify({ title: t("piano.toastSessionUpdated") });
    } catch (error) {
      reportOperationError("edit", error, "Error editing study event:");
      throw error;
    }
  };

  const openAutomaticProposal = (banner: AutomaticPlanBanner) => {
    dismissedAutomaticIds.current.add(banner.evaluationId);
    setProposal({ ...banner.proposal, reason: "generate" });
    setAutomaticBanner(null);
    setPreviewOpen(true);
  };

  const dismissAutomaticProposal = (banner: AutomaticPlanBanner) => {
    dismissedAutomaticIds.current.add(banner.evaluationId);
    setAutomaticBanner(null);
  };

  const handleModifyPlan = () => {
    setPreviewOpen(false);
    openWeekView();
  };

  const showPlanSkeleton = useDelayedLoading(isLoading, 100);

  if (showPlanSkeleton) return <StudyPlanSkeleton />;
  if (isLoading) return null;

  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? enUS : it;
  const automaticDate = automaticBanner && plannerDateKey(automaticBanner.date)
    ? format(parseISO(plannerDateKey(automaticBanner.date)), "EEEE d MMMM", { locale })
    : automaticBanner?.date ?? "";

  return (
    <div className="min-w-0 space-y-6">
      {automaticBanner && (
        <aside role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="min-w-0 flex-1 text-sm font-medium">
            {t("piano.autoPlan.banner", { subject: automaticBanner.subject, date: automaticDate })}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => openAutomaticProposal(automaticBanner)} className="min-h-11">{t("piano.autoPlan.view")}</Button>
            <Button variant="ghost" onClick={() => dismissAutomaticProposal(automaticBanner)} className="min-h-11">{t("piano.autoPlan.later")}</Button>
          </div>
        </aside>
      )}

      {loadError && <div role="alert" className="border border-destructive p-4 text-base">
        <p>{t("piano.loadError")}</p>
        <Button variant="outline" className="mt-3" onClick={() => {
          void eventsQuery.refetch();
          void evaluationsQuery.refetch();
          void plannerDataQuery.refetch();
        }}>{t("piano.retry")}</Button>
      </div>}
      {/* Calendario sempre accessibile, anche senza materiale caricato. */}
      <section className="min-w-0" aria-labelledby="planner-calendar-heading">
        <AppointmentsCalendar
          evaluations={evaluations}
          events={events}
          subjects={userSubjects}
          courses={courses}
          exitingIds={exitingIds}
          onAddEvent={(date) => { setEventDate(date); setEditingEval(null); setShowAddSheet(true); }}
          showGeneratePlan={canPreparePlan && !loadError}
          onPreparePlan={() => void preparePlan()}
          isPreparingPlan={isPreparingPlan}
          onOpenHistory={() => setHistoryOpen(true)}
          onEditEvaluation={setEditingEval}
          onEditStudyEvent={setEditingStudyEvent}
          onDeleteEvaluation={setEvalToDelete}
          onDeleteStudyEvent={setEventToDelete}
        />
      </section>

      <AddEventSheet
        open={showAddSheet || !!editingEval}
        onOpenChange={(open) => { if (!open) { setShowAddSheet(false); setEditingEval(null); } }}
        initial={editingEval}
        presetDate={eventDate}
        onSubmit={handleSubmitEval}
      />

      <EditStudyEventSheet
        event={editingStudyEvent}
        onOpenChange={(open) => { if (!open) setEditingStudyEvent(null); }}
        onSave={handleSaveStudyEvent}
      />

      {(isDeleting || deleteEvaluation.isPending) && (
        <span role="status" className="sr-only">{t("piano.deleting")}</span>
      )}

      <ChangePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        changes={proposal?.changes ?? []}
        warnings={proposal?.warnings ?? []}
        evaluations={proposal?.evaluations ?? []}
        isApplying={applyPlanChanges.isPending}
        onApply={applyProposal}
        onModify={handleModifyPlan}
        onLeave={() => setPreviewOpen(false)}
      />

      <PlanHistory open={historyOpen} onOpenChange={setHistoryOpen} />

      <NoSpaceDialog
        prompt={autoPrompt}
        isApplying={applyPlanChanges.isPending}
        onDismiss={() => setAutoPrompt(null)}
        onKeep={() => void autoReplan.handleKeep(autoPrompt)}
        onSplit={() => void autoReplan.handleSplit(autoPrompt)}
        onChooseTime={() => { setAutoPrompt(null); openWeekView(); }}
        onShortenSessions={() => { setAutoPrompt(null); openWeekView(); }}
      />

      {/* Conferma eliminazione singola sessione */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("piano.deleteOneTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("piano.deleteOneDesc", { title: eventToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("piano.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">{t("piano.deleting")}</span>
                </>
              ) : t("piano.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conferma eliminazione singola scadenza */}
      <AlertDialog open={!!evalToDelete} onOpenChange={() => setEvalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("piano.deleteEvalTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("piano.deleteOneDesc", { title: evalToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvaluation.isPending}>{t("piano.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEval}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteEvaluation.isPending}
            >
              {deleteEvaluation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span className="sr-only">{t("piano.deleting")}</span>
                </>
              ) : t("piano.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
