import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Brain, ArrowRight, Check, Lock, Mail, Eye, EyeOff, ChevronLeft, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { CognitiveRadar } from "@/components/profile/CognitiveRadar";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { writeDemoState, type DemoHexagon } from "@/hooks/useDemoHandoff";

type Slide = { part_title: string; content: string };
type QuizItem = { question: string; options: string[]; correct: number; skill: string };
type Lesson = { title: string; subtitle?: string; slides: Slide[]; quiz: QuizItem[] };
type Course = { courseTitle: string; lessons: Lesson[] };

// Guest can complete lessons 1..GUEST_LIMIT; anything beyond triggers auth wall.
const GUEST_LIMIT = 3;

type CompletionMap = Record<number, { answers: number[] }>;

function neutralHex(): DemoHexagon {
  return { log_score: 55, mem_score: 55, foc_score: 60, voc_score: 55, ans_score: 60, app_score: 55 };
}

function computeHexagon(lessons: Lesson[], completions: CompletionMap): DemoHexagon {
  const base: Record<string, number> = { LOG: 55, MEM: 55, FOC: 60, VOC: 55, ANS: 60, APP: 55 };
  let touched = false;
  Object.entries(completions).forEach(([idxStr, { answers }]) => {
    const idx = Number(idxStr);
    const lesson = lessons[idx];
    if (!lesson) return;
    touched = true;
    lesson.quiz.forEach((q, i) => {
      const correct = answers[i] === q.correct;
      const skill = q.skill in base ? q.skill : "LOG";
      base[skill] = Math.max(0, Math.min(100, base[skill] + (correct ? 18 : -5)));
    });
  });
  if (touched) {
    base.FOC = Math.min(100, base.FOC + 5);
    base.ANS = Math.min(100, base.ANS + 5);
  }
  return {
    log_score: base.LOG, mem_score: base.MEM, foc_score: base.FOC,
    voc_score: base.VOC, ans_score: base.ANS, app_score: base.APP,
  };
}

export function DemoFlow() {
  const [phase, setPhase] = useState<"input" | "generating" | "course">("input");
  const [topic, setTopic] = useState("");
  const [pdfHint, setPdfHint] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [completions, setCompletions] = useState<CompletionMap>({});
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [showAuthWall, setShowAuthWall] = useState(false);

  const hexagon = useMemo(
    () => (course ? computeHexagon(course.lessons, completions) : neutralHex()),
    [course, completions],
  );

  async function startDemo() {
    const finalTopic = topic.trim() || pdfHint;
    if (!finalTopic) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons-demo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ topic: finalTopic }),
        },
      );
      if (!res.ok) throw new Error("gen failed");
      const data = (await res.json()) as Course;
      setCourse(data);
      setCompletions({});
      setPhase("course");
    } catch (e) {
      console.error(e);
      setError("Non riusciamo a generare il percorso. Riprova tra poco.");
      setPhase("input");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /\.pdf$/i.test(file.name)) {
      const hint = `Argomento suggerito dal file: ${file.name.replace(/\.pdf$/i, "")}`;
      setPdfHint(hint);
      if (!topic) setTopic(file.name.replace(/\.pdf$/i, ""));
    }
  }

  function tryOpenLesson(idx: number) {
    if (idx >= GUEST_LIMIT) { setShowAuthWall(true); return; }
    setActiveLesson(idx);
  }

  function completeLesson(idx: number, answers: number[]) {
    if (!course) return;
    const nextCompletions: CompletionMap = { ...completions, [idx]: { answers } };
    setCompletions(nextCompletions);
    const hex = computeHexagon(course.lessons, nextCompletions);
    writeDemoState({
      topic: topic.trim() || pdfHint,
      courseTitle: course.courseTitle,
      hexagon: hex,
      completedLessons: Object.keys(nextCompletions).length,
      completedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="w-full">
      {phase === "input" && (
        <InputStep
          topic={topic} setTopic={setTopic}
          isDragging={isDragging} setIsDragging={setIsDragging}
          onDrop={onDrop} onStart={startDemo} error={error}
        />
      )}
      {phase === "generating" && <GeneratingStep />}
      {phase === "course" && course && (
        <CourseStep
          course={course}
          completions={completions}
          hexagon={hexagon}
          onOpen={tryOpenLesson}
          onOpenAuth={() => setShowAuthWall(true)}
          onReset={() => { setCourse(null); setCompletions({}); setPhase("input"); }}
        />
      )}

      {activeLesson !== null && course && (
        <FullscreenLesson
          lesson={course.lessons[activeLesson]}
          lessonIndex={activeLesson}
          totalLessons={course.lessons.length}
          onClose={() => setActiveLesson(null)}
          onComplete={(answers) => {
            completeLesson(activeLesson, answers);
          }}
          onOpenAuth={() => setShowAuthWall(true)}
          isLastGuestLesson={activeLesson === GUEST_LIMIT - 1}
        />
      )}

      {showAuthWall && <AuthWallModal onClose={() => setShowAuthWall(false)} />}
    </div>
  );
}

/* ────────────────── Input ────────────────── */

function InputStep({
  topic, setTopic, isDragging, setIsDragging, onDrop, onStart, error,
}: {
  topic: string; setTopic: (v: string) => void;
  isDragging: boolean; setIsDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onStart: () => void; error: string | null;
}) {
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-up">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-3xl border-[1.5px] border-dashed transition-all duration-300 p-6 sm:p-8 bg-white/70 backdrop-blur-md shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]",
          isDragging ? "border-primary/60 bg-primary/5 scale-[1.01]" : "border-slate-200",
        )}
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-sm text-slate-500">
            Trascina un <strong className="text-slate-800 font-medium">PDF</strong> qui, oppure scrivi un argomento.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Es. Lamarck e l'evoluzione"
            className="h-14 rounded-2xl bg-white border border-slate-200 focus-visible:border-primary/60 pl-5 text-base"
            onKeyDown={(e) => e.key === "Enter" && topic.trim() && onStart()}
          />
          <LiquidButton
            onClick={onStart}
            disabled={!topic.trim()}
            className="w-full h-14 rounded-2xl bg-slate-900 text-white text-base font-medium disabled:opacity-40"
          >
            <Brain className="w-4 h-4 mr-2" />
            Inizia Lezione Demo
            <ArrowRight className="w-4 h-4 ml-2" />
          </LiquidButton>
        </div>

        {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}

        <p className="mt-4 text-center text-xs text-slate-400">
          Nessuna registrazione richiesta · Percorso di 4 lezioni · 3 gratuite
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
          <Lock className="w-3 h-3" /> Vista Grafo
        </span>
        <span className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
          <Lock className="w-3 h-3" /> Storico
        </span>
        <span className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
          <Lock className="w-3 h-3" /> File illimitati
        </span>
      </div>
    </div>
  );
}

function GeneratingStep() {
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-up flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center shadow-lg">
        <Loader2 className="w-7 h-7 text-white animate-spin" />
      </div>
      <p className="font-display text-2xl text-slate-900">Sto progettando il tuo percorso…</p>
      <p className="text-sm text-slate-500">Sto suddividendo l'argomento in 4 lezioni sequenziali.</p>
    </div>
  );
}

/* ────────────────── Course (linear list) ────────────────── */

function CourseStep({
  course, completions, hexagon, onOpen, onOpenAuth, onReset,
}: {
  course: Course;
  completions: CompletionMap;
  hexagon: DemoHexagon;
  onOpen: (idx: number) => void;
  onOpenAuth: () => void;
  onReset: () => void;
}) {
  const completedCount = Object.keys(completions).length;
  const showHex = completedCount > 0;
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-up">
      <button onClick={onReset} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="w-4 h-4" /> Nuovo argomento
      </button>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Il tuo percorso</p>
        <h2 className="font-display text-2xl sm:text-3xl text-slate-900 tracking-tight">{course.courseTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {completedCount} / {GUEST_LIMIT} lezioni gratuite completate
        </p>
      </div>

      <ol className="space-y-3">
        {course.lessons.map((lesson, idx) => {
          const done = !!completions[idx];
          const locked = idx >= GUEST_LIMIT;
          return (
            <li key={idx}>
              <button
                onClick={() => (locked ? onOpenAuth() : onOpen(idx))}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-300 flex items-start gap-4 group",
                  locked
                    ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                    : done
                      ? "bg-white border-slate-900/10 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)]"
                      : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)]",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-medium",
                    locked
                      ? "bg-slate-200 text-slate-500"
                      : done
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition",
                  )}
                >
                  {locked ? <Lock className="w-4 h-4" /> : done ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-slate-400">Lezione {idx + 1}</span>
                    {locked && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white">
                        Account richiesto
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 font-display text-base sm:text-lg text-slate-900 truncate">{lesson.title}</h3>
                  {lesson.subtitle && (
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500 line-clamp-2">{lesson.subtitle}</p>
                  )}
                </div>
                <ArrowRight className={cn("w-4 h-4 mt-3 shrink-0", locked ? "text-slate-400" : "text-slate-500")} />
              </button>
            </li>
          );
        })}
      </ol>

      {showHex && (
        <div className="mt-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] p-5">
          <div className="text-center mb-2">
            <p className="text-xs uppercase tracking-widest text-slate-400">Il tuo esagono, in tempo reale</p>
          </div>
          <CognitiveRadar profile={hexagon} />
          <div className="mt-3 text-center text-xs text-slate-500">
            Salvalo sul tuo profilo — <button onClick={onOpenAuth} className="underline underline-offset-2 text-slate-800">crea un account</button>.
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────── Fullscreen lesson (slides + quiz + result) ────────────────── */

function FullscreenLesson({
  lesson, lessonIndex, totalLessons, onClose, onComplete, onOpenAuth, isLastGuestLesson,
}: {
  lesson: Lesson;
  lessonIndex: number;
  totalLessons: number;
  onClose: () => void;
  onComplete: (answers: number[]) => void;
  onOpenAuth: () => void;
  isLastGuestLesson: boolean;
}) {
  const [stage, setStage] = useState<"slide" | "quiz" | "result">("slide");
  const [slideIdx, setSlideIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [committed, setCommitted] = useState(false);

  function nextSlide() {
    if (slideIdx < lesson.slides.length - 1) setSlideIdx(slideIdx + 1);
    else { setStage("quiz"); setSelected(null); }
  }
  function submitAnswer() {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    setSelected(null);
    if (quizIdx < lesson.quiz.length - 1) setQuizIdx(quizIdx + 1);
    else {
      if (!committed) { onComplete(nextAnswers); setCommitted(true); }
      setStage("result");
    }
  }

  const correctCount = answers.filter((a, i) => a === lesson.quiz[i].correct).length;

  return (
    <div className="fixed inset-0 top-0 left-0 w-screen h-screen z-50 bg-dot-grid overflow-y-auto animate-fade-up">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-dot-grid/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-14">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Chiudi lezione"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              Lezione {lessonIndex + 1} / {totalLessons}
            </p>
            <p className="text-sm font-medium text-slate-900 truncate">{lesson.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Esci"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Progress */}
        <div className="h-[2px] bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all duration-500 ease-out"
            style={{
              width: `${
                stage === "slide"
                  ? ((slideIdx + 1) / (lesson.slides.length + lesson.quiz.length + 1)) * 100
                  : stage === "quiz"
                    ? ((lesson.slides.length + quizIdx + 1) / (lesson.slides.length + lesson.quiz.length + 1)) * 100
                    : 100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {stage === "slide" && (
          <div className="animate-fade-up">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">
              Slide {slideIdx + 1} / {lesson.slides.length}
            </div>
            <h2 className="font-display text-2xl sm:text-4xl text-slate-900 tracking-tight mb-5">
              {lesson.slides[slideIdx].part_title}
            </h2>
            <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)] p-6 sm:p-8">
              <p
                className="text-slate-700 leading-relaxed whitespace-pre-line text-[15px] sm:text-base"
                dangerouslySetInnerHTML={{
                  __html: lesson.slides[slideIdx].content
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;")
                    .replace(
                      /\*\*(.+?)\*\*/g,
                      "<strong class=\"text-slate-900 font-semibold\">$1</strong>",
                    ),
                }}
              />
            </div>
            <LiquidButton
              onClick={nextSlide}
              className="w-full h-14 mt-6 rounded-2xl bg-slate-900 text-white text-base font-medium"
            >
              {slideIdx < lesson.slides.length - 1 ? "Continua" : "Vai al quiz"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </LiquidButton>
          </div>
        )}

        {stage === "quiz" && (
          <div className="animate-fade-up">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-3 text-center">
              Domanda {quizIdx + 1} / {lesson.quiz.length}
            </div>
            <div className="rounded-3xl bg-white border border-slate-100 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.15)] p-6 sm:p-8">
              <h3 className="font-display text-xl sm:text-2xl text-slate-900 mb-5">
                {lesson.quiz[quizIdx].question}
              </h3>
              <div className="space-y-2">
                {lesson.quiz[quizIdx].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-2xl border transition-all",
                      selected === i
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white hover:border-slate-400 text-slate-800",
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <LiquidButton
              onClick={submitAnswer}
              disabled={selected === null}
              className="w-full h-14 mt-6 rounded-2xl bg-slate-900 text-white text-base font-medium disabled:opacity-40"
            >
              {quizIdx < lesson.quiz.length - 1 ? "Prossima" : "Vedi risultato"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </LiquidButton>
          </div>
        )}

        {stage === "result" && (
          <div className="animate-fade-up text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <p className="text-xs uppercase tracking-widest text-slate-400">Lezione completata</p>
            <h2 className="font-display text-3xl text-slate-900 mt-1 tracking-tight">
              {correctCount} / {lesson.quiz.length} corrette
            </h2>
            <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto">
              Le tue risposte hanno aggiornato il tuo <span className="text-slate-800 font-medium">Esagono Cognitivo</span>.
              Torna al percorso per continuare.
            </p>

            <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto">
              {isLastGuestLesson ? (
                <LiquidButton
                  onClick={onOpenAuth}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white text-base font-medium"
                >
                  Sblocca la prossima lezione
                  <ArrowRight className="w-4 h-4 ml-2" />
                </LiquidButton>
              ) : (
                <LiquidButton
                  onClick={onClose}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white text-base font-medium"
                >
                  Torna al percorso
                  <ArrowRight className="w-4 h-4 ml-2" />
                </LiquidButton>
              )}
              <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
                Chiudi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────── Auth wall modal ────────────────── */

function AuthWallModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast({ title: "Controlla la tua email", description: "Ti abbiamo mandato un link di conferma." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      toast({
        title: "Errore",
        description: err instanceof Error ? err.message : "Riprova.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const google = async () => {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
    } catch (err) {
      toast({
        title: "Errore Google",
        description: err instanceof Error ? err.message : "Riprova.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-up p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/70 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] p-6 sm:p-8">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl text-slate-900">
            {mode === "signup" ? "Consolida la tua conoscenza" : "Bentornato"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">Chiudi</button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Per sbloccare le lezioni successive di questo percorso e salvare i tuoi dati, crea un account gratuito.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <Input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-white border border-slate-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                required minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-12 h-12 rounded-xl bg-white border border-slate-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <LiquidButton
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-40"
          >
            {submitting ? "Attendi…" : mode === "signup" ? "Crea account" : "Accedi"}
            <Check className="w-4 h-4 ml-2" />
          </LiquidButton>

          <Button
            type="button" variant="outline"
            onClick={google} disabled={submitting}
            className="w-full h-12 rounded-xl border-slate-200 bg-white"
          >
            Continua con Google
          </Button>

          <p className="text-center text-xs text-slate-500">
            {mode === "signup" ? "Hai già un account? " : "Nuovo qui? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-slate-800 underline underline-offset-2"
            >
              {mode === "signup" ? "Accedi" : "Crea account"}
            </button>
          </p>
          <p className="text-center text-xs text-slate-400">
            <Link to="/login" className="underline underline-offset-2 hover:text-slate-700">Vai alla pagina di accesso</Link>
          </p>
        </form>
      </div>
    </div>
  );
}