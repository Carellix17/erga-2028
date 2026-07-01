import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, Sparkles, ArrowRight, Check, Lock, Mail, Eye, EyeOff, ChevronLeft, Loader2 } from "lucide-react";
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
type Lesson = { title: string; slides: Slide[]; quiz: QuizItem[] };

type Step = "input" | "generating" | "slide" | "quiz" | "result";

function computeHexagon(quiz: QuizItem[], answers: number[]): DemoHexagon {
  // Baseline 55 for each of the 6 skills; +30 per correct answer mapped to a skill,
  // -8 per wrong answer on that skill. Skills not tested keep a mid neutral value.
  const base = { LOG: 55, MEM: 55, FOC: 60, VOC: 55, ANS: 60, APP: 55 } as Record<string, number>;
  quiz.forEach((q, i) => {
    const correct = answers[i] === q.correct;
    const skill = q.skill in base ? q.skill : "LOG";
    base[skill] = Math.max(0, Math.min(100, base[skill] + (correct ? 30 : -8)));
  });
  // Slight FOC/ANS boost if user completed the quiz at all
  base.FOC = Math.min(100, base.FOC + 5);
  base.ANS = Math.min(100, base.ANS + 5);
  return {
    log_score: base.LOG,
    mem_score: base.MEM,
    foc_score: base.FOC,
    voc_score: base.VOC,
    ans_score: base.ANS,
    app_score: base.APP,
  };
}

async function readPdfAsText(file: File): Promise<string> {
  // Very light-touch: send the file's first ~50k chars of raw text extraction
  // via edge extract-pdf would require auth + storage. For guest demo we keep it
  // simple: prefer topic input; if a PDF is dropped, we fall back to using the
  // file name as a topic hint. This keeps the sandbox 100% stateless.
  return `Argomento suggerito dal file: ${file.name.replace(/\.pdf$/i, "")}`;
}

export function DemoFlow() {
  const [step, setStep] = useState<Step>("input");
  const [topic, setTopic] = useState("");
  const [pdfHint, setPdfHint] = useState<string>("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAuthWall, setShowAuthWall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hexagon = useMemo(
    () => (lesson && answers.length === lesson.quiz.length ? computeHexagon(lesson.quiz, answers) : null),
    [lesson, answers],
  );

  async function startDemo() {
    const finalTopic = topic.trim() || pdfHint;
    if (!finalTopic) return;
    setError(null);
    setStep("generating");
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
      const data = (await res.json()) as Lesson;
      setLesson(data);
      setSlideIdx(0);
      setStep("slide");
    } catch (e) {
      console.error(e);
      setError("Non riusciamo a generare la lezione. Riprova tra poco.");
      setStep("input");
    }
  }

  function nextSlide() {
    if (!lesson) return;
    if (slideIdx < lesson.slides.length - 1) setSlideIdx(slideIdx + 1);
    else {
      setStep("quiz");
      setQuizIdx(0);
      setSelected(null);
    }
  }

  function submitAnswer() {
    if (selected === null || !lesson) return;
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    setSelected(null);
    if (quizIdx < lesson.quiz.length - 1) setQuizIdx(quizIdx + 1);
    else {
      // finalize: persist to localStorage
      const hex = computeHexagon(lesson.quiz, nextAnswers);
      writeDemoState({
        topic: topic.trim() || pdfHint,
        title: lesson.title,
        slides: lesson.slides,
        quiz: lesson.quiz,
        answers: nextAnswers,
        hexagon: hex,
        completedAt: new Date().toISOString(),
      });
      setStep("result");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && /\.pdf$/i.test(file.name)) {
      readPdfAsText(file).then((hint) => {
        setPdfHint(hint);
        if (!topic) setTopic(file.name.replace(/\.pdf$/i, ""));
      });
    }
  }

  return (
    <div className="w-full">
      {step === "input" && (
        <InputStep
          topic={topic}
          setTopic={setTopic}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          onDrop={onDrop}
          onStart={startDemo}
          error={error}
        />
      )}
      {step === "generating" && <GeneratingStep />}
      {step === "slide" && lesson && (
        <SlideStep
          lesson={lesson}
          idx={slideIdx}
          onNext={nextSlide}
          onBack={() => setStep("input")}
        />
      )}
      {step === "quiz" && lesson && (
        <QuizStep
          item={lesson.quiz[quizIdx]}
          idx={quizIdx}
          total={lesson.quiz.length}
          selected={selected}
          setSelected={setSelected}
          onSubmit={submitAnswer}
        />
      )}
      {step === "result" && hexagon && lesson && (
        <ResultStep
          hexagon={hexagon}
          correct={answers.filter((a, i) => a === lesson.quiz[i].correct).length}
          total={lesson.quiz.length}
          onOpenAuth={() => setShowAuthWall(true)}
        />
      )}

      {showAuthWall && <AuthWallModal onClose={() => setShowAuthWall(false)} />}
    </div>
  );
}

/* ────────────────── Steps ────────────────── */

function InputStep({
  topic, setTopic, isDragging, setIsDragging, onDrop, onStart, error,
}: {
  topic: string;
  setTopic: (v: string) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onStart: () => void;
  error: string | null;
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
            <Sparkles className="w-4 h-4 mr-2" />
            Inizia Lezione Demo
            <ArrowRight className="w-4 h-4 ml-2" />
          </LiquidButton>
        </div>

        {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}

        <p className="mt-4 text-center text-xs text-slate-400">
          Nessuna registrazione richiesta · 3 slide + quiz
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
      <p className="font-display text-2xl text-slate-900">Sto pensando…</p>
      <p className="text-sm text-slate-500">Costruisco una micro-lezione su misura per te.</p>
    </div>
  );
}

function SlideStep({
  lesson, idx, onNext, onBack,
}: { lesson: Lesson; idx: number; onNext: () => void; onBack: () => void }) {
  const slide = lesson.slides[idx];
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-up">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="w-4 h-4" /> Annulla
      </button>
      <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] p-6 sm:p-8">
        <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
          Slide {idx + 1} / {lesson.slides.length}
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-slate-900 mb-4">{slide.part_title}</h2>
        <p className="text-slate-700 leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: slide.content.replace(/\*\*(.+?)\*\*/g, "<strong class='text-slate-900'>$1</strong>") }}
        />
      </div>
      <LiquidButton
        onClick={onNext}
        className="w-full h-14 mt-5 rounded-2xl bg-slate-900 text-white text-base font-medium"
      >
        {idx < lesson.slides.length - 1 ? "Continua" : "Vai al quiz"}
        <ArrowRight className="w-4 h-4 ml-2" />
      </LiquidButton>
    </div>
  );
}

function QuizStep({
  item, idx, total, selected, setSelected, onSubmit,
}: {
  item: QuizItem;
  idx: number;
  total: number;
  selected: number | null;
  setSelected: (n: number) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-up">
      <div className="text-xs uppercase tracking-widest text-slate-400 mb-3 text-center">
        Domanda {idx + 1} / {total}
      </div>
      <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] p-6 sm:p-8">
        <h3 className="font-display text-xl sm:text-2xl text-slate-900 mb-5">{item.question}</h3>
        <div className="space-y-2">
          {item.options.map((opt, i) => (
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
        onClick={onSubmit}
        disabled={selected === null}
        className="w-full h-14 mt-5 rounded-2xl bg-slate-900 text-white text-base font-medium disabled:opacity-40"
      >
        {idx < total - 1 ? "Prossima" : "Vedi risultato"}
        <ArrowRight className="w-4 h-4 ml-2" />
      </LiquidButton>
    </div>
  );
}

function ResultStep({
  hexagon, correct, total, onOpenAuth,
}: { hexagon: DemoHexagon; correct: number; total: number; onOpenAuth: () => void }) {
  return (
    <div className="w-full max-w-xl mx-auto animate-fade-up space-y-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">Il tuo esagono</p>
        <h2 className="font-display text-3xl text-slate-900 mt-1">
          {correct} / {total} corrette
        </h2>
      </div>
      <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] p-4">
        <CognitiveRadar profile={hexagon} />
      </div>

      <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] p-6 sm:p-8 text-center">
        <h3 className="font-display text-2xl text-slate-900">Consolida la tua conoscenza.</h3>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Hai completato la tua prima sessione. Per salvare questo Esagono sul tuo profilo,
          sbloccare la Vista Grafo interattiva del tuo percorso di studi e caricare file
          illimitati, crea il tuo account gratuito.
        </p>
        <LiquidButton
          onClick={onOpenAuth}
          className="mt-5 w-full h-14 rounded-2xl bg-slate-900 text-white text-base font-medium"
        >
          Crea account gratuito
          <ArrowRight className="w-4 h-4 ml-2" />
        </LiquidButton>
        <p className="mt-3 text-xs text-slate-400">
          Già iscritto?{" "}
          <Link to="/login" className="underline underline-offset-2 hover:text-slate-700">
            Accedi
          </Link>
        </p>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-up p-4">
      <div className="w-full max-w-md rounded-3xl bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] p-6 sm:p-8">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-xl text-slate-900">
            {mode === "signup" ? "Crea account" : "Bentornato"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm">Chiudi</button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Il tuo esagono verrà collegato al tuo profilo.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-600">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
              <Input
                type="email"
                required
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
                required
                minLength={8}
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
            type="button"
            variant="outline"
            onClick={google}
            disabled={submitting}
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
        </form>
      </div>
    </div>
  );
}