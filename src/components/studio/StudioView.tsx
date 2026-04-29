import { useState, useEffect, useRef } from "react";
import { FullscreenLesson } from "./FullscreenLesson";
import { FinalTest } from "./FinalTest";
import { LessonsList } from "./LessonsList";
import { CourseSelector } from "./CourseSelector";
import { GenerationProgress } from "./GenerationProgress";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exercise } from "./exercises/ExerciseRenderer";
import { supabase } from "@/integrations/supabase/client";
import { edgeFetch } from "@/lib/edgeFetch";
import {
  useLessonsQuery,
  useStudyContextsQuery,
  useUpdateLessonProgress,
  useLessonsCacheControls,
  type Lesson,
} from "@/hooks/useLessons";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  selectedContextId?: string | null;
  onClearContext?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function StudioView({ hasFiles, onUploadClick, selectedContextId, onClearContext, onFullscreenChange }: StudioViewProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [generationStep, setGenerationStep] = useState<"analyzing" | "creating-index" | "generating-lessons" | "complete">("analyzing");
  const [generationLessonCount, setGenerationLessonCount] = useState(0);
  const [generationTotalLessons, setGenerationTotalLessons] = useState(0);
  const [showList, setShowList] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const [showFinalTest, setShowFinalTest] = useState(false);
  const [finalTestExercises, setFinalTestExercises] = useState<Exercise[]>([]);
  const [isLoadingFinalTest, setIsLoadingFinalTest] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

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

  const lessonsQuery = useLessonsQuery(effectiveContextId);
  const lessons: Lesson[] = lessonsQuery.data?.lessons ?? [];
  const cachedCurrentIndex = lessonsQuery.data?.currentIndex ?? 0;
  const updateProgress = useUpdateLessonProgress(effectiveContextId);
  const { invalidateList, invalidateContexts, setLessonsList } = useLessonsCacheControls();

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

  const handleGenerateLessons = async () => {
    if (!currentUser) return;
    if (contextStatus === "pending" || contextStatus === "processing") {
      toast({ title: "PDF in elaborazione", description: "Attendi il completamento dell'analisi prima di generare il percorso." });
      await refetchLessons();
      return;
    }
    if (contextStatus === "failed") {
      toast({ title: "PDF non elaborabile", description: contextErrorMessage, variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGenerationStep("analyzing");
    setGenerationLessonCount(0);
    setGenerationTotalLessons(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;

      // Step 1: analyzing
      await new Promise(r => setTimeout(r, 800));
      setGenerationStep("creating-index");

      // Step 2: creating index + generating
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, ...(contextId ? { contextId } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione");

      setGenerationStep("generating-lessons");
      setGenerationTotalLessons(data.lessonsCount || 0);

      // Simulate incremental progress briefly
      for (let i = 0; i <= (data.lessonsCount || 0); i++) {
        setGenerationLessonCount(i);
        await new Promise(r => setTimeout(r, 150));
      }

      setGenerationStep("complete");
      toast({ title: "Percorso creato!", description: `Creato un percorso con ${data.lessonsCount} mini-lezioni.` });
      await new Promise(r => setTimeout(r, 1000));
      await refetchLessons();
    } catch (error) { console.error("Error generating lessons:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" });
    } finally { setIsGenerating(false); setGenerationStep("analyzing"); }
  };

  const generateLessonContent = async (lessonIndex: number) => {
    if (!currentUser) return null;
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
      return data.lesson ?? null;
    } catch (error) {
      console.error("Error generating lesson:", error);
      const msg = error instanceof Error ? error.message : "Errore nella generazione";
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
          body: JSON.stringify({ userId: currentUser, action: "generateFinalTest", ...(contextId ? { contextId } : {}) }) });
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

  if (isGenerating) {
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
          <Button onClick={handleGenerateLessons} disabled={isGenerating} className="h-12 px-6">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Genera percorso</>
            )}
          </Button>
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
      />
      <LessonsList
        lessons={lessons}
        currentIndex={currentLessonIndex}
        contextFileName={contextFileName}
        onSelectLesson={async (index) => {
          const lesson = lessons[index];
          if (!lesson) return;
          if (!lesson.is_generated) await generateLessonContent(index);
          setActiveLessonIndex(index);
          updateProgress.mutate(index);
        }}
        onBack={() => {}}
        isGenerating={isGeneratingLesson}
        showBackButton={false}
        onRegenerate={handleGenerateLessons}
        isRegenerating={isGenerating}
        showFinalTest={allGenerated}
        onStartFinalTest={handleStartFinalTest}
        isLoadingFinalTest={isLoadingFinalTest}
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
            updateProgress.mutate(nextIndex);
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
