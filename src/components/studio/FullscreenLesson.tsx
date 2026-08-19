import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Lightbulb, BookOpen, Dumbbell, CheckCircle2, Loader2, Sparkles, Send, Bot, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { useLessonQuery, type LessonMeta } from "@/hooks/useLessons";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PdfCrop } from "./PdfCrop";
import { useLessonFigures, prefetchLessonFigures, type LessonFigure } from "@/hooks/useLessonFigures";
import { LessonFigureGallery } from "./LessonFigureGallery";
import { useFocus } from "@/contexts/FocusContext";
import { FocusPill } from "@/components/focus/FocusPill";

/**
 * P21c ERGA OPAL: la sala-lezione si è fatta sobria.
 * Via il tasto di vetro, via XP e coriandoli, via il fondo a puntini:
 * restano i contenuti, la barra a segmenti e i box-pastello nel testo
 * (DECISIONE DEL CAPO: i pastelli restano — ma ora esistono anche in
 * versione notturna, così sul nero non accecano).
 * La LOGICA (step, quiz, figure, prefetch, assistente) è intatta.
 */

// P24 × MONOCROMO — i box d'evidenziazione usano l'ACCENTO MATERIA
// (--subject-accent): tinta chiara di sfondo + bordo al 30%.
// Gli emoji del contenuto restano il marcatore semantico.
function CalloutBlockquote({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "subject-callout my-3 px-4 py-3 rounded-2xl border body-medium leading-relaxed [&>p]:m-0 [&_strong]:font-semibold"
      )}
    >
      {children}
    </div>
  );
}

interface ExplanationPart {
  part_title: string;
  content: string;
  image_description?: string;
  image_url?: string;
}

interface FullscreenLessonProps {
  lesson: {
    id: string;
    title: string;
    concept: string;
    explanation: string;
    example?: string;
    exercises?: Exercise[];
    duration: number;
  };
  lessonNumber: number;
  totalLessons: number;
  onClose: () => void;
  onComplete: () => void;
  isLastLesson: boolean;
  nextLessonId?: string | null;
}

type StepType = "concept" | "explanation_part" | "example" | "exercise" | "summary";

interface Step {
  type: StepType;
  exerciseIndex?: number;
  explanationPartIndex?: number;
}

function parseExplanationParts(explanation: string): ExplanationPart[] {
  try {
    const parsed = JSON.parse(explanation);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].part_title) {
      return parsed;
    }
  } catch { /* not JSON */ }

  const lines = explanation.split(/\n/).filter(l => l.trim());
  if (lines.length <= 1) {
    return [{ part_title: "Spiegazione", content: explanation }];
  }

  const parts: ExplanationPart[] = [];
  let currentContent = "";
  let partIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentContent) {
        parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
        partIndex++;
      }
      currentContent = trimmed.replace(/^[•\-*]\s*/, "");
    } else {
      currentContent += (currentContent ? "\n" : "") + trimmed;
    }
  }
  if (currentContent) {
    parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
  }

  return parts.length > 0 ? parts : [{ part_title: "Spiegazione", content: explanation }];
}

function buildSteps(lesson: FullscreenLessonProps["lesson"], explanationParts: ExplanationPart[]): Step[] {
  const steps: Step[] = [{ type: "concept" }];
  explanationParts.forEach((_, i) => {
    steps.push({ type: "explanation_part", explanationPartIndex: i });
  });
  if (lesson.example) steps.push({ type: "example" });
  const exercises = lesson.exercises || [];
  exercises.forEach((_, i) => {
    steps.push({ type: "exercise", exerciseIndex: i });
  });
  if (exercises.length > 0) steps.push({ type: "summary" });
  return steps;
}

export function FullscreenLesson({
  lesson, lessonNumber, totalLessons, onClose, onComplete, isLastLesson, nextLessonId,
}: FullscreenLessonProps) {
  const { isActive: focusActive } = useFocus();
  const explanationParts = useMemo(() => parseExplanationParts(lesson.explanation), [lesson.explanation]);
  const { figures, loading: figuresLoading } = useLessonFigures(lesson.id);

  // Pre-fetch the next lesson's figures so they're already cached
  // by the time the user moves on.
  useEffect(() => {
    if (nextLessonId) prefetchLessonFigures(nextLessonId);
  }, [nextLessonId]);

  const steps = useMemo(() => buildSteps(lesson, explanationParts), [lesson, explanationParts]);

  // Compute which figure indices are referenced in the lesson text, so we can
  // surface unreferenced (“orphan”) figures only in the summary as a fallback.
  const referencedFigureIndices = useMemo(() => {
    const set = new Set<number>();
    const re = /\[FIG:(\d+)\]/g;
    for (const part of explanationParts) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(part.content || "")) !== null) {
        set.add(parseInt(m[1], 10));
      }
    }
    return set;
  }, [explanationParts]);

  const orphanFigures = useMemo(
    () => figures.filter((_, i) => !referencedFigureIndices.has(i)),
    [figures, referencedFigureIndices]
  );

  const [currentStep, setCurrentStep] = useState(0);
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const [currentExerciseAnswered, setCurrentExerciseAnswered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const exercises = useMemo(() => lesson.exercises || [], [lesson.exercises]);

  // Testo della slide attualmente visibile — passato all'assistente AI.
  const currentSlideText = useMemo(() => {
    switch (step.type) {
      case "concept":
        return `Concetto chiave:\n${lesson.concept}`;
      case "explanation_part": {
        const p = explanationParts[step.explanationPartIndex ?? 0];
        return p ? `${p.part_title}\n\n${p.content}` : "";
      }
      case "example":
        return `Esempio pratico:\n${lesson.example ?? ""}`;
      case "exercise": {
        const ex = exercises[step.exerciseIndex ?? 0] as (Exercise & { prompt?: string }) | undefined;
        return ex ? `Esercizio corrente:\n${ex.question ?? ex.prompt ?? JSON.stringify(ex)}` : "";
      }
      default:
        return `Riepilogo lezione: ${lesson.title}`;
    }
  }, [step, lesson, explanationParts, exercises]);

  const handleContinue = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (currentStep < steps.length - 1) {
      setTimeout(() => {
        setCurrentStep(s => s + 1);
        setCurrentExerciseAnswered(false);
        setIsAnimating(false);
      }, 250);
    } else {
      onComplete();
    }
  }, [currentStep, steps, onComplete, isAnimating]);

  const handleBack = useCallback(() => {
    if (isAnimating || currentStep === 0) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(s => Math.max(0, s - 1));
      setCurrentExerciseAnswered(false);
      setIsAnimating(false);
    }, 250);
  }, [currentStep, isAnimating]);

  const handleExerciseComplete = useCallback(
    (correct: boolean) => {
      if (step.exerciseIndex !== undefined) {
        setExerciseResults(prev => ({ ...prev, [step.exerciseIndex!]: correct }));
        setCurrentExerciseAnswered(true);
      }
    },
    [step]
  );

  const correctCount = Object.values(exerciseResults).filter(Boolean).length;
  const canContinue = step.type !== "exercise" || currentExerciseAnswered;

  // Segment the progress bar
  const segments = steps.length;

  return (
    // P24 — il foglio che sale: la lezione entra dal basso arrotondata
    // e si apre a schermo pieno (animate-lesson-sheet-in)
    <div ref={rootRef} className="no-halo fixed inset-0 z-50 bg-background flex flex-col animate-lesson-sheet-in">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-2 mb-2">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleBack}
              className="rounded-full -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Torna indietro"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-full -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Chiudi lezione"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
          {currentStep > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-full text-muted-foreground/70 hover:text-foreground transition-colors"
              aria-label="Chiudi lezione"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {/* Barra a segmenti: sottile, firma sul tratto fatto */}
          <div className="flex-1 flex gap-1 h-1.5">
            {Array.from({ length: segments }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-500 ease-m3-emphasized",
                  i <= currentStep ? "bg-primary" : "bg-surface-container-highest"
                )}
              />
            ))}
          </div>

          {/* Contatore sobrio (o la pillola del focus, se è attiva) */}
          {focusActive ? (
            <FocusPill variant="warning" />
          ) : (
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">
              {currentStep + 1}/{steps.length}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Lezione {lessonNumber} di {totalLessons} · <span className="text-foreground font-semibold">{lesson.title}</span>
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col" ref={contentRef}>
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          <div key={currentStep} className={cn("animate-lesson-in", isAnimating && "animate-lesson-out")}>
            {step.type === "concept" && <ConceptStep concept={lesson.concept} />}
            {step.type === "explanation_part" && step.explanationPartIndex !== undefined && (
              <ExplanationPartStep
                part={explanationParts[step.explanationPartIndex]}
                partNumber={step.explanationPartIndex + 1}
                totalParts={explanationParts.length}
                figures={figures}
                figuresLoading={figuresLoading}
              />
            )}
            {step.type === "example" && lesson.example && <ExampleStep example={lesson.example} />}
            {step.type === "exercise" && step.exerciseIndex !== undefined && exercises[step.exerciseIndex] && (
              <ExerciseStep
                exercise={exercises[step.exerciseIndex]}
                exerciseNumber={step.exerciseIndex + 1}
                totalExercises={exercises.length}
                onComplete={handleExerciseComplete}
                isCompleted={currentExerciseAnswered}
              />
            )}
            {step.type === "summary" && (
              <SummaryStep
                correctCount={correctCount}
                totalExercises={exercises.length}
                isLastLesson={isLastLesson}
                orphanFigures={orphanFigures}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="flex-shrink-0 p-4 pb-8 safe-area-bottom">
        <div className="flex items-center gap-3">
          {/* 🔽 P7 — "Spiegami meglio": tastino 3-linee, senza scritte.
              Apre la finestra dal basso (stessa di "evento+"). */}
          <SlideAIAssistant
            slideText={currentSlideText}
            lessonTitle={lesson.title}
            stepKey={currentStep}
          />
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex-1 h-12 text-base bg-black text-white hover:bg-neutral-800 active:scale-[0.97] dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            size="lg"
          >
            {currentStep === steps.length - 1
              ? isLastLesson ? "Completa percorso" : "Prossima lezione"
              : step.type === "exercise" && !currentExerciseAnswered
                ? "Rispondi per continuare"
                : "Continua"}
            {(canContinue || step.type !== "exercise") && <ChevronRight className="w-5 h-5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Step Components ── */

function ConceptStep({ concept }: { concept: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto">
        <Lightbulb className="w-6 h-6 text-foreground" strokeWidth={1.75} />
      </div>
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold mb-4">
          Concetto chiave
        </div>
        <div className="text-xl font-normal tracking-tight leading-[1.7] prose prose-sm max-w-none mx-auto px-2 prose-p:font-normal prose-table:rounded-2xl prose-table:overflow-hidden prose-th:bg-secondary prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-outline-variant/60">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{concept}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExplanationPartStep({ part, partNumber, totalParts, figures, figuresLoading }: { part: ExplanationPart; partNumber: number; totalParts: number; figures: LessonFigure[]; figuresLoading: boolean }) {
  const isExample = part.part_title.startsWith("📌") || part.part_title.startsWith("🔍");

  const segments = useMemo(() => {
    const out: Array<{ type: "text"; value: string } | { type: "fig"; figure: LessonFigure } | { type: "fig-pending"; index: number }> = [];
    const text = part.content || "";
    const re = /\[FIG:(\d+)\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
      const idx = parseInt(m[1], 10);
      const fig = figures[idx];
      if (fig) out.push({ type: "fig", figure: fig });
      else if (figuresLoading) out.push({ type: "fig-pending", index: idx });
      // Se il caricamento è finito e la figura non c'è, il segnaposto sparisce
      // in silenzio: mai più riquadri "Figura non disponibile" dentro la slide.
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ type: "text", value: text.slice(last) });
    return out.length > 0 ? out : [{ type: "text" as const, value: text }];
  }, [part.content, figures, figuresLoading]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
          isExample ? "bg-accent" : "bg-secondary"
        )}>
          {isExample
            ? <Lightbulb className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} />
            : <BookOpen className="w-4 h-4 text-foreground" strokeWidth={1.75} />}
        </div>
        <div className="flex-1">
          <span className="label-large text-foreground">{part.part_title}</span>
          <div className="flex items-center gap-1 mt-1.5">
            {Array.from({ length: totalParts }).map((_, i) => (
              <div key={i} className={cn("h-1 rounded-full flex-1 transition-all duration-300",
                i < partNumber ? "bg-primary" : "bg-surface-container-highest")} />
            ))}
          </div>
        </div>
      </div>
      <div className={cn(
        "p-6 sm:p-7 rounded-[18px] border space-y-4 backdrop-blur-md",
        isExample
          ? "bg-tertiary-container/60 border-tertiary/30 border-l-4 border-l-tertiary"
          : "bg-white/70 dark:bg-neutral-900/70 border-neutral-200/50 dark:border-neutral-800/50 shadow-sm"
      )}>
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return seg.value.trim() ? (
              <div key={i} className="text-[15px] font-normal text-foreground/80 leading-[1.7] prose prose-sm max-w-none prose-p:font-normal prose-p:text-foreground/80 prose-p:leading-[1.7] prose-p:my-3 prose-strong:font-semibold prose-strong:text-foreground prose-em:text-foreground/90 prose-table:my-4 prose-table:rounded-2xl prose-table:overflow-hidden prose-table:border prose-table:border-outline-variant/60 prose-th:bg-secondary/70 prose-th:text-foreground prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-outline-variant/60 prose-hr:my-4 prose-hr:border-outline-variant/60">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ blockquote: CalloutBlockquote }}>{seg.value}</ReactMarkdown>
              </div>
            ) : null;
          }
          if (seg.type === "fig") {
            return <PdfCrop key={i} url={seg.figure.url} bbox={seg.figure.bbox} description={seg.figure.description} />;
          }
          // fig-pending: il segnaposto esiste solo mentre la figura è in lavorazione
          return (
            <div key={i} className="rounded-2xl bg-surface-container-highest/60 border-2 border-dashed border-outline-variant/60 p-6 flex flex-col items-center justify-center gap-2 min-h-[140px]">
              <Loader2 className="w-6 h-6 text-foreground animate-spin" />
              <p className="body-small text-muted-foreground">Caricamento figura…</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExampleStep({ example }: { example: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <span className="label-large text-foreground">Esempio pratico</span>
      </div>
      <div className="p-6 sm:p-7 rounded-[18px] bg-tertiary-container/60 border border-tertiary/30 border-l-4 border-l-tertiary">
        <div className="text-[15px] font-normal text-foreground/80 leading-[1.7] prose prose-sm max-w-none prose-p:font-normal prose-p:leading-[1.7] prose-strong:font-semibold prose-table:rounded-2xl prose-table:overflow-hidden prose-th:bg-tertiary-container/60 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-outline-variant/60">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{example}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExerciseStep({
  exercise, exerciseNumber, totalExercises, onComplete, isCompleted,
}: {
  exercise: Exercise; exerciseNumber: number; totalExercises: number;
  onComplete: (correct: boolean) => void; isCompleted: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <span className="label-large text-foreground">Esercizio {exerciseNumber}</span>
            <p className="body-small text-muted-foreground">{exerciseNumber} di {totalExercises}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalExercises }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i < exerciseNumber - 1 ? "bg-tertiary" : i === exerciseNumber - 1 ? "bg-primary scale-125" : "bg-surface-container-highest"
              )}
            />
          ))}
        </div>
      </div>
      <div className="p-5 rounded-[18px] backdrop-blur-md bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm">
        <ExerciseRenderer exercise={exercise} onComplete={onComplete} isCompleted={isCompleted} />
      </div>
    </div>
  );
}

function SummaryStep({ correctCount, totalExercises, isLastLesson, orphanFigures }: { correctCount: number; totalExercises: number; isLastLesson: boolean; orphanFigures: LessonFigure[] }) {
  const percentage = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full mx-auto bg-secondary flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-tertiary" strokeWidth={1.75} />
      </div>

      <div>
        <p className="font-display font-bold text-2xl mb-2 text-foreground">
          Lezione completata
        </p>
        <p className="text-sm text-muted-foreground">
          {correctCount}/{totalExercises} esercizi corretti · {percentage}%
        </p>
      </div>

      <p className="body-small text-muted-foreground">
        {isLastLesson ? "Premi per completare il percorso." : "Premi per passare alla prossima lezione."}
      </p>

      {orphanFigures.length > 0 && (
        <div className="mt-6 pt-6 border-t border-outline-variant/40 text-left">
          <LessonFigureGallery
            figures={orphanFigures}
            title="Altre immagini dal materiale"
            subtitle="Figure estratte ma non citate nel testo"
            compact
          />
        </div>
      )}
    </div>
  );
}

/* ── Assistente AI fluttuante (solo dentro la slide) ── */

interface SlideAIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function SlideAIAssistant({
  slideText,
  lessonTitle,
  stepKey,
}: {
  slideText: string;
  lessonTitle: string;
  stepKey: number;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SlideAIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bootstrappedFor = useRef<number | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  // Alla chiusura della finestra: azzera, così alla prossima apertura parte
  // una spiegazione fresca della slide su cui sei in quel momento.
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      bootstrappedFor.current = null;
      setMessages([]);
      setInput("");
    }
  };

  const callAI = useCallback(
    async (history: SlideAIMessage[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const apiMessages = history.map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lesson-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            lessonContent: slideText,
            lessonTitle,
            language: currentLanguage(),
          }),
        }
      );
      if (!response.ok) throw new Error(`Errore ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");
      const decoder = new TextDecoder();
      const assistantId = String(Date.now() + Math.random());
      let assistantText = "";
      let buf = "";

      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m))
              );
            }
          } catch { /* skip */ }
        }
      }
    },
    [slideText, lessonTitle]
  );

  // Bootstrap: quando la chat viene aperta (o la slide cambia mentre è aperta),
  // genera automaticamente una spiegazione approfondita della slide corrente.
  useEffect(() => {
    if (!open) return;
    if (bootstrappedFor.current === stepKey) return;
    bootstrappedFor.current = stepKey;

    setMessages([]);
    setIsLoading(true);
    const seed: SlideAIMessage = {
      id: "seed-" + stepKey,
      role: "user",
      content:
        "Fornisci una spiegazione approfondita, chiara e con esempi del contenuto della slide qui sopra. Struttura la risposta in paragrafi brevi.",
    };
    callAI([seed])
      .catch(() =>
        setMessages([
          {
            id: "err",
            role: "assistant",
            content: "Non sono riuscito a generare la spiegazione. Riprova tra poco.",
          },
        ])
      )
      .finally(() => setIsLoading(false));
  }, [open, stepKey, callAI]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    const userMsg: SlideAIMessage = { id: String(Date.now()), role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsLoading(true);
    try {
      await callAI(next);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now() + 1), role: "assistant", content: "Errore nella risposta. Riprova." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, callAI]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "h-12 w-12 rounded-[14px] flex items-center justify-center flex-shrink-0",
            "bg-card text-foreground border border-outline-variant/60",
            "hover:bg-surface-container-high transition-colors"
          )}
          aria-label="Spiegami meglio questa slide"
          title="Spiegami meglio"
        >
          {/* Tre linee orizzontali stile Google Docs, quella di mezzo più corta — nessuna scritta (P7) */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </SheetTrigger>
      {/* 🎨 P9a — sfondo avorio e angoli ora li mette il foglio stesso */}
      <SheetContent
        side="bottom"
        className="pb-safe max-h-[92vh] h-[85vh] p-0 flex flex-col gap-0"
      >
        {/* Header */}
        <SheetHeader className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0 space-y-0 text-left">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-foreground" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="label-medium font-semibold text-foreground truncate">Tutor AI</SheetTitle>
            <p className="label-small text-muted-foreground truncate">{lessonTitle}</p>
          </div>
        </SheetHeader>

        {/* Messaggi */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2 animate-fade-up",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  msg.role === "assistant" ? "bg-secondary" : "bg-secondary/60"
                )}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-3.5 h-3.5 text-foreground" strokeWidth={1.75} />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-foreground/70" strokeWidth={1.75} />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[82%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-surface-container-high text-foreground rounded-bl-md prose prose-sm max-w-none prose-p:my-2"
                    : "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                )}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || "…"}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-foreground" strokeWidth={1.75} />
              </div>
              <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-3 py-2.5">
                <div className="flex gap-1">
                  {[0, 150, 300].map((d) => (
                    <div
                      key={d}
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 pt-2 pb-3 border-t border-border/40 flex-shrink-0 bg-background">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Chiedi qualcosa su questa slide…"
              rows={1}
              disabled={isLoading}
              className={cn(
                "flex-1 resize-none rounded-2xl px-3 py-2.5 text-sm",
                "bg-surface-container-high border border-outline-variant/60",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
                "placeholder:text-muted-foreground max-h-28 overflow-y-auto",
                "disabled:opacity-50"
              )}
              style={{ minHeight: "42px" }}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


// ⚡ P16 — Il TORNELLO della singola lezione.
// La struttura del percorso è già disegnata (metadati leggeri); qui carichiamo
// SOLO il contenuto della lezione che stai aprendo — caricamento mirato su di
// lei, mai su tutta la pagina. In cache 24h: riaprirla è gratis.
export function FullscreenLessonGate({
  meta,
  contextId,
  ...props
}: Omit<FullscreenLessonProps, "lesson"> & {
  meta: LessonMeta;
  contextId: string | null;
}) {
  const lessonQuery = useLessonQuery(contextId, meta.lesson_order);
  const full = lessonQuery.data;

  if (!full) {
    return (
      <div className="no-halo fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4 animate-fade-up">
        <div className="w-16 h-16 rounded-full bg-card shadow-level-1 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-foreground animate-spin" />
        </div>
        <p className="font-display font-bold text-lg text-foreground text-center px-8 max-w-sm">
          {meta.title}
        </p>
        <p className="text-sm text-muted-foreground">Apro la lezione…</p>
        <button
          onClick={props.onClose}
          className="text-sm text-muted-foreground underline underline-offset-2 mt-2"
        >
          chiudi
        </button>
      </div>
    );
  }

  return (
    <FullscreenLesson
      lesson={{
        id: full.id,
        title: full.title,
        concept: full.concept ?? "",
        explanation: full.explanation ?? "",
        example: full.example,
        exercises: full.exercises,
        duration: 5,
      }}
      {...props}
    />
  );
}
