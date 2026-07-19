import { useMemo, useState } from "react";
import { Plus, Loader2, Trash2, Timer, ClipboardCheck, Mic, PencilLine, Hammer, BookOpen, Pencil, ChevronDown, CalendarDays, CalendarRange, Target } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlanItem } from "./PlanItem";
import { PlanSuggestion } from "./PlanSuggestion";
import { AddEventSheet, type EvalFormInput } from "./AddEventSheet";
import { EditStudyEventSheet } from "./EditStudyEventSheet";
import { WeekPlanner } from "./WeekPlanner";
import {
  useEvaluations, useAddEvaluation, useUpdateEvaluation, useDeleteEvaluation, useDeleteAllEvaluations,
  type Evaluation, type EvaluationType,
} from "@/hooks/useEvaluations";
import { useUserSubjects, type UserSubject } from "@/hooks/useUserSubjects";
import { useUserRoutines } from "@/hooks/useUserRoutines";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useStudyEventsQuery, useAddStudyEvents, useDeleteStudyEvent, useUpdateStudyEvent,
  useDeleteStudyEventsByType, useDeleteAllStudyEvents, type StudyEvent,
} from "@/hooks/useStudyEvents";
import { resolveSubjectColor, type SubjectColor } from "@/lib/subjectColors";
import { dayKey } from "@/lib/weekPlanner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useFocus } from "@/contexts/FocusContext";
import type { DayContentProps } from "react-day-picker";

interface PianoViewProps { hasFiles: boolean; onUploadClick: () => void; }
interface PlanSuggestionData { explanation: string; studySessions: { subject: string; title: string; date: string; time?: string; }[]; }

type CalendarMode = "month" | "week";
type DeleteScope = "study" | "all";

export function PianoView({ hasFiles, onUploadClick }: PianoViewProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluation | null>(null);
  const [editingStudyEvent, setEditingStudyEvent] = useState<StudyEvent | null>(null);
  const [suggestion, setSuggestion] = useState<PlanSuggestionData | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventToDelete, setEventToDelete] = useState<StudyEvent | null>(null);
  const [evalToDelete, setEvalToDelete] = useState<Evaluation | null>(null);
  const [deleteScope, setDeleteScope] = useState<DeleteScope | null>(null);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const focus = useFocus();

  const eventsQuery = useStudyEventsQuery(hasFiles);
  const addEvents = useAddStudyEvents();
  const deleteEvent = useDeleteStudyEvent();
  const updateEvent = useUpdateStudyEvent();
  const deleteByType = useDeleteStudyEventsByType();
  const deleteAllEvents = useDeleteAllStudyEvents();
  const events = eventsQuery.data ?? [];
  const evaluationsQuery = useEvaluations(hasFiles);
  const evaluations = evaluationsQuery.data ?? [];
  const addEvaluation = useAddEvaluation();
  const updateEvaluation = useUpdateEvaluation();
  const deleteEvaluation = useDeleteEvaluation();
  const deleteAllEvaluations = useDeleteAllEvaluations();
  const { data: userSubjects = [] } = useUserSubjects();
  const { data: routines = [] } = useUserRoutines();
  const subjectById = new Map(userSubjects.map((s) => [s.id, s]));
  const colorBySubjectName = useMemo(() => {
    const m = new Map<string, UserSubject>();
    for (const s of userSubjects) m.set(s.name.toLowerCase(), s);
    return m;
  }, [userSubjects]);

  const colorFor = (name?: string): SubjectColor | undefined =>
    name ? resolveSubjectColor(name, colorBySubjectName.get(name.toLowerCase())?.color) : undefined;

  const isLoading = eventsQuery.isLoading && events.length === 0;
  const isDeleting = deleteEvent.isPending;
  const nothingToDelete = events.length === 0 && evaluations.length === 0;

  // ============================================================
  // Pallini del calendario mensile: colori delle MATERIE (max 3 al giorno)
  // ============================================================
  const dotsByDay = useMemo(() => {
    const map = new Map<string, { solid: string; evalDot: boolean }[]>();
    const push = (key: string, solid: string | null, evalDot = false) => {
      const arr = map.get(key) ?? [];
      // dedup: stesso colore (o stesso anello scuro) non si ripete
      if (evalDot && arr.some((d) => d.evalDot)) { map.set(key, arr); return; }
      if (!evalDot && solid && arr.some((d) => d.solid === solid)) { map.set(key, arr); return; }
      arr.push({ solid: solid ?? "", evalDot });
      map.set(key, arr.slice(0, 3));
    };
    for (const e of events) {
      push(dayKey(e.event_date), colorFor(e.subject)?.solid ?? "bg-slate-300");
    }
    for (const ev of evaluations) {
      push(dayKey(new Date(ev.date)), null, true);
    }
    return map;
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [events, evaluations, colorBySubjectName]);

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
      if (!response.ok) throw new Error(data.error || "Errore nella generazione del piano");
      setSuggestion(data.plan);
    } catch (error) { console.error("Error generating plan:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" });
    } finally { setIsGeneratingPlan(false); }
  };

  const handleAcceptPlan = async () => {
    if (!suggestion) return;
    try {
      const studyEvents = suggestion.studySessions.map(s => ({
        subject: s.subject, title: s.title, date: s.date, time: s.time, type: "study" as const,
      }));
      await addEvents.mutateAsync(studyEvents);
      toast({ title: "Piano accettato!", description: "Le sessioni di studio sono state aggiunte al tuo calendario." });
      setSuggestion(null);
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel salvataggio", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent.mutateAsync(eventToDelete.id);
      toast({ title: "Evento eliminato", description: `${eventToDelete.title} è stato rimosso dal calendario.` });
      setEventToDelete(null);
    } catch (error) {
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nell'eliminazione", variant: "destructive" });
    }
  };

  const handleSubmitEval = async (input: EvalFormInput, editingId: string | null) => {
    try {
      if (editingId) {
        await updateEvaluation.mutateAsync({ id: editingId, ...input });
        toast({ title: "Modifiche salvate" });
      } else {
        await addEvaluation.mutateAsync(input);
        toast({ title: "Evento salvato", description: `${input.title} aggiunto al calendario.` });
      }
      if (input.date) setSelectedDate(new Date(input.date));
    } catch (err) {
      toast({ title: "Errore", description: err instanceof Error ? err.message : "Errore nel salvataggio", variant: "destructive" });
      throw err;
    }
  };

  const handleSaveStudyEvent = async (input: Parameters<typeof updateEvent.mutateAsync>[0]) => {
    try {
      await updateEvent.mutateAsync(input);
      toast({ title: "Sessione aggiornata" });
    } catch (err) {
      toast({ title: "Errore", description: err instanceof Error ? err.message : "Errore nella modifica", variant: "destructive" });
      throw err;
    }
  };

  const handleBulkDelete = async () => {
    if (!deleteScope) return;
    try {
      if (deleteScope === "study") {
        await deleteByType.mutateAsync("study");
        toast({ title: "Sessioni di studio eliminate", description: "Verifiche e compiti sono rimasti." });
      } else {
        await Promise.all([deleteAllEvents.mutateAsync(), deleteAllEvaluations.mutateAsync()]);
        toast({ title: "Piano svuotato", description: "Eventi, verifiche e compiti sono stati eliminati." });
      }
      setDeleteScope(null);
    } catch (err) {
      toast({ title: "Errore", description: err instanceof Error ? err.message : "Errore nell'eliminazione", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string) => format(new Date(dateString), "d MMM", { locale: it });

  const selectedDateEvents = selectedDate ? events.filter(event => isSameDay(new Date(event.event_date), selectedDate)) : [];
  const selectedDateEvaluations = selectedDate ? evaluations.filter(ev => isSameDay(new Date(ev.date), selectedDate)) : [];

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-level-3 animate-pulse-soft">
        <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
      </div>
      <p className="text-muted-foreground font-display font-medium">Caricamento eventi...</p>
    </div>
  );

  return (
    <div className="p-4 pb-28 space-y-4 animate-fade-up">
      {suggestion && (
        <PlanSuggestion explanation={suggestion.explanation} onAccept={handleAcceptPlan} onDecline={() => setSuggestion(null)} />
      )}

      {!suggestion && (
        <div className="flex flex-row gap-3 w-full">
          <LiquidButton
            size="lg"
            onClick={generatePlan}
            disabled={isGeneratingPlan}
            className="flex-[2] h-14 gap-2.5 rounded-2xl bg-primary text-primary-foreground shadow-level-1 hover:shadow-level-2 hover:scale-[1.02] transition-all duration-400 ease-m3-emphasized"
          >
            {isGeneratingPlan ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-display font-semibold">Generazione piano...</span>
              </>
            ) : (
              <span className="font-display font-semibold">Genera piano di studio</span>
            )}
          </LiquidButton>
          <Button
            type="button"
            variant="outline"
            onClick={() => (focus.isActive ? focus.openFullscreen() : focus.openSetup())}
            className="flex-[1] h-14 gap-1.5 rounded-2xl border-outline-variant bg-surface-container-low hover:bg-surface-container-high hover:scale-[1.02] transition-all duration-400 ease-m3-emphasized"
          >
            <Timer className="w-4 h-4" />
            <span className="font-display font-semibold">
              {focus.isActive ? "Riprendi" : "Focus"}
            </span>
          </Button>
        </div>
      )}

      {/* Calendario: Mese ⇄ Settimana */}
      <div className="m3-card-elevated rounded-xl p-4">
        <div className="flex justify-center mb-2">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface-container">
            {([
              { key: "month", label: "Mese", Icon: CalendarDays },
              { key: "week", label: "Settimana", Icon: CalendarRange },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setCalendarMode(key)}
                aria-pressed={calendarMode === key}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                  calendarMode === key ? "bg-black text-white shadow-level-1" : "text-slate-700",
                )}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {calendarMode === "month" ? (
          <>
            <Calendar
              mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={it}
              className="rounded-xl pointer-events-auto w-full"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-display font-semibold",
                nav: "space-x-1 flex items-center",
                nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-xl hover:bg-surface-container-highest transition-all",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-10 w-full text-center text-sm p-0 relative",
                day: "h-10 w-10 p-0 font-normal mx-auto rounded-xl hover:bg-surface-container-highest transition-all duration-200",
                day_selected: "bg-primary text-primary-foreground hover:text-primary-foreground focus:text-primary-foreground shadow-level-1",
                day_today: "bg-secondary-container text-foreground font-semibold",
                day_outside: "opacity-30",
                day_disabled: "opacity-30",
                day_hidden: "invisible",
              }}
              components={{
                DayContent: ({ date }: DayContentProps) => {
                  const dots = dotsByDay.get(dayKey(date)) ?? [];
                  return (
                    <span className="flex flex-col items-center leading-none">
                      <span>{format(date, "d")}</span>
                      <span className="flex gap-0.5 h-1.5 mt-0.5 items-center">
                        {dots.map((d, i) =>
                          d.evalDot ? (
                            <span key={i} className="w-1.5 h-1.5 rounded-full border border-slate-800" />
                          ) : (
                            <span key={i} className={cn("w-1.5 h-1.5 rounded-full", d.solid)} />
                          ),
                        )}
                      </span>
                    </span>
                  );
                },
              }}
            />
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-outline-variant justify-center">
              <div className="flex items-center gap-1.5 label-small px-2.5 py-1 rounded-full bg-surface-container">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Pallini = colori delle materie</span>
              </div>
            </div>
          </>
        ) : (
          <WeekPlanner
            selectedDate={selectedDate ?? new Date()}
            onSelectDate={setSelectedDate}
            events={events}
            evaluations={evaluations}
            routines={routines}
            subjects={userSubjects}
            onOpenStudyEvent={(id) => {
              const ev = events.find((e) => e.id === id);
              if (ev) setEditingStudyEvent(ev);
            }}
            onOpenEvaluation={(id) => {
              const ev = evaluations.find((e) => e.id === id);
              if (ev) setEditingEval(ev);
            }}
          />
        )}
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h1 className="title-medium font-display font-semibold">
          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: it }) : "Prossimi eventi"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingEval(null); setShowAddSheet(true); }} aria-label="Aggiungi nuovo evento">
            <Plus className="w-4 h-4 mr-1" />Evento
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={nothingToDelete} aria-label="Elimina elementi del piano" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-1" />Elimina<ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setDeleteScope("study")}>
                Elimina solo sessioni di studio
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-700" onSelect={() => setDeleteScope("all")}>
                Elimina tutto il piano
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Evaluations for selected date */}
      {selectedDate && selectedDateEvaluations.length > 0 && (
        <div className="space-y-3">
          {selectedDateEvaluations.map((ev, i) => (
            <div key={ev.id} className={`relative group animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`}>
              <EvaluationItem
                evaluation={ev}
                subject={ev.subject_id ? subjectById.get(ev.subject_id) : undefined}
              />
              <div className="absolute -right-2 -top-2 flex gap-1.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-300">
                <Button variant="outline" size="icon" aria-label="Modifica scadenza"
                  className="w-8 h-8 rounded-full shadow-level-2 bg-white scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100 transition-transform"
                  onClick={(e) => { e.stopPropagation(); setEditingEval(ev); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="destructive" size="icon" aria-label="Elimina scadenza"
                  className="w-8 h-8 rounded-full shadow-level-2 scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100 transition-transform"
                  onClick={(e) => { e.stopPropagation(); setEvalToDelete(ev); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Events */}
      {selectedDate && selectedDateEvents.length === 0 ? (
        selectedDateEvaluations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground m3-card-elevated rounded-xl">
            <p className="body-large font-medium">Nessun evento per questa data.</p>
            <Button variant="link" onClick={() => { setEditingEval(null); setShowAddSheet(true); }} className="mt-2 text-primary">Aggiungi un evento</Button>
          </div>
        ) : null
      ) : selectedDate && selectedDateEvents.length > 0 ? (
        <div className="space-y-3">
          {selectedDateEvents.map((event, i) => (
            <div key={event.id} className={`relative group animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`}>
              <PlanItem
                item={{ id: event.id, subject: event.subject, title: event.title, date: formatDate(event.event_date), time: event.event_time, type: event.event_type }}
                subjectColor={colorFor(event.subject)}
              />
              <div className="absolute -right-2 -top-2 flex gap-1.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-300">
                <Button variant="outline" size="icon" aria-label="Modifica evento"
                  className="w-8 h-8 rounded-full shadow-level-2 bg-white scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100 transition-transform"
                  onClick={(e) => { e.stopPropagation(); setEditingStudyEvent(event); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="destructive" size="icon" aria-label="Elimina evento"
                  className="w-8 h-8 rounded-full shadow-level-2 scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100 transition-transform"
                  onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        events.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground m3-card-elevated rounded-xl">
            <p className="body-large font-medium">Nessun evento in programma.</p>
            <p className="body-small mt-1">Aggiungi verifiche e compiti per generare un piano di studio.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 5).map((event, i) => (
              <div key={event.id} className={`relative group animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`}>
                <PlanItem item={{ id: event.id, subject: event.subject, title: event.title, date: formatDate(event.event_date), time: event.event_time, type: event.event_type }}
                  subjectColor={colorFor(event.subject)}
                  onClick={() => setSelectedDate(new Date(event.event_date))} />
                <div className="absolute -right-2 -top-2 flex gap-1.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-all duration-300">
                  <Button variant="outline" size="icon" aria-label="Modifica evento"
                    className="w-8 h-8 rounded-full shadow-level-2 bg-white scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100 transition-transform"
                    onClick={(e) => { e.stopPropagation(); setEditingStudyEvent(event); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="destructive" size="icon" aria-label="Elimina evento"
                    className="w-8 h-8 rounded-full shadow-level-2 scale-0 group-hover:scale-100 [@media(hover:none)]:scale-100 transition-transform"
                    onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

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
            <AlertDialogTitle>Elimina evento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{eventToDelete?.title}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conferma eliminazione singola scadenza */}
      <AlertDialog open={!!evalToDelete} onOpenChange={() => setEvalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina scadenza</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{evalToDelete?.title}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvaluation.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!evalToDelete) return;
                try {
                  await deleteEvaluation.mutateAsync(evalToDelete.id);
                  toast({ title: "Scadenza eliminata" });
                  setEvalToDelete(null);
                } catch (err) {
                  toast({ title: "Errore", description: err instanceof Error ? err.message : "", variant: "destructive" });
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteEvaluation.isPending}
            >
              {deleteEvaluation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conferma eliminazione di massa */}
      <AlertDialog open={!!deleteScope} onOpenChange={() => setDeleteScope(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteScope === "study" ? "Eliminare le sessioni di studio?" : "Eliminare TUTTO il piano?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteScope === "study"
                ? "Verranno eliminate solo le sessioni di studio (anche quelle generate dall'AI). Verifiche e compiti resteranno."
                : "Verranno eliminate TUTTE le sessioni di studio, le verifiche e i compiti. La tua routine settimanale non verrà toccata. L'azione non può essere annullata."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteByType.isPending || deleteAllEvents.isPending || deleteAllEvaluations.isPending}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteByType.isPending || deleteAllEvents.isPending || deleteAllEvaluations.isPending}
            >
              {(deleteByType.isPending || deleteAllEvents.isPending || deleteAllEvaluations.isPending)
                ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const EVAL_ICONS: Record<EvaluationType, typeof Mic> = {
  orale: Mic,
  interrogazione: Mic,
  scritta: PencilLine,
  compito: BookOpen,
  pratica: Hammer,
};

const EVAL_LABELS: Record<EvaluationType, string> = {
  orale: "Orale",
  scritta: "Scritta",
  pratica: "Pratica",
  interrogazione: "Interrogazione",
  compito: "Compito",
};

function EvaluationItem({ evaluation, subject }: { evaluation: Evaluation; subject?: UserSubject }) {
  const Icon = EVAL_ICONS[evaluation.type] ?? ClipboardCheck;
  const topic = evaluation.topic_type === "free" ? evaluation.free_topic_title : null;
  const subjectColor = subject ? resolveSubjectColor(subject.name, subject.color) : undefined;
  return (
    <div className={cn("rounded-xl p-4 bg-white border border-slate-200 shadow-level-1 border-l-4", subjectColor?.border ?? "border-l-foreground")}>
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          subjectColor ? cn(subjectColor.solid, "text-white") : "bg-foreground text-background")}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="label-small px-2.5 py-0.5 rounded-full bg-foreground text-background">
              {EVAL_LABELS[evaluation.type]}
            </span>
            {subject && subjectColor && (
              <span className={cn("label-small px-2.5 py-0.5 rounded-full", subjectColor.badge, subjectColor.badgeText)}>
                {subject.name}
              </span>
            )}
            {evaluation.goal != null && (
              <span className="label-small px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                <Target className="w-3 h-3" />
                Obiettivo {evaluation.goal}
              </span>
            )}
          </div>
          <p className="title-small">{evaluation.title}</p>
          {topic && <p className="body-small text-muted-foreground mt-0.5">Argomento: {topic}</p>}
          {evaluation.description && (
            <p className="body-small text-muted-foreground mt-1 line-clamp-2">{evaluation.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
