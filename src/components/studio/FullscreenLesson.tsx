import { useState, useCallback, useMemo, useRef, useEffect } from"react";
import { X, ChevronLeft, ChevronRight, Lightbulb, BookOpen, Dumbbell, Trophy, CheckCircle2, Zap, Star, Loader2, ImageIcon } from"lucide-react";
import { Button } from"@/components/ui/button";
import { LiquidButton } from"@/components/ui/liquid-glass-button";
import { ExerciseRenderer, Exercise } from"./exercises/ExerciseRenderer";
import { cn } from"@/lib/utils";
import ReactMarkdown from"react-markdown";
import remarkGfm from"remark-gfm";
import { fireCelebration, fireStarBurst } from"@/lib/confetti";
import { PdfCrop } from"./PdfCrop";
import { useLessonFigures, prefetchLessonFigures, type LessonFigure } from"@/hooks/useLessonFigures";
import { LessonFigureGallery } from"./LessonFigureGallery";
import { useFocus } from "@/contexts/FocusContext";
import { FocusPill } from "@/components/focus/FocusPill";

/**
 * Stile Finanz: i blockquote che iniziano con un'emoji tematica vengono
 * renderizzati come box colorato (giallo / rosa / blu) per spezzare il blocco
 * di testo della slide e creare contrasto visivo.
 */
const CALLOUT_VARIANTS = {
 yellow:"bg-amber-100/80 border-amber-300/70 text-amber-950",
 pink:"bg-rose-100/80 border-rose-300/70 text-rose-950",
 blue:"bg-sky-100/80 border-sky-300/70 text-sky-950",
 neutral:"bg-surface-container-high/80 border-outline-variant/40 text-foreground",
} as const;

const YELLOW_EMOJI = ["💡","⭐","🎯","⚡","🌟","✨"];
const PINK_EMOJI = ["🛡️","⚠️","🔥","❗","❤️","🚨"];
const BLUE_EMOJI = ["📊","🧭","🔎","📌","📐","📚","🧪","🗺️"];

function detectCalloutVariant(text: string): keyof typeof CALLOUT_VARIANTS {
 const trimmed = text.trimStart();
 if (YELLOW_EMOJI.some((e) => trimmed.startsWith(e))) return"yellow";
 if (PINK_EMOJI.some((e) => trimmed.startsWith(e))) return"pink";
 if (BLUE_EMOJI.some((e) => trimmed.startsWith(e))) return"blue";
 return"neutral";
}

function CalloutBlockquote({ children }: { children?: React.ReactNode }) {
 // Extract leading text to detect the emoji
 const flatten = (node: React.ReactNode): string => {
 if (typeof node ==="string") return node;
 if (Array.isArray(node)) return node.map(flatten).join("");
 if (node && typeof node ==="object" &&"props" in (node as any)) {
 return flatten((node as any).props?.children);
 }
 return"";
 };
 const variant = detectCalloutVariant(flatten(children));
 return (
 <div
 className={cn(
"my-3 px-4 py-3 rounded-2xl border-[0.5px] backdrop-blur-md shadow-[0_4px_16px_0_rgba(0,0,0,0.04)] body-medium leading-relaxed [&>p]:m-0 [&_strong]:font-semibold",
 CALLOUT_VARIANTS[variant]
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

type StepType ="concept" |"explanation_part" |"example" |"exercise" |"summary";

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
 return [{ part_title:"Spiegazione", content: explanation }];
 }
 
 const parts: ExplanationPart[] = [];
 let currentContent ="";
 let partIndex = 0;
 
 for (const line of lines) {
 const trimmed = line.trim();
 if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
 if (currentContent) {
 parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
 partIndex++;
 }
 currentContent = trimmed.replace(/^[•\-*]\s*/,"");
 } else {
 currentContent += (currentContent ?"\n" :"") + trimmed;
 }
 }
 if (currentContent) {
 parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
 }
 
 return parts.length > 0 ? parts : [{ part_title:"Spiegazione", content: explanation }];
}

function buildSteps(lesson: FullscreenLessonProps["lesson"], explanationParts: ExplanationPart[]): Step[] {
 const steps: Step[] = [{ type:"concept" }];
 explanationParts.forEach((_, i) => {
 steps.push({ type:"explanation_part", explanationPartIndex: i });
 });
 if (lesson.example) steps.push({ type:"example" });
 const exercises = lesson.exercises || [];
 exercises.forEach((_, i) => {
 steps.push({ type:"exercise", exerciseIndex: i });
 });
 if (exercises.length > 0) steps.push({ type:"summary" });
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
 while ((m = re.exec(part.content ||"")) !== null) {
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
 const [xpGained, setXpGained] = useState(0);
 const [showXpFloat, setShowXpFloat] = useState(false);
 const contentRef = useRef<HTMLDivElement>(null);

 const step = steps[currentStep];
 const progress = ((currentStep + 1) / steps.length) * 100;
 const exercises = lesson.exercises || [];

 const gainXp = useCallback((amount: number) => {
 setXpGained(prev => prev + amount);
 setShowXpFloat(true);
 setTimeout(() => setShowXpFloat(false), 800);
 }, []);

 const handleContinue = useCallback(() => {
 if (isAnimating) return;
 setIsAnimating(true);
 
 if (currentStep < steps.length - 1) {
 const nextStep = steps[currentStep + 1];
 if (nextStep.type ==="summary") fireStarBurst();
 
 // Animate out, then in
 setTimeout(() => {
 setCurrentStep(s => s + 1);
 setCurrentExerciseAnswered(false);
 setIsAnimating(false);
 }, 250);
 } else {
 fireCelebration();
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
 if (correct) gainXp(10);
 }
 },
 [step, gainXp]
 );

 const correctCount = Object.values(exerciseResults).filter(Boolean).length;
 const canContinue = step.type !=="exercise" || currentExerciseAnswered;

 // Segment the progress bar
 const segments = steps.length;

 return (
 <div className="fixed inset-0 z-50 bg-dot-grid flex flex-col animate-cinematic-in">
 {/* Top bar */}
 <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
 <div className="flex items-center gap-2 mb-2">
 {currentStep > 0 ? (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={handleBack}
 className="rounded-full -ml-1 text-muted-foreground hover:text-foreground transition-all duration-300 ease-in-out"
 aria-label="Torna indietro"
 >
 <ChevronLeft className="w-5 h-5" />
 </Button>
 ) : (
 <Button
 variant="ghost"
 size="icon-sm"
 onClick={onClose}
 className="rounded-full -ml-1 text-muted-foreground hover:text-foreground transition-all duration-300 ease-in-out"
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
 className="rounded-full text-muted-foreground/70 hover:text-foreground transition-all duration-300 ease-in-out"
 aria-label="Chiudi lezione"
 >
 <X className="w-4 h-4" />
 </Button>
 )}

 {/* Segmented progress bar */}
 <div className="flex-1 flex gap-0.5 h-2">
 {Array.from({ length: segments }).map((_, i) => (
 <div
 key={i}
 className={cn(
"flex-1 rounded-full transition-all duration-500 ease-m3-emphasized",
 i < currentStep
 ?"bg-primary"
 : i === currentStep
 ?"bg-primary animate-progress-glow"
 :"bg-surface-container-highest"
 )}
 />
 ))}
 </div>

 {/* XP counter */}
 <div className="relative flex items-center gap-1 label-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full">
 <Zap className="w-3.5 h-3.5" />
 <span>{xpGained}</span>
 {showXpFloat && (
 <span className="absolute -top-2 right-0 text-xs font-bold text-warning animate-xp-float">
 +10
 </span>
 )}
 </div>
 </div>
 <p className="body-small text-muted-foreground text-center">
 Lezione {lessonNumber} di {totalLessons} · <span className="text-foreground title-small">{lesson.title}</span>
 </p>
 </div>

 {/* Content area */}
 <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col" ref={contentRef}>
 <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
 <div key={currentStep} className={cn("animate-lesson-in", isAnimating &&"animate-lesson-out")}>
 {step.type ==="concept" && <ConceptStep concept={lesson.concept} />}
 {step.type ==="explanation_part" && step.explanationPartIndex !== undefined && (
 <ExplanationPartStep
 part={explanationParts[step.explanationPartIndex]}
 partNumber={step.explanationPartIndex + 1}
 totalParts={explanationParts.length}
 figures={figures}
 figuresLoading={figuresLoading}
 />
 )}
 {step.type ==="example" && lesson.example && <ExampleStep example={lesson.example} />}
 {step.type ==="exercise" && step.exerciseIndex !== undefined && exercises[step.exerciseIndex] && (
 <ExerciseStep
 exercise={exercises[step.exerciseIndex]}
 exerciseNumber={step.exerciseIndex + 1}
 totalExercises={exercises.length}
 onComplete={handleExerciseComplete}
 isCompleted={currentExerciseAnswered}
 />
 )}
 {step.type ==="summary" && (
 <SummaryStep
 correctCount={correctCount}
 totalExercises={exercises.length}
 isLastLesson={isLastLesson}
 xpGained={xpGained}
 orphanFigures={orphanFigures}
 />
 )}
 </div>
 </div>
 </div>

 {/* Bottom action */}
 <div className="flex-shrink-0 p-4 pb-8 safe-area-bottom">
 <LiquidButton
 onClick={handleContinue}
 disabled={!canContinue}
 className={cn(
"w-full h-12 rounded-xl text-base font-medium tracking-tight transition-all duration-200 border border-white/20",
 canContinue
 ?"bg-black text-white shadow-sm hover:bg-stone-900 active:scale-[0.98]"
 :"bg-surface-container-high text-muted-foreground"
 )}
 size="lg"
 >
 {currentStep === steps.length - 1
 ? isLastLesson ?"Completa corso 🎓" :"Prossima lezione"
 : step.type ==="exercise" && !currentExerciseAnswered
 ?"Rispondi per continuare"
 :"Continua"}
 {(canContinue || step.type !=="exercise") && <ChevronRight className="w-5 h-5 ml-1" />}
 </LiquidButton>
 </div>
 </div>
 );
}

/* ── Step Components ── */

function ConceptStep({ concept }: { concept: string }) {
 return (
 <div className="text-center space-y-6">
 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto border border-primary/20 transition-all duration-300 ease-in-out">
 <Lightbulb className="w-5 h-5 text-primary" />
 </div>
 <div>
 <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md border-[0.5px] border-white/40 text-primary label-medium mb-4 shadow-[0_4px_16px_0_rgba(0,0,0,0.04)]">
 <Star className="w-3.5 h-3.5" />
 Concetto chiave
 </div>
 <div className="text-xl font-normal tracking-tight leading-[1.7] prose prose-sm max-w-none mx-auto px-2 prose-p:font-normal prose-table:rounded-2xl prose-table:overflow-hidden prose-th:bg-primary-container/60 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-white/30">
 <ReactMarkdown remarkPlugins={[remarkGfm]}>{concept}</ReactMarkdown>
 </div>
 </div>
 </div>
 );
}

function ExplanationPartStep({ part, partNumber, totalParts, figures, figuresLoading }: { part: ExplanationPart; partNumber: number; totalParts: number; figures: LessonFigure[]; figuresLoading: boolean }) {
 const isExample = part.part_title.startsWith("📌") || part.part_title.startsWith("🔍");

 const segments = useMemo(() => {
 const out: Array<{ type:"text"; value: string } | { type:"fig"; figure: LessonFigure } | { type:"fig-pending"; index: number }> = [];
 const text = part.content ||"";
 const re = /\[FIG:(\d+)\]/g;
 let last = 0;
 let m: RegExpExecArray | null;
 while ((m = re.exec(text)) !== null) {
 if (m.index > last) out.push({ type:"text", value: text.slice(last, m.index) });
 const idx = parseInt(m[1], 10);
 const fig = figures[idx];
 if (fig) out.push({ type:"fig", figure: fig });
 else out.push({ type:"fig-pending", index: idx });
 last = m.index + m[0].length;
 }
 if (last < text.length) out.push({ type:"text", value: text.slice(last) });
 return out.length > 0 ? out : [{ type:"text" as const, value: text }];
 }, [part.content, figures]);

 return (
 <div className="space-y-5">
 <div className="flex items-center gap-3 mb-2">
 <div className={cn(
"w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant/40 transition-all duration-300 ease-in-out",
 isExample ?"bg-tertiary-container/60" :"bg-secondary-container/60"
 )}>
 {isExample ? <span className="text-base">💡</span> : <BookOpen className={cn("w-4 h-4", isExample ?"text-tertiary" :"text-secondary-foreground")} />}
 </div>
 <div className="flex-1">
 <span className="label-large text-foreground">{part.part_title}</span>
 <div className="flex items-center gap-1 mt-0.5">
 {Array.from({ length: totalParts }).map((_, i) => (
 <div key={i} className={cn("h-1 rounded-full flex-1 transition-all duration-300",
 i < partNumber ? (isExample ?"bg-tertiary" :"bg-secondary") :"bg-surface-container-highest")} />
 ))}
 </div>
 </div>
 </div>
 <div className={cn(
"p-6 sm:p-7 rounded-2xl backdrop-blur-md border-[0.5px] shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] space-y-4 transition-all duration-300 ease-in-out",
 isExample
 ?"bg-tertiary-container/60 border-tertiary/30 border-l-4 border-l-tertiary"
 :"bg-white/70 border-white/40"
 )}>
 {segments.map((seg, i) => {
 if (seg.type ==="text") {
 return seg.value.trim() ? (
 <div key={i} className="text-[15px] font-normal text-foreground/80 leading-[1.7] prose prose-sm max-w-none prose-p:font-normal prose-p:text-foreground/80 prose-p:leading-[1.7] prose-p:my-3 prose-strong:font-semibold prose-strong:text-foreground prose-em:text-foreground/90 prose-table:my-4 prose-table:rounded-2xl prose-table:overflow-hidden prose-table:border prose-table:border-white/40 prose-table:backdrop-blur-md prose-th:bg-secondary-container/60 prose-th:text-foreground prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-white/30 prose-hr:my-4 prose-hr:border-white/30">
 <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ blockquote: CalloutBlockquote }}>{seg.value}</ReactMarkdown>
 </div>
 ) : null;
 }
 if (seg.type ==="fig") {
 return <PdfCrop key={i} url={seg.figure.url} bbox={seg.figure.bbox} description={seg.figure.description} />;
 }
 // fig-pending: marker present but figure not yet loaded
 return (
 <div key={i} className="rounded-2xl bg-surface-container-highest/60 border-2 border-dashed border-outline-variant/60 p-6 flex flex-col items-center justify-center gap-2 min-h-[140px]">
 {figuresLoading ? (
 <>
 <Loader2 className="w-6 h-6 text-primary animate-spin" />
 <p className="body-small text-muted-foreground">Caricamento figura…</p>
 </>
 ) : (
 <>
 <ImageIcon className="w-6 h-6 text-muted-foreground/60" />
 <p className="body-small text-muted-foreground">Figura non disponibile</p>
 </>
 )}
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
 <div className="w-8 h-8 rounded-lg bg-tertiary-container/60 flex items-center justify-center border border-tertiary/30">
 <span className="text-base">💡</span>
 </div>
 <span className="label-large text-foreground">Esempio pratico</span>
 </div>
 <div className="p-6 sm:p-7 rounded-2xl bg-tertiary-container/60 backdrop-blur-md border-[0.5px] border-tertiary/30 border-l-4 border-l-tertiary shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out">
 <div className="text-[15px] font-normal text-foreground/80 leading-[1.7] prose prose-sm max-w-none prose-p:font-normal prose-p:leading-[1.7] prose-strong:font-semibold prose-table:rounded-2xl prose-table:overflow-hidden prose-th:bg-tertiary-container/60 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-white/30">
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
 <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] border-[0.5px] border-white/30">
 <Dumbbell className="w-6 h-6 text-primary-foreground" />
 </div>
 <div>
 <span className="label-large text-foreground">Esercizio {exerciseNumber}</span>
 <p className="body-small text-muted-foreground">{exerciseNumber} di {totalExercises}</p>
 </div>
 </div>
 <div className="flex gap-1">
 {Array.from({ length: totalExercises }).map((_, i) => (
 <div
 key={i}
 className={cn(
"w-2.5 h-2.5 rounded-full transition-all",
 i < exerciseNumber - 1 ?"bg-success" : i === exerciseNumber - 1 ?"bg-primary scale-125" :"bg-surface-container-highest"
 )}
 />
 ))}
 </div>
 </div>
 <div className="p-5 rounded-3xl bg-white/70 backdrop-blur-md border-[0.5px] border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out">
 <ExerciseRenderer exercise={exercise} onComplete={onComplete} isCompleted={isCompleted} />
 </div>
 </div>
 );
}

function SummaryStep({ correctCount, totalExercises, isLastLesson, xpGained, orphanFigures }: { correctCount: number; totalExercises: number; isLastLesson: boolean; xpGained: number; orphanFigures: LessonFigure[] }) {
 const great = correctCount >= totalExercises * 0.7;
 const percentage = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;
 
 return (
 <div className="text-center space-y-6">
 <div
 className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center animate-bounce-in shadow-level-4"
 style={{ background: great ?"hsl(var(--success))" :"hsl(var(--warning))" }}
 >
 {great ? <Trophy className="w-12 h-12 text-white" /> : <CheckCircle2 className="w-12 h-12 text-white" />}
 </div>
 
 <div>
 <p className={cn("font-display font-bold text-3xl mb-2", great ?"text-success" :"text-warning")}>
 {great ?"Fantastico! 🎉" :"Quasi! 💪"}
 </p>
 <p className="body-large text-muted-foreground">
 {percentage}% corretto — {correctCount}/{totalExercises} esercizi
 </p>
 </div>

 {/* Stats cards */}
 <div className="flex gap-3 justify-center">
 <div className="flex flex-col items-center p-4 rounded-2xl bg-primary-container min-w-[90px] animate-option-pop animate-stagger-1">
 <Zap className="w-5 h-5 text-primary mb-1" />
 <span className="title-medium font-bold text-primary">{xpGained}</span>
 <span className="label-small text-muted-foreground">XP</span>
 </div>
 <div className="flex flex-col items-center p-4 rounded-2xl bg-success-container min-w-[90px] animate-option-pop animate-stagger-2">
 <CheckCircle2 className="w-5 h-5 text-success mb-1" />
 <span className="title-medium font-bold text-success">{correctCount}</span>
 <span className="label-small text-muted-foreground">Corretti</span>
 </div>
 <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary-container min-w-[90px] animate-option-pop animate-stagger-3">
 <Star className="w-5 h-5 text-secondary-foreground mb-1" />
 <span className="title-medium font-bold text-secondary-foreground">{percentage}%</span>
 <span className="label-small text-muted-foreground">Precisione</span>
 </div>
 </div>

 <p className="body-small text-muted-foreground">
 {isLastLesson ?"Premi per completare il corso!" :"Premi per passare alla prossima lezione."}
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
