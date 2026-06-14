import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, RotateCcw, BookOpen, MessageSquare, Play, Square, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Mode = "select" | "structured" | "free";
type Phase = "idle" | "question" | "listening" | "evaluating" | "feedback";

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
  audio.onended = () => {
    if (currentObjectUrl === url) {
      URL.revokeObjectURL(url);
      currentObjectUrl = null;
    }
    if (currentAudio === audio) currentAudio = null;
    onEnd?.();
  };
  audio.onplay = () => onStart?.();
  await audio.play();
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (final) setTranscript(prev => prev + " " + final);
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
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

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
    }
  }, [ttsEnabled]);

  const startInterrogazione = async (courseId: string, selectedMode: "structured" | "free") => {
    setSelectedCourse(courseId);
    setMode(selectedMode);
    setExchanges([]);
    setScore(null);
    setQuestionCount(0);

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
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    stopSpeaking();
    const answer = transcript.trim();
    if (!answer) {
      toast({ title: "Rispondi prima!", description: "Dì qualcosa prima di inviare", variant: "destructive" });
      return;
    }

    setExchanges(prev => [...prev, { type: "answer", content: answer }]);
    setPhase("evaluating");
    setTranscript("");

    try {
      const action = mode === "structured" ? "evaluate" : "evaluate_free";
      const data = await callInterrogazione(action, {
        question: currentQuestion,
        answer,
        history: exchanges,
        questionNumber: questionCount,
      });

      setExchanges(prev => [...prev, { type: "feedback", content: data.feedback }]);
      speakIfEnabled(data.feedback);

      if (data.score !== undefined) setScore(data.score);

      if (data.nextQuestion && mode === "structured") {
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setExchanges(prev => [...prev, { type: "question", content: data.nextQuestion }]);
          setQuestionCount(prev => prev + 1);
          setPhase("question");
          speakIfEnabled(data.nextQuestion);
        }, 2000);
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
    setMode("select");
    setPhase("idle");
    setExchanges([]);
    setScore(null);
    setTranscript("");
    setQuestionCount(0);
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
                onClick={() => selectedCourse && startInterrogazione(selectedCourse, "structured")}
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

  // Active interrogation
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white/70 dark:bg-black/60 backdrop-blur-md border-b-[0.5px] border-white/40 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="label-large font-semibold tracking-tight text-foreground">
            {mode === "structured" ? `Domanda ${questionCount}` : "Esposizione libera"}
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
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-level-2",
                  isListening
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft scale-110"
                    : "bg-tertiary text-tertiary-foreground hover:scale-105"
                )}
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
