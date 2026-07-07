import { useState, useEffect, useRef } from "react";
import { FullscreenLesson } from "./FullscreenLesson";
import { FinalTest } from "./FinalTest";
import { LessonsList } from "./LessonsList";
import { CourseSelector } from "./CourseSelector";
import { GenerationProgress } from "./GenerationProgress";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Exercise } from "./exercises/ExerciseRenderer";
import { supabase } from "@/integrations/supabase/client";
import { edgeFetch } from "@/lib/edgeFetch";
import { currentLanguage } from "@/i18n";
import {
  useLessonsQuery,
  useStudyContextsQuery,
  useUpdateLessonProgress,
  useLessonsCacheControls,
  type Lesson,
} from "@/hooks/useLessons";
import {
  useGenerationUsage,
  useInvalidateGenerationUsage,
  FREE_LIMIT_MESSAGE,
} from "@/hooks/useGenerationUsage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDeleteFileContext } from "@/hooks/useFileContexts";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  selectedContextId?: string | null;
  onClearContext?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function StudioView({ hasFiles, onUploadClick, selectedContextId, onClearContext, onFullscreenChange }: StudioViewProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  // `localStarting` copre la finestra tra il click "Genera" e la prima scrittura
  // di `generation_status='generating'` da parte del backend. Lo stato vero
  // arriva via Realtime dalla riga di `study_contexts`.
  const [localStarting, setLocalStarting] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [showList, setShowList] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const [showFinalTest, setShowFinalTest] = useState(false);
  const [finalTestExercises, setFinalTestExercises] = useState<Exercise[]>([]);
  const [isLoadingFinalTest, setIsLoadingFinalTest] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const push = usePushNotifications();
  const deleteContextMutation = useDeleteFileContext();

  // Rate limiting beta: 5 mini-lezioni gratuite per utente.
  // Le lezioni dei contesti demo NON contano nel limite.
  const usageQuery = useGenerationUsage();
  const usage = usageQuery.data;
  const invalidateUsage = useInvalidateGenerationUsage();
  const limitReached = !!usage && !usage.unlimited && usage.remaining <= 0;

  // Tracciamento delle generazioni di lezione in volo per evitare doppie chiamate
  // sullo stesso (contextId, lessonIndex) durante refetch della query.
  const inflightLessonsRef = useRef<Set<string>>(new Set());

  // === React Query: contesti + lezioni cached (5 min) ===
  const contextsQuery = useStudyContextsQuery();
  const allContexts = contextsQuery.data ?? [];

  // Determina contextId effettivo
  useEffect(() => {
    if (selectedContextId) setActiveContextId(selectedContextId);
  }, [selectedContextId]);

  useEffect(() => {
    if (allContexts.length === 0) return;
    const availableIds = new Set(allContexts.map((c) => c.id));
    if (selectedContextId && !availableIds.has(selectedContextId)) {
      onClearContext?.();
    }
    if (!selectedContextId && (!activeContextId || !availableIds.has(activeContextId))) {
      setActiveContextId(allContexts[0].id);
    }
  }, [allContexts, selectedContextId, activeContextId, onClearContext]);

  const effectiveContextId =
    (selectedContextId && allContexts.some((c) => c.id === selectedContextId) && selectedContextId) ||
    (activeContextId && allContexts.some((c) => c.id === activeContextId) && activeContextId) ||
    allContexts[0]?.id ||
    null;

  const activeContext = allContexts.find((c) => c.id === effectiveContextId) || null;
  const contextFileName = activeContext?.file_name || null;
  const contextStatus = activeContext?.processing_status || null;
  const contextErrorMessage = activeContext?.error_message || "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.";
  const isDemoContext = !!activeContext?.is_demo;
  // Il limite è effettivo solo per percorsi NON demo
  const generationBlocked = limitReached && !isDemoContext;

  // ── Stato persistente di generazione (sopravvive a chiusura app) ──
  const generationStatus = activeContext?.generation_status ?? "idle";
  const generationProgress = activeContext?.generation_progress ?? {};
  const isGenerating = localStarting || generationStatus === "generating";
  const generationStep = (generationProgress.step as
    | "analyzing"
    | "creating-index"
    | "generating-lessons"
    | "complete") || "creating-index";
  const generationTotalLessons = generationProgress.totalLessons ?? 0;
  const generationLessonCount = generationProgress.generatedCount ?? 0;

  // Quando il backend completa, ricarica le lezioni e mostra un toast.
  useEffect(() => {
    if (generationStatus === "completed") {
      invalidateList(effectiveContextId);
      invalidateContexts();
    } else if (generationStatus === "failed" && activeContext?.generation_error) {
      toast({
        title: "Generazione non riuscita",
        description: activeContext.generation_error,
        variant: "destructive",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus, effectiveContextId]);

  const lessonsQuery = useLessonsQuery(effectiveContextId);
  const lessons: Lesson[] = lessonsQuery.data?.lessons ?? [];
  const cachedCurrentIndex = lessonsQuery.data?.currentIndex ?? 0;
  const updateProgress = useUpdateLessonProgress(effectiveContextId);
  const { invalidateList, invalidateContexts, setLessonsList } = useLessonsCacheControls();

  // 🚦 Bridging: dopo che il backend segna 'completed', le lezioni potrebbero
  // non essere ancora arrivate al client. Manteniamo uno stato "settling" per
  // evitare che l'utente veda lampeggiare la schermata "Nessuna lezione" tra
  // la fine della generazione e l'arrivo del refetch.
  const [postCompleteSettling, setPostCompleteSettling] = useState(false);
  useEffect(() => {
    if (generationStatus === "completed") {
      setPostCompleteSettling(true);
      // Forza il refetch immediato e sblocca quando arrivano i dati o dopo timeout.
      lessonsQuery.refetch().finally(() => setPostCompleteSettling(false));
      const t = window.setTimeout(() => setPostCompleteSettling(false), 6000);
      return () => window.clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus, effectiveContextId]);

  // Sincronizza l'indice corrente con quello del cloud al primo load di un context.
  // Per un nuovo PDF la progressione è separata, quindi parte da 0.
  useEffect(() => {
    setCurrentLessonIndex(cachedCurrentIndex);
  }, [effectiveContextId, cachedCurrentIndex]);

  // Spinner SOLO al primo fetch (nessuna cache disponibile)
  const isLoading = hasFiles && lessonsQuery.isLoading && lessons.length === 0;

  useEffect(() => { if (lessons.length === 0) return; setCurrentLessonIndex((idx) => { if (idx < 0) return 0; if (idx > lessons.length - 1) return lessons.length - 1; return idx; }); }, [lessons.length]);
  // ⚠️ NESSUNA auto-generazione a cascata. Le lezioni vengono generate SOLO on-demand:
  //   - quando l'utente apre una lezione (handleSelectLesson)
  //   - quando l'utente passa alla "prossima" (handleNext), max 1 in anticipo
  // Concorrenza: massimo UNA richiesta in volo (vedi inflightLessonsRef + isGeneratingLesson).
  useEffect(() => { onFullscreenChange?.(activeLessonIndex !== null || showFinalTest); }, [activeLessonIndex, showFinalTest, onFullscreenChange]);

  const refetchLessons = async () => {
    invalidateContexts();
    invalidateList(effectiveContextId);
  };

  useEffect(() => {
    if (contextStatus !== "pending" && contextStatus !== "processing") return;
    const timer = window.setInterval(refetchLessons, 2500);
    return () => window.clearInterval(timer);
  }, [contextStatus, effectiveContextId]);

  // 🔁 Fallback di polling durante la generazione: se la sottoscrizione Realtime
  // non recapita gli update (es. replication non attiva sulla tabella), forziamo
  // comunque il refresh del contesto + lista lezioni così l'UI si aggiorna sulla
  // stessa scheda senza dover ricaricare.
  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => {
      invalidateContexts();
      invalidateList(effectiveContextId);
    }, 2500);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, effectiveContextId]);

  const handleGenerateLessons = async () => {
    if (!currentUser) return;
    if (generationBlocked) {
      toast({ title: "Limite raggiunto", description: FREE_LIMIT_MESSAGE, variant: "destructive" });
      return;
    }
    if (contextStatus === "pending" || contextStatus === "processing") {
      toast({ title: "PDF in elaborazione", description: "Attendi il completamento dell'analisi prima di generare il percorso." });
      await refetchLessons();
      return;
    }
    if (contextStatus === "failed") {
      toast({ title: "PDF non elaborabile", description: contextErrorMessage, variant: "destructive" });
      return;
    }
    if (isGenerating) {
      toast({ title: "Generazione già in corso", description: "Stiamo già creando il tuo percorso. Attendi qualche istante." });
      return;
    }
    setLocalStarting(true);
    try {
      // Chiedi (una sola volta) il permesso notifiche: avviseremo a fine generazione.
      if (push.supported && push.permission === "default") {
        push.subscribe().catch(() => {});
      } else if (push.supported && push.permission === "granted") {
        push.subscribe().catch(() => {});
      }
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      if (!contextId) throw new Error("Seleziona prima un documento.");

      // Il backend risponde 202 e prosegue in background (EdgeRuntime.waitUntil).
      // Lo stato della generazione è leggibile via realtime su `study_contexts`.
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, contextId, language: currentLanguage() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione");
      // Forza refetch del contesto: lo stato dovrebbe già essere 'generating'
      await refetchLessons();
    } catch (error) {
      console.error("Error generating lessons:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" });
    } finally {
      setLocalStarting(false);
    }
  };

  const generateLessonContent = async (lessonIndex: number) => {
    if (!currentUser) return null;
    // Blocca preventivamente quando il limite è raggiunto e il contesto NON è demo.
    if (generationBlocked) {
      toast({ title: "Limite raggiunto", description: FREE_LIMIT_MESSAGE, variant: "destructive" });
      return null;
    }
    const contextId = selectedContextId || activeContextId;
    const key = `${contextId ?? "null"}::${lessonIndex}`;
    // 🛑 LIMITE DI CONCORRENZA: una sola richiesta di generazione in volo nell'intera app.
    if (inflightLessonsRef.current.size > 0) {
      console.warn("[generateLessonContent] richiesta ignorata: un'altra è già in corso", { lessonIndex });
      return null;
    }
    inflightLessonsRef.current.add(key);
    setIsGeneratingLesson(true);
    try {
      const body: Record<string, unknown> = { userId: currentUser, action: "generateLesson", lessonIndex };
      if (contextId) body.contextId = contextId;
      // edgeFetch ha retry esponenziale su 429/502/503/504 e su "Failed to fetch"
      const data = await edgeFetch<{ lesson?: Lesson }>("generate-lessons", body);
      if (data.lesson) {
        setLessonsList(effectiveContextId, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lessons: prev.lessons.map((l) => (l.lesson_order === lessonIndex ? (data.lesson as Lesson) : l)),
          };
        });
      }
      // Aggiorna il contatore d'uso lato client (anche se demo per rinfrescare).
      invalidateUsage();
      return data.lesson ?? null;
    } catch (error) {
      console.error("Error generating lesson:", error);
      const msg = error instanceof Error ? error.message : "Errore nella generazione";
      if (msg === FREE_LIMIT_MESSAGE) {
        // Forza il refresh: il limite è stato applicato server-side
        invalidateUsage();
      }
      // Il network-blip transient è già stato ritentato da edgeFetch; se siamo qui è un vero errore
      toast({ title: "Errore", description: msg, variant: "destructive" });
      return null;
    } finally {
      inflightLessonsRef.current.delete(key);
      setIsGeneratingLesson(false);
    }
  };

  const handleNext = async () => {
    if (currentLessonIndex < lessons.length - 1) {
      const newIndex = currentLessonIndex + 1;
      const nextLesson = lessons[newIndex];
      if (!nextLesson) return;
      if (!nextLesson.is_generated) await generateLessonContent(newIndex);
      setCurrentLessonIndex(newIndex);
      // Avanzamento reale: persiste il nuovo massimo raggiunto.
      if (newIndex > cachedCurrentIndex) updateProgress.mutate(newIndex);
    } else { handleStartFinalTest(); }
  };

  const handleStartFinalTest = async () => {
    if (!currentUser) return;
    setIsLoadingFinalTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "generateFinalTest", ...(contextId ? { contextId } : {}), language: currentLanguage() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore generazione test");
      setFinalTestExercises(data.exercises || []);
      setShowFinalTest(true);
    } catch (error) { console.error("Error generating final test:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione del test", variant: "destructive" });
    } finally { setIsLoadingFinalTest(false); }
  };

  const handleSelectLesson = async (index: number) => {
    const selectedLesson = lessons[index];
    if (!selectedLesson) return;
    if (!selectedLesson.is_generated) await generateLessonContent(index);
    setCurrentLessonIndex(index); setShowList(false);
    // Aggiorna i progressi solo in avanti: tornare indietro non riduce il completamento.
    if (index > cachedCurrentIndex) updateProgress.mutate(index);
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  if (isGenerating || (postCompleteSettling && lessons.length === 0)) {
    return (
      <GenerationProgress
        isGenerating={isGenerating}
        currentStep={generationStep}
        totalLessons={generationTotalLessons}
        generatedCount={generationLessonCount}
        fileName={contextFileName || undefined}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-4">
        <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center animate-pulse-soft shadow-level-3">
          <Loader2 className="w-9 h-9 text-primary-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground font-display font-medium animate-fade-up">Caricamento lezioni...</p>
        <div className="w-32 h-1.5 m3-progress-track overflow-hidden">
          <div className="h-full m3-progress-indicator w-2/3 animate-pulse-soft" />
        </div>
      </div>
    );
  }

  if (lessons.length === 0) {
    const isPdfProcessing = contextStatus === "pending" || contextStatus === "processing";
    const isPdfFailed = contextStatus === "failed";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center animate-fade-up">
        <div className={`w-20 h-20 rounded-xl flex items-center justify-center shadow-level-3 ${
          isPdfProcessing ? "bg-primary animate-pulse-soft" : 
          isPdfFailed ? "bg-error-container" : "bg-tertiary-container"
        }`}>
          {isPdfProcessing ? (
            <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
          ) : (
            <RefreshCw className={`w-10 h-10 ${isPdfFailed ? "text-destructive" : "text-tertiary"}`} />
          )}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold mb-2">
            {isPdfProcessing ? "Elaborazione PDF in corso..." : 
             isPdfFailed ? "Errore nell'elaborazione" :
             "Nessuna lezione disponibile"}
          </h3>
          <p className="text-muted-foreground max-w-xs body-medium">
            {isPdfProcessing ? "Attendi qualche secondo mentre analizziamo il tuo documento." :
             isPdfFailed ? contextErrorMessage :
             "L'AI analizzerà i tuoi materiali e creerà un percorso di mini-lezioni personalizzato."}
          </p>
          {contextFileName && (
            <p className="text-sm text-primary font-medium mt-2 bg-primary-container inline-block px-3 py-1 rounded-full animate-bounce-in">{contextFileName}</p>
          )}
        </div>
        
        {isPdfProcessing ? (
          <Button onClick={refetchLessons} variant="outline" className="h-12 px-6">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna stato
          </Button>
        ) : (
          <LiquidButton onClick={handleGenerateLessons} disabled={isGenerating || generationBlocked} className="h-12 px-6 bg-primary text-primary-foreground">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</>
            ) : (
              <><Network className="w-4 h-4 mr-2" />Genera percorso</>
            )}
          </LiquidButton>
        )}
        {generationBlocked && !isPdfProcessing && (
          <p className="text-sm text-destructive max-w-sm bg-error-container/40 px-4 py-3 rounded-2xl border border-destructive/20">
            {FREE_LIMIT_MESSAGE}
          </p>
        )}
      </div>
    );
  }

  const currentLesson = activeLessonIndex !== null ? lessons[activeLessonIndex] : null;
  const allGenerated = lessons.length > 0 && lessons.every(l => l.is_generated);

  const handleSelectCourse = (contextId: string) => {
    setActiveContextId(contextId);
    setActiveLessonIndex(null);
    setCurrentLessonIndex(0);
  };

  return (
    <>
      <CourseSelector
        courses={allContexts}
        activeContextId={activeContextId}
        onSelectCourse={handleSelectCourse}
        isRegenerating={isGenerating || generationBlocked}
        onRegenerateCourse={async () => { await handleGenerateLessons(); }}
        onOpenMaterials={() => onUploadClick()}
        onDeleteCourse={async (contextId) => {
          try {
            await deleteContextMutation.mutateAsync(contextId);
            toast({ title: "Corso eliminato" });
            if (activeContextId === contextId) {
              setActiveContextId(null);
              onClearContext?.();
            }
          } catch (err) {
            toast({ title: "Errore", description: err instanceof Error ? err.message : "Impossibile eliminare", variant: "destructive" });
          }
        }}
        onRenameCourse={async (contextId, newName) => {
          const ctx = allContexts.find((c) => c.id === contextId);
          if (!ctx) return;
          const original = ctx.file_name || "";
          const prefix = original.startsWith("🌐") ? "🌐 " : "";
          const suffix = /\.pdf$/i.test(original) ? ".pdf" : "";
          const finalName = `${prefix}${newName}${suffix}`;
          try {
            const { error } = await supabase
              .from("study_contexts")
              .update({ file_name: finalName })
              .eq("id", contextId);
            if (error) throw error;
            invalidateContexts();
            toast({ title: "Corso rinominato" });
          } catch (err) {
            console.error("Error renaming course:", err);
            toast({ title: "Errore", description: "Impossibile rinominare il corso", variant: "destructive" });
          }
        }}
      />
      {generationBlocked && (
        <div className="mx-4 mt-3 mb-1 px-4 py-3 rounded-2xl bg-error-container/50 border border-destructive/20 text-destructive text-sm font-medium animate-fade-in">
          {FREE_LIMIT_MESSAGE}
        </div>
      )}
      <LessonsList
        lessons={lessons}
        currentIndex={currentLessonIndex}
        contextFileName={contextFileName}
        onSelectLesson={async (index) => {
          const lesson = lessons[index];
          if (!lesson) return;
          if (!lesson.is_generated) await generateLessonContent(index);
          setActiveLessonIndex(index);
          if (index > cachedCurrentIndex) updateProgress.mutate(index);
        }}
        onBack={() => {}}
        isGenerating={isGeneratingLesson}
        showBackButton={false}
        onRegenerate={handleGenerateLessons}
        isRegenerating={isGenerating || generationBlocked}
        showFinalTest={allGenerated}
        onStartFinalTest={handleStartFinalTest}
        isLoadingFinalTest={isLoadingFinalTest}
        onRegenerateLesson={async (index) => {
          const lesson = lessons[index];
          if (!lesson) return;
          // Mark as not generated locally so the edge function generates from scratch.
          setLessonsList(effectiveContextId, (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              lessons: prev.lessons.map((l) =>
                l.id === lesson.id ? { ...l, is_generated: false } : l,
              ),
            };
          });
          try {
            await supabase
              .from("mini_lessons")
              .update({ is_generated: false, explanation: "", concept: "", example: null, exercises: [] })
              .eq("id", lesson.id);
          } catch (err) {
            console.error("Error resetting lesson for regenerate:", err);
          }
          const fresh = await generateLessonContent(index);
          if (fresh) {
            toast({ title: "Lezione rigenerata", description: "I contenuti sono stati aggiornati." });
          }
        }}
        onDeleteLesson={async (lessonId) => {
          const lessonOrder = lessons.find((l) => l.id === lessonId)?.lesson_order;
          try {
            const { error } = await supabase.from("mini_lessons").delete().eq("id", lessonId);
            if (error) throw error;
            setLessonsList(effectiveContextId, (prev) => {
              if (!prev) return prev;
              const remaining = prev.lessons.filter((l) => l.id !== lessonId);
              return { ...prev, lessons: remaining };
            });
            toast({ title: "Lezione eliminata" });
            if (lessonOrder !== undefined && currentLessonIndex >= lessons.length - 1) {
              setCurrentLessonIndex(Math.max(0, lessons.length - 2));
            }
            await refetchLessons();
          } catch (err) {
            console.error("Error deleting lesson:", err);
            toast({ title: "Errore", description: "Impossibile eliminare la lezione", variant: "destructive" });
          }
        }}
        onRenameLesson={async (lessonId, newTitle) => {
          try {
            const { error } = await supabase
              .from("mini_lessons")
              .update({ title: newTitle })
              .eq("id", lessonId);
            if (error) throw error;
            setLessonsList(effectiveContextId, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                lessons: prev.lessons.map((l) => (l.id === lessonId ? { ...l, title: newTitle } : l)),
              };
            });
            toast({ title: "Titolo aggiornato" });
          } catch (err) {
            console.error("Error renaming lesson:", err);
            toast({ title: "Errore", description: "Impossibile rinominare la lezione", variant: "destructive" });
          }
        }}
      />

      {activeLessonIndex !== null && currentLesson && currentLesson.is_generated && !isGeneratingLesson && (
        <FullscreenLesson
          lesson={{ ...currentLesson, duration: 5 }}
          lessonNumber={activeLessonIndex + 1}
          totalLessons={lessons.length}
          onClose={() => setActiveLessonIndex(null)}
          onComplete={() => {
            const nextIndex = activeLessonIndex < lessons.length - 1 ? activeLessonIndex + 1 : activeLessonIndex;
            setCurrentLessonIndex(nextIndex);
            setActiveLessonIndex(null);
            if (nextIndex > cachedCurrentIndex) updateProgress.mutate(nextIndex);
          }}
          isLastLesson={activeLessonIndex === lessons.length - 1}
          nextLessonId={
            activeLessonIndex < lessons.length - 1
              ? lessons[activeLessonIndex + 1]?.id ?? null
              : null
          }
        />
      )}

      {showFinalTest && finalTestExercises.length > 0 && (
        <FinalTest
          exercises={finalTestExercises}
          onClose={() => setShowFinalTest(false)}
          onComplete={() => { setShowFinalTest(false);
            toast({ title: "Complimenti! 🎉", description: "Hai completato il percorso e il test finale!" }); }}
        />
      )}
    </>
  );
}
