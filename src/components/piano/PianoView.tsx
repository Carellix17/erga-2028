import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { EmptyState } from "@/components/shared/EmptyState";
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

/**
 * 🗓️ La stanza Piano: il calendario degli appuntamenti dello studente.
 * Un'unica superficie scura con il mese corrente (dati dall'orologio di
 * sistema), il conteggio degli eventi per giorno e, sotto la griglia,
 * "Aggiungi evento". "Genera piano di studio" compare solo dopo che lo
 * studente ha aggiunto un evento in questa sessione.
 */
export function PianoView({ hasFiles, onUploadClick }: PianoViewProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [editingStudyEvent, setEditingStudyEvent] = useState<StudyEvent | null>(null);
  const [suggestion, setSuggestion] = useState<PlanSuggestionData | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<StudyEvent | null>(null);
  const [evalToDelete, setEvalToDelete] = useState<Evaluation | null>(null);
  /** True dopo il primo evento aggiunto in questa sessione: svela "Genera piano di studio". */
  const [hasAddedEvent, setHasAddedEvent] = useState(false);
  // Elementi che si stanno "dissolvendo" prima dell'eliminazione vera
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const eventsQuery = useStudyEventsQuery(hasFiles);
  const addEvents = useAddStudyEvents();
  const deleteEvent = useDeleteStudyEvent();
  const updateEvent = useUpdateStudyEvent();
  const events = eventsQuery.data ?? [];
  const evaluationsQuery = useEvaluations(hasFiles);
  const evaluations = evaluationsQuery.data ?? [];
  const addEvaluation = useAddEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const deleteEvaluation = useDeleteEvaluation();
  const { data: userSubjects = [] } = useUserSubjects();

  const isLoading = eventsQuery.isLoading && events.length === 0;
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
    } catch (error) { console.error("Error generating plan:", error);
      toast({ title: t("piano.error"), description: error instanceof Error ? error.message : t("piano.errorGenerate"), variant: "destructive" });
    } finally { setIsGeneratingPlan(false); }
  };

  const handleAcceptPlan = async () => {
    if (!suggestion) return;
    try {
      const studyEvents = suggestion.studySessions.map(s => ({
        subject: s.subject, title: s.title, date: s.date, time: s.time, type: "study" as const,
      }));
      await addEvents.mutateAsync(studyEvents);
      toast({ title: t("piano.toastAccepted"), description: t("piano.toastAcceptedDesc") });
      setSuggestion(null);
    } catch (error) {
      toast({ title: t("piano.error"), description: error instanceof Error ? error.message : t("piano.errorSave"), variant: "destructive" });
    }
  };

  /** Elimina con dissolvenza: marca l'elemento, lascia partire l'animazione, poi rimuove davvero. */
  const withExit = async (ids: string[], action: () => Promise<unknown>) => {
    setExitingIds(ids);
    await new Promise((r) => setTimeout(r, 280));
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
      toast({ title: t("piano.toastEventDeleted"), description: t("piano.toastRemovedFromCalendar", { title: ev.title }) });
    } catch (error) {
      toast({ title: t("piano.error"), description: error instanceof Error ? error.message : t("piano.errorDelete"), variant: "destructive" });
    }
  };

  const handleDeleteEval = async () => {
    if (!evalToDelete) return;
    const ev = evalToDelete;
    setEvalToDelete(null);
    try {
      await withExit([ev.id], () => deleteEvaluation.mutateAsync(ev.id));
      toast({ title: t("piano.toastEvalDeleted") });
    } catch (err) {
      toast({ title: t("piano.error"), description: err instanceof Error ? err.message : t("piano.errorDelete"), variant: "destructive" });
    }
  };

  const handleSubmitEval = async (input: EvalFormInput, editingId: string | null) => {
    try {
      if (input.category === "altro" && !editingId) {
        // P46: impegno extra-scolastico → study_events (colonne esistenti,
        // event_type 'assignment' e materia "Altro": nessuna migrazione).
        await addEvents.mutateAsync([{
          subject: "Altro",
          title: input.title,
          date: input.date.slice(0, 10),
          time: input.startTime ?? undefined,
          type: "assignment",
        }]);
        toast({ title: t("piano.toastEventSaved"), description: t("piano.toastAddedToCalendar", { title: input.title }) });
        setHasAddedEvent(true);
        return;
      }
      // Solo le colonne realmente presenti in `evaluations`: i campi di sola UI
      // (category, startTime, endTime) romperebbero l'insert sul database.
      const { category: _category, startTime: _startTime, endTime: _endTime, ...payload } = input;
      if (editingId) {
        await updateEvaluation.mutateAsync({ id: editingId, ...payload });
        toast({ title: t("piano.toastSaved") });
      } else {
        await addEvaluation.mutateAsync(payload);
        toast({ title: t("piano.toastEventSaved"), description: t("piano.toastAddedToCalendar", { title: input.title }) });
        setHasAddedEvent(true);
      }
    } catch (err) {
      toast({ title: t("piano.error"), description: err instanceof Error ? err.message : t("piano.errorSave"), variant: "destructive" });
      throw err;
    }
  };

  const handleSaveStudyEvent = async (input: Parameters<typeof updateEvent.mutateAsync>[0]) => {
    try {
      await updateEvent.mutateAsync(input);
      toast({ title: t("piano.toastSessionUpdated") });
    } catch (err) {
      toast({ title: t("piano.error"), description: err instanceof Error ? err.message : t("piano.errorEdit"), variant: "destructive" });
      throw err;
    }
  };

  // Regola degli hook: tutte le chiamate prima di qualsiasi return anticipato.
  const showPlanSkeleton = useDelayedLoading(isLoading, 100);

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;
  if (showPlanSkeleton) return <StudyPlanSkeleton />;
  if (isLoading) return null;

  return (
    <div className="p-4 pb-28 space-y-4 animate-fade-up min-w-0 overflow-x-clip">
      {suggestion && (
        <PlanSuggestion explanation={suggestion.explanation} onAccept={handleAcceptPlan} onDecline={() => setSuggestion(null)} />
      )}

      {/* Superficie scura del calendario: il mondo zinc della griglia
          resta intero anche sulla pagina chiara del Piano. */}
      <section className="rounded-card bg-zinc-950 p-4 sm:p-6" aria-label={t("piano.upcoming")}>
        <AppointmentsCalendar
          evaluations={evaluations}
          events={events}
          subjects={userSubjects}
          exitingIds={exitingIds}
          onAddEvent={() => { setEditingEval(null); setShowAddSheet(true); }}
          showGeneratePlan={hasAddedEvent}
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
