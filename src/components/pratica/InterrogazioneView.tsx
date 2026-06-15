import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, RotateCcw, BookOpen, MessageSquare, Play, Square, Volume2, VolumeX, Loader2, Trophy, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Mode = "select" | "config" | "structured" | "free" | "report";
type Phase = "idle" | "question" | "listening" | "evaluating" | "feedback";

interface ScoreEntry {
  question: number;
  score: number;
  questionText: string;
}

interface FinalReport {
  average: number;
  scores: ScoreEntry[];
  considerations: string;
}

interface Course {
  id: string;
  file_name: string;
}

interface ExchangeItem {
  type: "question" | "answer" | "feedback";
  content: string;
}

// Module-level singleton audio so we can stop previous playback across calls
let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;

const stopSpeaking = () => {
  if (currentAudio) {
    try { currentAudio.pause(); } catch { /* noop */ }
    currentAudio.src = "";
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  // Safety: also stop native synth in case anything leftover is playing
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

const speakWithAzure = async (text: string, onStart?: () => void, onEnd?: () => void) => {
  stopSpeaking();
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS error ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  currentObjectUrl = url;
  return new Promise<void>((resolve) => {
    const cleanup = () => {
      if (currentObjectUrl === url) {
        URL.revokeObjectURL(url);
        currentObjectUrl = null;
      }
      if (currentAudio === audio) currentAudio = null;
      onEnd?.();
      resolve();
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.onplay = () => onStart?.();
    audio.play().catch(() => cleanup());
  });
};

export function InterrogazioneView() {
  const [mode, setMode] = useState<Mode>("select");
  const [phase, setPhase] = useState<Phase>("idle");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [exchanges, setExchanges] = useState<ExchangeItem[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState<number>(5);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [isBuildingReport, setIsBuildingReport] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptBufferRef = useRef<string>("");
  const muteMicRef = useRef<boolean>(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopSpeaking(); };
  }, []);

  // Load courses
  useEffect(() => {
    const loadCourses = async () => {
      if (!currentUser) return;
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId: currentUser, action: "listContexts" }),
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.contexts || []);
      }
    };
    loadCourses();
  }, [currentUser]);

  // Setup speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.lang = "it-IT";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event: any) => {
        if (muteMicRef.current) return;
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (final) {
          transcriptBufferRef.current = (transcriptBufferRef.current + " " + final).trim();
          setTranscript(transcriptBufferRef.current);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges, phase]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (muteMicRef.current) return;
    if (isListening) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      setIsListening(false);
    } else {
      transcriptBufferRef.current = "";
      setTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch { /* already started */ }
    }
  };

  const hardStopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try { rec.abort?.(); } catch { /* noop */ }
      try { rec.stop(); } catch { /* noop */ }
    }
    setIsListening(false);
  }, []);

  const callInterrogazione = useCallback(async (action: string, extraBody: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interrogazione`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ userId: currentUser, action, contextId: selectedCourse, ...extraBody }),
    });
    if (!response.ok) throw new Error("Errore nella risposta");
    return response.json();
  }, [currentUser, selectedCourse]);

  const speakIfEnabled = useCallback(async (text: string) => {
    if (!ttsEnabled) return;
    const clean = text.replace(/[📖🎓📝🎤]/g, "").replace(/[*_#>\-]/g, "").replace(/\n+/g, ". ").trim();
    if (!clean) return;
    // Mute the microphone while the AI speaks to avoid echo / feedback loops
    muteMicRef.current = true;
    hardStopListening();
    setIsLoadingVoice(true);
    setIsSpeaking(false);
    try {
      await speakWithAzure(
        clean,
        () => { setIsLoadingVoice(false); setIsSpeaking(true); },
        () => { setIsSpeaking(false); }
      );
    } catch (err) {
      console.error("Azure TTS failed", err);
      setIsLoadingVoice(false);
      setIsSpeaking(false);
    } finally {
      muteMicRef.current = false;
    }
  }, [ttsEnabled, hardStopListening]);

  const startInterrogazione = async (courseId: string, selectedMode: "structured" | "free") => {
    setSelectedCourse(courseId);
    setMode(selectedMode);
    setExchanges([]);
    setScore(null);
    setQuestionCount(0);
    setScores([]);
    setFinalReport(null);

    if (selectedMode === "structured") {
      setPhase("evaluating");
      try {
        const data = await callInterrogazione("ask", { contextId: courseId });
        setCurrentQuestion(data.question);
        setExchanges([{ type: "question", content: data.question }]);
        setQuestionCount(1);
        setPhase("question");
        speakIfEnabled(data.question);
      } catch {
        toast({ title: "Errore", description: "Non riesco a generare la domanda", variant: "destructive" });
        setPhase("idle");
      }
    } else {
      setPhase("evaluating");
      try {
        const data = await callInterrogazione("topic", { contextId: courseId });
        setCurrentQuestion(data.topic);
        const displayText = `📖 Argomento: ${data.topic}\n\nEsponi liberamente quello che sai su questo argomento. Quando hai finito, premi il pulsante di stop.`;
        setExchanges([{ type: "question", content: displayText }]);
        setPhase("question");
        speakIfEnabled(`Argomento: ${data.topic}. Esponi liberamente quello che sai su questo argomento.`);
      } catch {
        toast({ title: "Errore", description: "Non riesco a selezionare l'argomento", variant: "destructive" });
        setPhase("idle");
      }
    }
  };

  const submitAnswer = async () => {
    // Hard-stop the mic and discard any pending recognition results to avoid
    // the same word being transcribed repeatedly
    hardStopListening();
    stopSpeaking();
    const answer = (transcriptBufferRef.current || transcript).trim();
    if (!answer) {
      toast({ title: "Rispondi prima!", description: "Dì qualcosa prima di inviare", variant: "destructive" });
      return;
    }

    setExchanges(prev => [...prev, { type: "answer", content: answer }]);
    setPhase("evaluating");
    transcriptBufferRef.current = "";
    setTranscript("");

    try {
      const action = mode === "structured" ? "evaluate" : "evaluate_free";
      const isLastQuestion = mode === "structured" && questionCount >= maxQuestions;
      const data = await callInterrogazione(action, {
        question: currentQuestion,
        answer,
        history: exchanges,
        questionNumber: questionCount,
        maxQuestions,
      });

      setExchanges(prev => [...prev, { type: "feedback", content: data.feedback }]);
      let updatedScores = scores;
      if (data.score !== undefined) {
        setScore(data.score);
        if (mode === "structured") {
          updatedScores = [...scores, { question: questionCount, score: Number(data.score), questionText: currentQuestion }];
          setScores(updatedScores);
        }
      }

      // Sequential audio queue: wait for feedback TTS to finish before
      // revealing/speaking the next question
      await speakIfEnabled(data.feedback);

      if (mode === "structured" && isLastQuestion) {
        // Build the final report
        setIsBuildingReport(true);
        setPhase("evaluating");
        try {
          const reportData = await callInterrogazione("final_report", {
            history: [...exchanges, { type: "answer", content: answer }, { type: "feedback", content: data.feedback }],
            scores: updatedScores,
          });
          const avg = updatedScores.length
            ? updatedScores.reduce((a, s) => a + s.score, 0) / updatedScores.length
            : 0;
          setFinalReport({
            average: Math.round(avg * 10) / 10,
            scores: updatedScores,
            considerations: reportData.considerations || "Bel lavoro! Continua così.",
          });
          setMode("report");
          setPhase("idle");
        } catch {
          toast({ title: "Errore", description: "Non riesco a generare il report finale", variant: "destructive" });
          setPhase("question");
        } finally {
          setIsBuildingReport(false);
        }
      } else if (data.nextQuestion && mode === "structured") {
        setCurrentQuestion(data.nextQuestion);
        setExchanges(prev => [...prev, { type: "question", content: data.nextQuestion }]);
        setQuestionCount(prev => prev + 1);
        setPhase("question");
        await speakIfEnabled(data.nextQuestion);
      } else if (data.finished) {
        setPhase("idle");
      } else {
        setPhase("question");
      }
    } catch {
      toast({ title: "Errore", description: "Non riesco a valutare la risposta", variant: "destructive" });
      setPhase("question");
    }
  };

  const resetInterrogazione = () => {
    stopSpeaking();
    hardStopListening();
    transcriptBufferRef.current = "";
    setMode("select");
    setPhase("idle");
    setExchanges([]);
    setScore(null);
    setTranscript("");
    setQuestionCount(0);
    setScores([]);
    setFinalReport(null);
    setSelectedCourse(null);
  };

  const hasSpeech = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Course & mode selection
  if (mode === "select") {
    const selectedCourseObj = courses.find(c => c.id === selectedCourse);
    return (
      <div className="flex flex-col h-full px-4 sm:px-6 py-6 space-y-6 overflow-y-auto">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/70 dark:bg-black/60 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] flex items-center justify-center">
            <Mic className="w-8 h-8 text-tertiary" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Interrogazione</h2>
          <p className="body-medium text-muted-foreground">Scegli un corso e la modalità</p>
        </div>

        {courses.length === 0 ? (
          <p className="text-center text-muted-foreground body-medium">Nessun corso disponibile. Carica prima dei materiali.</p>
        ) : (
          <div className="space-y-3">
              <p className="label-large font-semibold tracking-tight text-foreground">Scegli il corso:</p>
              <div className="space-y-2.5">
                {courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-5 rounded-3xl border-[0.5px] backdrop-blur-md transition-all duration-300 ease-in-out hover:scale-[1.01] shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]",
                      selectedCourse === course.id
                        ? "bg-tertiary-container/80 border-tertiary/30"
                        : "bg-white/70 dark:bg-black/60 border-white/40 dark:border-white/10 hover:bg-white/80 dark:hover:bg-black/70"
                    )}
                  >
                    <BookOpen className="w-5 h-5 text-tertiary flex-shrink-0" />
                    <span className="label-large font-semibold tracking-tight text-foreground truncate">
                      {course.file_name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "")}
                    </span>
                  </button>
                ))}
              </div>
          </div>
        )}

        <Dialog open={!!selectedCourse} onOpenChange={(open) => { if (!open) setSelectedCourse(null); }}>
          <DialogContent
            className="max-w-md rounded-3xl bg-white/80 dark:bg-black/70 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] duration-500 ease-m3-emphasized data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              const el = e.currentTarget as HTMLElement | null;
              const first = el?.querySelector<HTMLElement>("button:not([aria-label='Close'])");
              first?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-center font-bold tracking-tight">Scegli la modalità</DialogTitle>
              {selectedCourseObj && (
                <DialogDescription className="text-center truncate">
                  {selectedCourseObj.file_name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "")}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-3">
              <button
                onClick={() => { if (selectedCourse) { setMode("config"); } }}
                className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-primary-container/80 backdrop-blur-md border-[0.5px] border-primary/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <MessageSquare className="w-10 h-10 text-primary" />
                <span className="label-large text-primary font-semibold tracking-tight">Domande</span>
                <span className="label-small text-muted-foreground text-center">Il tutor ti fa domande</span>
              </button>
              <button
                onClick={() => selectedCourse && startInterrogazione(selectedCourse, "free")}
                className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-secondary-container/80 backdrop-blur-md border-[0.5px] border-secondary/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
              >
                <Volume2 className="w-10 h-10 text-secondary" />
                <span className="label-large text-secondary font-semibold tracking-tight">Esposizione</span>
                <span className="label-small text-muted-foreground text-center">Esponi l'argomento</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Configuration screen for structured mode (number of questions)
  if (mode === "config") {
    const selectedCourseObj = courses.find(c => c.id === selectedCourse);
    return (
      <div className="flex flex-col h-full px-4 sm:px-6 py-6 space-y-6 overflow-y-auto">
        <button
          onClick={resetInterrogazione}
          className="self-start inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="label-medium">Indietro</span>
        </button>

        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/70 dark:bg-black/60 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Configura sessione</h2>
          {selectedCourseObj && (
            <p className="body-medium text-muted-foreground truncate">
              {selectedCourseObj.file_name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "")}
            </p>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-white/70 dark:bg-black/60 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] space-y-5">
          <div className="flex items-baseline justify-between">
            <span className="label-large font-semibold tracking-tight text-foreground">Numero di domande</span>
            <span className="font-display text-4xl font-bold text-primary tabular-nums">{maxQuestions}</span>
          </div>
          <Slider
            min={3}
            max={10}
            step={1}
            value={[maxQuestions]}
            onValueChange={(v) => setMaxQuestions(v[0])}
          />
          <div className="flex justify-between label-small text-muted-foreground">
            <span>3</span>
            <span>10</span>
          </div>
        </div>

        <Button
          onClick={() => selectedCourse && startInterrogazione(selectedCourse, "structured")}
          className="h-14 rounded-full bg-primary text-primary-foreground shadow-level-2 transition-all duration-300 hover:scale-[1.01]"
        >
          <Play className="w-5 h-5 mr-2" />
          Avvia Interrogazione
        </Button>
      </div>
    );
  }

  // Final report screen
  if (mode === "report" && finalReport) {
    const avg = finalReport.average;
    const avgColor = avg >= 7 ? "text-success" : avg >= 5 ? "text-warning" : "text-destructive";
    const avgBg = avg >= 7 ? "bg-success-container" : avg >= 5 ? "bg-warning/10" : "bg-error-container";
    return (
      <div className="flex flex-col h-full px-4 sm:px-6 py-6 space-y-5 overflow-y-auto">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-white/70 dark:bg-black/60 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Report finale</h2>
          <p className="body-medium text-muted-foreground">La tua interrogazione è terminata</p>
        </div>

        <div className={cn(
          "p-8 rounded-3xl backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] text-center space-y-2",
          avgBg
        )}>
          <p className="label-medium text-muted-foreground uppercase tracking-wider">Voto complessivo</p>
          <p className={cn("font-display text-7xl font-bold tabular-nums", avgColor)}>
            {avg.toFixed(1).replace(".", ",")}
          </p>
          <p className="label-small text-muted-foreground">media su {finalReport.scores.length} domande</p>
        </div>

        <div className="p-5 rounded-3xl bg-white/70 dark:bg-black/60 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] space-y-3">
          <p className="label-large font-semibold tracking-tight text-foreground">Voti per domanda</p>
          <ul className="space-y-2">
            {finalReport.scores.map((s) => {
              const c = s.score >= 7 ? "text-success" : s.score >= 5 ? "text-warning" : "text-destructive";
              return (
                <li
                  key={s.question}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-black/40 border-[0.5px] border-white/40 dark:border-white/10"
                >
                  <span className="label-medium text-foreground">Domanda {s.question}</span>
                  <span className={cn("font-display font-bold tabular-nums", c)}>
                    {s.score.toString().replace(".", ",")}/10
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-5 rounded-3xl bg-primary-container/80 backdrop-blur-md border-[0.5px] border-primary/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <p className="label-large font-semibold tracking-tight text-on-primary-container">Considerazioni finali del Tutor</p>
          </div>
          <div className="body-medium prose prose-sm max-w-none prose-p:my-1.5 prose-strong:font-semibold text-on-primary-container">
            <ReactMarkdown>{finalReport.considerations}</ReactMarkdown>
          </div>
        </div>

        <Button
          onClick={resetInterrogazione}
          className="h-14 rounded-full bg-primary text-primary-foreground shadow-level-2 transition-all duration-300 hover:scale-[1.01]"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Nuova interrogazione
        </Button>
      </div>
    );
  }

  // Active interrogation
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-black/60 backdrop-blur-md border-b-[0.5px] border-white/40 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="label-large font-semibold tracking-tight text-foreground">
            {mode === "structured" ? `Domanda ${questionCount} di ${maxQuestions}` : "Esposizione libera"}
          </span>
          {score !== null && (
            <span className={cn(
              "px-2.5 py-0.5 rounded-full label-small",
              score >= 7 ? "bg-success-container text-success" :
              score >= 5 ? "bg-warning/10 text-warning" :
              "bg-error-container text-destructive"
            )}>
              {score}/10
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { if (isSpeaking || isLoadingVoice) { stopSpeaking(); setIsSpeaking(false); setIsLoadingVoice(false); } setTtsEnabled(!ttsEnabled); }}
            className={cn("rounded-full", ttsEnabled ? "text-tertiary" : "text-muted-foreground")}
            title={ttsEnabled ? "Disattiva voce" : "Attiva voce"}
          >
            {isLoadingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : ttsEnabled ? <Volume2 className={cn("w-4 h-4", isSpeaking && "animate-pulse")} /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={resetInterrogazione} className="rounded-full">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Exchanges */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {exchanges.map((item, i) => (
          <div
            key={i}
            className={cn(
              "rounded-3xl px-5 py-4 backdrop-blur-md border-[0.5px] shadow-[0_8px_32px_0_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out animate-fade-up",
              item.type === "question" && "bg-tertiary-container/80 text-on-tertiary-container border-white/40 dark:border-white/10",
              item.type === "answer" && "bg-white/70 dark:bg-black/60 text-foreground ml-8 border-white/40 dark:border-white/10",
              item.type === "feedback" && "bg-primary-container/80 text-on-primary-container border-primary/10"
            )}
          >
            <div className="label-small text-muted-foreground mb-1">
              <span className="inline-flex items-center gap-1.5">
                {item.type === "question" ? "🎓 Tutor" : item.type === "answer" ? "🎤 Tu" : "📝 Valutazione"}
                {item.type !== "answer" && i === exchanges.length - 1 && (isLoadingVoice || isSpeaking) && (
                  isLoadingVoice
                    ? <Loader2 className="w-3 h-3 animate-spin text-tertiary" />
                    : <Volume2 className="w-3 h-3 text-tertiary animate-pulse" />
                )}
              </span>
            </div>
            <div className="body-medium prose prose-sm max-w-none prose-p:my-1.5 prose-strong:font-semibold prose-strong:text-foreground prose-em:italic prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="my-1.5 whitespace-pre-wrap">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  h1: ({ children }) => <h3 className="font-display font-medium text-base mt-2 mb-1">{children}</h3>,
                  h2: ({ children }) => <h4 className="font-display font-medium text-base mt-2 mb-1">{children}</h4>,
                  h3: ({ children }) => <h5 className="font-display font-medium mt-2 mb-1">{children}</h5>,
                  code: ({ children }) => (
                    <code className="bg-surface-container-highest px-1.5 py-0.5 rounded-lg text-xs font-mono">{children}</code>
                  ),
                }}
              >
                {item.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {phase === "evaluating" && (
          <div className="flex justify-center py-4">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Voice input */}
      {phase === "question" && (
        <div className="px-5 pb-5 pt-3 space-y-3 bg-white/70 dark:bg-black/60 backdrop-blur-md border-t-[0.5px] border-white/40 dark:border-white/10">
          {transcript && (
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-black/40 backdrop-blur-md border-[0.5px] border-white/40 dark:border-white/10 text-foreground body-small max-h-24 overflow-y-auto">
              {transcript}
            </div>
          )}
          <div className="flex items-center gap-3">
            {hasSpeech && (
              <button
                onClick={toggleListening}
                disabled={isSpeaking || isLoadingVoice}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-level-2 disabled:opacity-50 disabled:cursor-not-allowed",
                  isListening
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft scale-110"
                    : "bg-tertiary text-tertiary-foreground hover:scale-105"
                )}
                title={isSpeaking || isLoadingVoice ? "Microfono disattivato mentre il tutor parla" : undefined}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            )}
            <Button
              onClick={submitAnswer}
              disabled={!transcript.trim()}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground shadow-level-1"
            >
              {mode === "structured" ? "Invia risposta" : "Ho finito"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
