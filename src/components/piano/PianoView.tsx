import { triggerHaptic } from "@/utils/haptics";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { StudyPlanSkeleton } from "./StudyPlanSkeleton";
import { AppointmentsCalendar } from "./AppointmentsCalendar";
import { PlanSuggestion } from "./PlanSuggestion";
import { AddEventSheet, type EvalFormInput } from "./AddEventSheet";
import { EditStudyEventSheet } from "./EditStudyEventSheet";
import {
  useEvaluations, useAddEvaluation, useUpdateEvaluation, useDeleteEvaluation,
  type Evaluation,
} from "@/hooks/useEvaluations";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useStudyEventsQuery, useAddStudyEvents, useDeleteStudyEvent, useUpdateStudyEvent,
  type StudyEvent,
} from "@/hooks/useStudyEvents";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PianoViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

interface PlanSuggestionData { explanation: string; studySessions: { subject: string; title: string; date: string; time?: string; }[]; }

/** Calendario e scadenze; ogni giorno apre tutti gli impegni, anche senza materiali. */
export function PianoView({ hasFiles }: PianoViewProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [eventDate, setEventDate] = useState<string | undefined>();
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [editingStudyEvent, setEditingStudyEvent] = useState<StudyEvent | null>(null);
  const [suggestion, setSuggestion] = useState<PlanSuggestionData | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<StudyEvent | null>(null);
  const [evalToDelete, setEvalToDelete] = useState<Evaluation | null>(null);
  // Elementi che si stanno "dissolvendo" prima dell'eliminazione vera
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const notify = (options: Parameters<typeof toast>[0]) => {
    triggerHaptic(options.variant === "destructive" ? "error" : "success");
    return toast(options);
  };
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();

  const eventsQuery = useStudyEventsQuery(true);
  const addEvents = useAddStudyEvents();
  const deleteEvent = useDeleteStudyEvent();
  const updateEvent = useUpdateStudyEvent();
  const events = eventsQuery.data ?? [];
  const evaluationsQuery = useEvaluations(true);
  const evaluations = evaluationsQuery.data ?? [];
  const addEvaluation = useAddEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const deleteEvaluation = useDeleteEvaluation();
  const { data: userSubjects = [] } = useUserSubjects();

  const { data: courses = [] } = useFileContextsQuery();
  const isLoading = eventsQuery.isLoading || evaluationsQuery.isLoading;
  const loadError = eventsQuery.isError || evaluationsQuery.isError;
  const isDeleting = deleteEvent.isPending;

  const generatePlan = async () => {
    if (!currentUser) return;
    setIsGeneratingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t("piano.errorGenerate"));
      setSuggestion(data.plan);
      triggerHaptic("success");
    } catch (error) { console.error("Error generating plan:", error);
      notify({ title: t("piano.error"), description: error instanceof Error ? error.message : t("piano.errorGenerate"), variant: "destructive" });
    } finally { setIsGeneratingPlan(false); }
  };

  const handleAcceptPlan = async () => {
    if (!suggestion) return;
    try {
      const studyEvents = suggestion.studySessions.map(s => ({
        subject: s.subject, title: s.title, date: s.date, time: s.time, type: "study" as const,
      }));
      await addEvents.mutateAsync(studyEvents);
      notify({ title: t("piano.toastAccepted"), description: t("piano.toastAcceptedDesc") });
      setSuggestion(null);
    } catch (error) {
      notify({ title: t("piano.error"), description: error instanceof Error ? error.message : t("piano.errorSave"), variant: "destructive" });
    }
  };

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
    setEventToDelete(null); // chiudi subito: l'elemento si dissolve nella lista
    try {
      await withExit([ev.id], () => deleteEvent.mutateAsync(ev.id));
      notify({ title: t("piano.toastEventDeleted"), description: t("piano.toastRemovedFromCalendar", { title: ev.title }) });
    } catch (error) {
      notify({ title: t("piano.error"), description: error instanceof Error ? error.message : t("piano.errorDelete"), variant: "destructive" });
    }
  };

  const handleDeleteEval = async () => {
    if (!evalToDelete) return;
    const ev = evalToDelete;
    setEvalToDelete(null);
    try {
      await withExit([ev.id], () => deleteEvaluation.mutateAsync(ev.id));
      notify({ title: t("piano.toastEvalDeleted") });
    } catch (err) {
      notify({ title: t("piano.error"), description: err instanceof Error ? err.message : t("piano.errorDelete"), variant: "destructive" });
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
    } catch (err) {
      notify({ title: t("piano.error"), description: err instanceof Error ? err.message : t("piano.errorSave"), variant: "destructive" });
      throw err;
    }
  };

  const handleSaveStudyEvent = async (input: Parameters<typeof updateEvent.mutateAsync>[0]) => {
    try {
      await updateEvent.mutateAsync(input);
      notify({ title: t("piano.toastSessionUpdated") });
    } catch (err) {
      notify({ title: t("piano.error"), description: err instanceof Error ? err.message : t("piano.errorEdit"), variant: "destructive" });
      throw err;
    }
  };

  // Regola degli hook: tutte le chiamate prima di qualsiasi return anticipato.
  const showPlanSkeleton = useDelayedLoading(isLoading, 100);

  if (showPlanSkeleton) return <StudyPlanSkeleton />;
  if (isLoading) return null;

  return (
    <div className="min-w-0 space-y-6">
      {suggestion && (
        <PlanSuggestion explanation={suggestion.explanation} onAccept={handleAcceptPlan} onDecline={() => setSuggestion(null)} />
      )}

      {loadError && <div role="alert" className="border border-destructive p-4 text-base">
        <p>{t("piano.loadError")}</p>
        <Button variant="outline" className="mt-3" onClick={() => { void eventsQuery.refetch(); void evaluationsQuery.refetch(); }}>{t("piano.retry")}</Button>
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
          showGeneratePlan={hasFiles && !loadError && (events.length > 0 || evaluations.some((evaluation) => !evaluation.is_completed))}
          onGeneratePlan={generatePlan}
          isGeneratingPlan={isGeneratingPlan}
          onEditEvaluation={setEditingEval}
          onEditStudyEvent={setEditingStudyEvent}
          onDeleteEvaluation={setEvalToDelete}
          onDeleteStudyEvent={setEventToDelete}
        />
      </section>

      <AddEventSheet
        open={showAddSheet || !!editingEval}
        onOpenChange={(o) => { if (!o) { setShowAddSheet(false); setEditingEval(null); } }}
        initial={editingEval}
        presetDate={eventDate}
        onSubmit={handleSubmitEval}
      />

      <EditStudyEventSheet
        event={editingStudyEvent}
        onOpenChange={(o) => { if (!o) setEditingStudyEvent(null); }}
        onSave={handleSaveStudyEvent}
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
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("piano.delete")}
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
              {deleteEvaluation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("piano.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
