import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, Lightbulb, BookOpen, Dumbbell, CheckCircle2, Loader2, Sparkles, Send, Bot, User as UserIcon, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { useLessonQuery, type LessonMeta } from "@/hooks/useLessons";
import { cn } from "@/lib/utils";
import { LessonMarkdown } from "./LessonMarkdown";
import { PdfCrop } from "./PdfCrop";
import { useLessonFigures, prefetchLessonFigures, type LessonFigure } from "@/hooks/useLessonFigures";
import { LessonFigureGallery } from "./LessonFigureGallery";
import { useFocus } from "@/contexts/FocusContext";
import { FocusPill } from "@/components/focus/FocusPill";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { prepareLessonExercises } from "@/lib/lessonExercises";
import { readLessonResume, saveLessonResume, clearLessonResume } from "@/lib/lessonResume";

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
  };
  lessonNumber: number;
  totalLessons: number;
  onClose: () => void;
  /** 🅐 FONDAMENTA — al termine porta con sé l'esito degli esercizi, così la
   * schermata chiamante può registrare «lezione completata» nel database. */
  onComplete: (result: { correct: number; total: number }) => void;
  isLastLesson: boolean;
  nextLessonId?: string | null;
}

type StepType = "concept" | "explanation_part" | "example" | "exercise" | "summary";

interface Step {
  type: StepType;
  exerciseIndex?: number;
  explanationPartIndex?: number;
}

/** Titoli di riserva quando l'AI non ha fornito titoli di parte:
 * tradotti dalla chiamante (i18n), con valore neutro per usi diretti. */
const FALLBACK_LABELS = { explanation: "Spiegazione", part: (n: number) => `Parte ${n}` };

function parseExplanationParts(
  explanation: string,
  labels: { explanation: string; part: (n: number) => string } = FALLBACK_LABELS,
): ExplanationPart[] {
  try {
    const parsed = JSON.parse(explanation);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].part_title) {
      return parsed;
    }
  } catch { /* not JSON */ }

  const lines = explanation.split(/\n/).filter(l => l.trim());
  if (lines.length <= 1) {
    return [{ part_title: labels.explanation, content: explanation }];
  }

  const parts: ExplanationPart[] = [];
  let currentContent = "";
  let partIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentContent) {
        parts.push({ part_title: labels.part(partIndex + 1), content: currentContent.trim() });
        partIndex++;
      }
      currentContent = trimmed.replace(/^[•\-*]\s*/, "");
    } else {
      currentContent += (currentContent ? "\n" : "") + trimmed;
    }
  }
  if (currentContent) {
    parts.push({ part_title: labels.part(partIndex + 1), content: currentContent.trim() });
  }

  return parts.length > 0 ? parts : [{ part_title: labels.explanation, content: explanation }];
}

function buildSteps(explanationParts: ExplanationPart[], exercises: Exercise[], hasExample: boolean): Step[] {
  const steps: Step[] = [{ type: "concept" }];
  explanationParts.forEach((_, i) => {
    steps.push({ type: "explanation_part", explanationPartIndex: i });
  });
  if (hasExample) steps.push({ type: "example" });
  exercises.forEach((_, i) => {
    steps.push({ type: "exercise", exerciseIndex: i });
  });
  if (exercises.length > 0) steps.push({ type: "summary" });
  return steps;
}

/** Scroll in cima robusto (jsdom non implementa scrollTo: mai far esplodere nulla). */
function scrollToTop(el: HTMLElement | null) {
  if (!el) return;
  try {
    el.scrollTo?.({ top: 0 });
  } catch {
    el.scrollTop = 0;
  }
}

export function FullscreenLesson({
  lesson, lessonNumber, totalLessons, onClose, onComplete, isLastLesson, nextLessonId,
}: FullscreenLessonProps) {
  const { t } = useTranslation();
  const { isActive: focusActive } = useFocus();
  const explanationParts = useMemo(
    () =>
      parseExplanationParts(lesson.explanation, {
        explanation: t("lesson.explanationFallback"),
        part: (n) => t("lesson.partFallback", { number: n }),
      }),
    [lesson.explanation, t],
  );
  const { figures, loading: figuresLoading } = useLessonFigures(lesson.id);

  // Pre-fetch the next lesson's figures so they're already cached
  // by the time the user moves on.
  useEffect(() => {
    if (nextLessonId) prefetchLessonFigures(nextLessonId);
  }, [nextLessonId]);

  // P50 — Gli esercizi entrano in scena con le opzioni MESCOLATE. L'ordine è
  // stabile (dipende dall'impronta dell'esercizio, non dal momento): tornare
  // indietro o riaprire la lezione non fa ballare le risposte sotto il dito.
  const exercises = useMemo(
    () => prepareLessonExercises(lesson.exercises, lesson.id || "lezione"),
    [lesson.exercises, lesson.id],
  );

  const steps = useMemo(
    () => buildSteps(explanationParts, exercises, Boolean(lesson.example)),
    [explanationParts, exercises, lesson.example],
  );

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

  // 🌿 P50 — SI RIPARTE DA DOVE ERI (dentro la lezione, non solo tra le lezioni).
  // La memoria vive sul dispositivo, scade dopo 30 giorni e non tocca il database.
  const initialStep = useMemo(() => {
    const saved = readLessonResume(lesson.id)?.step ?? 0;
    return Math.min(Math.max(0, saved), Math.max(0, steps.length - 1));
  }, [lesson.id, steps.length]);

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [showResumeNotice, setShowResumeNotice] = useState(initialStep > 0);
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const [currentExerciseAnswered, setCurrentExerciseAnswered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<number | null>(null);

  // ♿ P50 — «Riduci movimento» vale anche per le pause del lettore: chi lo
  // attiva non deve aspettare un'animazione che non vede.
  const prefersReducedMotion = usePrefersReducedMotion();
  const stepDelayMs = prefersReducedMotion ? 0 : 250;

  const step = steps[currentStep];

  // Testo della slide attualmente visibile — passato all'assistente AI.
  const currentSlideText = useMemo(() => {
    switch (step.type) {
      case "concept":
        return `${t("lesson.keyConcept")}:\n${lesson.concept}`;
      case "explanation_part": {
        const p = explanationParts[step.explanationPartIndex ?? 0];
        return p ? `${p.part_title}\n\n${p.content}` : "";
      }
      case "example":
        return `${t("lesson.practicalExample")}:\n${lesson.example ?? ""}`;
      case "exercise": {
        const ex = exercises[step.exerciseIndex ?? 0] as (Exercise & { prompt?: string }) | undefined;
        return ex ? `${t("lesson.currentExercise")}\n${ex.question ?? ex.prompt ?? JSON.stringify(ex)}` : "";
      }
      default:
        return `${t("lesson.summaryOf")} ${lesson.title}`;
    }
  }, [step, lesson, explanationParts, exercises, t]);

  const gotoStep = useCallback((next: number) => {
    const target = Math.max(0, next);
    if (stepDelayMs === 0) {
      setCurrentStep(target);
      setCurrentExerciseAnswered(false);
      setIsAnimating(false);
      return;
    }
    setIsAnimating(true);
    stepTimerRef.current = window.setTimeout(() => {
      setCurrentStep(target);
      setCurrentExerciseAnswered(false);
      setIsAnimating(false);
      stepTimerRef.current = null;
    }, stepDelayMs);
  }, [stepDelayMs]);

  const handleContinue = useCallback(() => {
    if (isAnimating) return;
    if (currentStep < steps.length - 1) {
      setShowResumeNotice(false);
      gotoStep(currentStep + 1);
    } else {
      // Percorso finito: il segnalibro non serve più.
      clearLessonResume(lesson.id);
      // 🅐 FONDAMENTA — l'esito degli esercizi viaggia con il completamento.
      onComplete({
        correct: Object.values(exerciseResults).filter(Boolean).length,
        total: exercises.length,
      });
    }
  }, [currentStep, steps.length, onComplete, isAnimating, gotoStep, lesson.id, exerciseResults, exercises.length]);

  const handleBack = useCallback(() => {
    if (isAnimating || currentStep === 0) return;
    setShowResumeNotice(false);
    gotoStep(currentStep - 1);
  }, [currentStep, isAnimating, gotoStep]);

  const handleRestart = useCallback(() => {
    clearLessonResume(lesson.id);
    setShowResumeNotice(false);
    setExerciseResults({});
    setCurrentExerciseAnswered(false);
    setCurrentStep(0);
    scrollToTop(contentRef.current);
  }, [lesson.id]);

  // 💾 Segna il punto a ogni cambio slide (solo oltre la prima).
  useEffect(() => {
    if (currentStep > 0) saveLessonResume(lesson.id, currentStep);
  }, [lesson.id, currentStep]);

  // 🧹 Il timer della transizione non deve sopravvivere alla chiusura.
  useEffect(() => () => {
    if (stepTimerRef.current !== null) window.clearTimeout(stepTimerRef.current);
  }, []);

  // 📜 Ogni slide nuova parte dall'alto (prima ereditava lo scroll precedente).
  useEffect(() => {
    scrollToTop(contentRef.current);
  }, [currentStep]);

  // ♿ P50 — La lezione è una finestra a schermo pieno: ESC per uscire e fuoco
  // dentro (i lettori di schermo non restano sulla pagina sotto). Se è aperto
  // il pannello del tutor, l'ESC chiude QUEL pannello e non la lezione.
  const previouslyFocusedRef = useRef<Element | null>(null);
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    rootRef.current?.focus?.();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
      if (openDialog && openDialog !== rootRef.current) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      (previouslyFocusedRef.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

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
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${t("lesson.lessonOf", { number: lessonNumber, total: totalLessons })}: ${lesson.title}`}
      tabIndex={-1}
      className="no-halo fixed inset-0 z-50 bg-background flex flex-col animate-lesson-sheet-in focus:outline-none"
    >
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-2 mb-2">
          {currentStep > 0 ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleBack}
              className="rounded-full -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("lesson.back")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-full -ml-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t("lesson.close")}
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
              aria-label={t("lesson.close")}
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
                  "flex-1 rounded-sm transition-all duration-500 ease-m3-emphasized",
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
          {t("lesson.lessonOf", { number: lessonNumber, total: totalLessons })} · <span className="text-foreground font-semibold">{lesson.title}</span>
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col" ref={contentRef}>
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          {showResumeNotice && (
            <div
              role="status"
              className="mb-4 flex items-center gap-2 rounded-2xl border border-border/50 bg-card/80 px-3.5 py-2.5"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
              <p className="body-small text-muted-foreground flex-1">
                {t("lesson.resumeNotice", { number: currentStep + 1, total: steps.length })}
              </p>
              <button
                type="button"
                onClick={handleRestart}
                className="label-medium text-brand-deep underline underline-offset-2 shrink-0"
              >
                {t("lesson.restart")}
              </button>
            </div>
          )}
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
            className="flex-1 h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]"
            size="lg"
          >
            {currentStep === steps.length - 1
              ? isLastLesson ? t("lesson.completePath") : t("lesson.nextLesson")
              : step.type === "exercise" && !currentExerciseAnswered
                ? t("lesson.answerToContinue")
                : t("lesson.continue")}
            {(canContinue || step.type !== "exercise") && <ChevronRight className="w-5 h-5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Step Components ── */

function ConceptStep({ concept }: { concept: string }) {
  const { t } = useTranslation();
  return (
    <div className="text-center space-y-6">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto">
        <Lightbulb className="w-6 h-6 text-foreground" strokeWidth={1.75} />
      </div>
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-secondary text-muted-foreground text-xs font-semibold mb-4">
          {t("lesson.keyConcept")}
        </div>
        <div className="font-reading text-xl font-normal tracking-tight leading-[1.7] prose prose-sm max-w-none mx-auto px-2 prose-p:font-normal prose-table:rounded-2xl prose-table:overflow-hidden prose-th:bg-secondary prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-outline-variant/60">
          <LessonMarkdown>{concept}</LessonMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExplanationPartStep({ part, partNumber, totalParts, figures, figuresLoading }: { part: ExplanationPart; partNumber: number; totalParts: number; figures: LessonFigure[]; figuresLoading: boolean }) {
  const { t } = useTranslation();
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
              <div key={i} className={cn("h-1 rounded-sm flex-1 transition-all duration-300",
                i < partNumber ? "bg-primary" : "bg-surface-container-highest")} />
            ))}
          </div>
        </div>
      </div>
      <div className={cn(
        "p-6 sm:p-7 rounded-card border space-y-4",
        isExample
          ? "bg-tertiary-container border-border/50 shadow-level-1"
          : "bg-card border-border/50 shadow-level-1"
      )}>
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return seg.value.trim() ? (
              <div key={i} className="font-reading text-[0.9375rem] font-normal text-foreground/80 leading-[1.7] prose prose-sm max-w-none prose-p:font-normal prose-p:text-foreground/80 prose-p:leading-[1.7] prose-p:my-3 prose-strong:font-semibold prose-strong:text-foreground prose-em:text-foreground/90 prose-table:my-4 prose-table:rounded-2xl prose-table:overflow-hidden prose-table:border prose-table:border-outline-variant/60 prose-th:bg-secondary/70 prose-th:text-foreground prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-outline-variant/60 prose-hr:my-4 prose-hr:border-outline-variant/60">
                <LessonMarkdown components={{ blockquote: CalloutBlockquote }}>{seg.value}</LessonMarkdown>
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
              <p className="body-small text-muted-foreground">{t("lesson.loadingFigure")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExampleStep({ example }: { example: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <span className="label-large text-foreground">{t("lesson.practicalExample")}</span>
      </div>
      <div className="p-6 sm:p-7 rounded-card bg-tertiary-container border border-border/50 shadow-level-1">
        <div className="font-reading text-[0.9375rem] font-normal text-foreground/80 leading-[1.7] prose prose-sm max-w-none prose-p:font-normal prose-p:leading-[1.7] prose-strong:font-semibold prose-table:rounded-2xl prose-table:overflow-hidden prose-th:bg-tertiary-container/60 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-outline-variant/60">
          <LessonMarkdown>{example}</LessonMarkdown>
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
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <span className="label-large text-foreground">{t("lesson.exercise", { number: exerciseNumber })}</span>
            <p className="body-small text-muted-foreground">{t("lesson.exerciseOf", { number: exerciseNumber, total: totalExercises })}</p>
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
      <div className="p-5 rounded-card border border-border/50 bg-card shadow-level-1">
        <ExerciseRenderer exercise={exercise} onComplete={onComplete} isCompleted={isCompleted} />
      </div>
    </div>
  );
}

function SummaryStep({ correctCount, totalExercises, isLastLesson, orphanFigures }: { correctCount: number; totalExercises: number; isLastLesson: boolean; orphanFigures: LessonFigure[] }) {
  const { t } = useTranslation();
  const percentage = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-full mx-auto bg-secondary flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-tertiary" strokeWidth={1.75} />
      </div>

      <div>
        <p className="font-display font-bold text-2xl mb-2 text-foreground">
          {t("lesson.lessonCompleted")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("lesson.exercisesCorrect", { correct: correctCount, total: totalExercises, percent: percentage })}
        </p>
      </div>

      <p className="body-small text-muted-foreground">
        {isLastLesson ? t("lesson.pressToComplete") : t("lesson.pressToNext")}
      </p>

      {orphanFigures.length > 0 && (
        <div className="mt-6 pt-6 border-t border-outline-variant/40 text-left">
          <LessonFigureGallery
            figures={orphanFigures}
            title={t("lesson.otherImages")}
            subtitle={t("lesson.figuresNotCited")}
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
  const { t } = useTranslation();
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
      content: t("lesson.aiSeedPrompt"),
    };
    callAI([seed])
      .catch(() =>
        setMessages([
          {
            id: "err",
            role: "assistant",
            content: t("lesson.aiError"),
          },
        ])
      )
      .finally(() => setIsLoading(false));
  }, [open, stepKey, callAI, t]);

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
        { id: String(Date.now() + 1), role: "assistant", content: t("lesson.aiReplyError") },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, callAI, t]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "h-12 w-12 rounded-button flex items-center justify-center flex-shrink-0",
            "bg-card text-foreground border border-outline-variant/60",
            "hover:bg-surface-container-high transition-colors"
          )}
          aria-label={t("lesson.explainBetterSlide")}
          title={t("lesson.explainBetter")}
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
            <SheetTitle className="label-medium font-semibold text-foreground truncate">{t("lesson.tutor")}</SheetTitle>
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
                  "max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.role === "assistant"
                    ? "bg-surface-container-high text-foreground rounded-bl-md prose prose-sm max-w-none prose-p:my-2"
                    : "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                )}
              >
                {msg.role === "assistant" ? (
                  <LessonMarkdown>{msg.content || "…"}</LessonMarkdown>
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
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse"
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
              placeholder={t("lesson.askPlaceholder")}
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
  const { t } = useTranslation();
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
        <p className="text-sm text-muted-foreground">{t("lesson.openingLesson")}</p>
        <button
          onClick={props.onClose}
          className="text-sm text-muted-foreground underline underline-offset-2 mt-2"
        >
          {t("lesson.closeLink")}
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
      }}
      {...props}
    />
  );
}
