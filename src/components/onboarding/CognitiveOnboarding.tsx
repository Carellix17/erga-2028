import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, ChevronRight, ChevronLeft, Search, Check } from "lucide-react";
import { COGNITIVE_QUESTIONS, INSTITUTES_LIST, computeAreaScores } from "@/lib/cognitiveQuestions";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  onCompleted?: () => void;
  /** When true, shows a small "skip" button (used when re-taking from profile). */
  allowClose?: boolean;
  onClose?: () => void;
}

type SlideKind = "intro" | "nome" | "eta" | "istituto" | "question" | "saving" | "done";

export function CognitiveOnboarding({ onCompleted, allowClose, onClose }: Props) {
  const { save } = useCognitiveProfile();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [nome, setNome] = useState("");
  const [eta, setEta] = useState<string>("");
  const [istituto, setIstituto] = useState<string>("");
  const [istitutoCustom, setIstitutoCustom] = useState("");
  const [istitutoSearch, setIstitutoSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  const slides: SlideKind[] = useMemo(() => {
    return [
      "intro",
      "nome",
      "eta",
      "istituto",
      ...COGNITIVE_QUESTIONS.map(() => "question" as const),
      "saving",
      "done",
    ];
  }, []);

  const totalQuestions = COGNITIVE_QUESTIONS.length;
  const questionIndex = step - 4; // first question starts at step 4
  const progress = Math.min(100, Math.round(((step) / (slides.length - 2)) * 100));

  const goNext = () => setStep((s) => Math.min(slides.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSave = async () => {
    setIsSaving(true);
    const scores = computeAreaScores(answers);
    const istitutoFinal =
      istituto === 'Altro (Inserisci manualmente)' ? istitutoCustom.trim() : istituto;
    const ok = await save({
      nome: nome.trim() || null,
      eta: eta ? parseInt(eta, 10) : null,
      istituto: istitutoFinal || null,
      log_score: scores.LOG,
      mem_score: scores.MEM,
      foc_score: scores.FOC,
      voc_score: scores.VOC,
      ans_score: scores.ANS,
      app_score: scores.APP,
    });
    setIsSaving(false);
    if (ok) {
      goNext();
      setTimeout(() => onCompleted?.(), 1200);
    } else {
      toast({ title: "Errore", description: "Impossibile salvare il profilo. Riprova.", variant: "destructive" });
    }
  };

  const currentSlide = slides[step];

  // Triggered automatically when we reach the "saving" slide
  if (currentSlide === "saving" && !isSaving) {
    // fire-and-forget; React will re-render
    void handleSave();
  }

  const filteredInstitutes = INSTITUTES_LIST.filter((i) =>
    i.toLowerCase().includes(istitutoSearch.toLowerCase())
  );

  const canProceed = (() => {
    switch (currentSlide) {
      case "nome": return nome.trim().length >= 1;
      case "eta": return !!eta && parseInt(eta, 10) >= 8 && parseInt(eta, 10) <= 99;
      case "istituto":
        if (!istituto) return false;
        if (istituto === 'Altro (Inserisci manualmente)') return istitutoCustom.trim().length >= 2;
        return true;
      case "question": {
        const q = COGNITIVE_QUESTIONS[questionIndex];
        return q && answers[q.id] !== undefined;
      }
      default: return true;
    }
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-background via-primary/5 to-tertiary/10 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          {/* Progress + close */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-1.5 rounded-full bg-foreground/10 overflow-hidden backdrop-blur-md">
              <div
                className="h-full bg-gradient-to-r from-primary to-tertiary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {allowClose && (
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                Chiudi
              </button>
            )}
          </div>

          <div className="bg-white/70 dark:bg-black/40 backdrop-blur-xl border-[0.5px] border-white/40 dark:border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] p-6 sm:p-8 transition-all duration-500 ease-out">

            {currentSlide === "intro" && (
              <div className="text-center space-y-6 animate-fade-up">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center shadow-level-2">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Costruiamo il tuo Esagono Cognitivo</h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    18 domande veloci per capire come studi, ricordi e ti esponi.
                    Erga userà i risultati per personalizzare ogni lezione, esercizio e interrogazione su di te.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-muted-foreground pt-2">
                  {["LOGICA", "MEMORIA", "FOCUS", "LESSICO", "CALMA", "PRATICA"].map((s) => (
                    <div key={s} className="rounded-2xl bg-foreground/[0.04] py-2">{s}</div>
                  ))}
                </div>
                <Button
                  onClick={goNext}
                  size="lg"
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-tertiary border-0 shadow-level-2 hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 ease-in-out"
                >
                  Inizia
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            )}

            {currentSlide === "nome" && (
              <SlideShell title="Come preferisci che ti chiami?" subtitle="Erga ti chiamerà per nome durante lo studio.">
                <Input
                  autoFocus
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Il tuo nome o nickname"
                  className="h-14 rounded-2xl bg-foreground/[0.04] border-0 text-base"
                  maxLength={40}
                />
              </SlideShell>
            )}

            {currentSlide === "eta" && (
              <SlideShell title="Quanti anni hai?" subtitle="Ci aiuta a calibrare il tono e gli esempi.">
                <select
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="w-full h-14 rounded-2xl bg-foreground/[0.04] border-0 text-base px-4 outline-none"
                >
                  <option value="">Seleziona la tua età</option>
                  {Array.from({ length: 28 }, (_, i) => i + 13).map((n) => (
                    <option key={n} value={n}>{n} anni</option>
                  ))}
                </select>
              </SlideShell>
            )}

            {currentSlide === "istituto" && (
              <SlideShell title="Che scuola o università frequenti?" subtitle="Cerca dal menu, oppure scegli 'Altro'.">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={istitutoSearch}
                      onChange={(e) => setIstitutoSearch(e.target.value)}
                      placeholder="Cerca il tuo istituto…"
                      className="h-12 pl-9 rounded-2xl bg-foreground/[0.04] border-0"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-2xl">
                    {filteredInstitutes.length === 0 && (
                      <p className="text-sm text-muted-foreground p-3">Nessun risultato. Scegli "Altro".</p>
                    )}
                    {filteredInstitutes.map((opt) => {
                      const active = istituto === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setIstituto(opt)}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out flex items-center justify-between gap-2 border-[0.5px]",
                            active
                              ? "bg-primary/15 border-primary/40 text-foreground"
                              : "bg-foreground/[0.03] border-transparent hover:bg-foreground/[0.06]"
                          )}
                        >
                          <span>{opt}</span>
                          {active && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {istituto === 'Altro (Inserisci manualmente)' && (
                    <Input
                      autoFocus
                      value={istitutoCustom}
                      onChange={(e) => setIstitutoCustom(e.target.value)}
                      placeholder="Inserisci il nome del tuo istituto"
                      className="h-12 rounded-2xl bg-foreground/[0.04] border-0"
                      maxLength={120}
                    />
                  )}
                </div>
              </SlideShell>
            )}

            {currentSlide === "question" && (() => {
              const q = COGNITIVE_QUESTIONS[questionIndex];
              const sel = answers[q.id];
              return (
                <SlideShell
                  title={q.question}
                  subtitle={`Domanda ${questionIndex + 1} di ${totalQuestions} · Area ${q.area}`}
                >
                  <div className="space-y-2.5">
                    {q.options.map((opt, i) => {
                      const active = sel === opt.points;
                      return (
                        <button
                          key={i}
                          onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt.points }))}
                          className={cn(
                            "w-full text-left px-4 py-4 rounded-2xl text-sm font-medium transition-all duration-300 ease-in-out border-[0.5px] flex items-start gap-3",
                            active
                              ? "bg-primary/15 border-primary/40 text-foreground scale-[1.01]"
                              : "bg-foreground/[0.03] border-transparent hover:bg-foreground/[0.06] hover:scale-[1.005]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors",
                            active ? "border-primary bg-primary" : "border-foreground/30"
                          )}>
                            {active && <Check className="w-3 h-3 text-primary-foreground m-auto mt-0.5" />}
                          </div>
                          <span className="leading-snug">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </SlideShell>
              );
            })()}

            {currentSlide === "saving" && (
              <div className="text-center space-y-5 py-10 animate-fade-up">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="text-base font-medium">Calcolo il tuo Esagono Cognitivo…</p>
              </div>
            )}

            {currentSlide === "done" && (
              <div className="text-center space-y-5 py-8 animate-fade-up">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-success/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Esagono creato ✨</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Da ora Erga adatterà ogni contenuto su di te.
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            {!["intro", "saving", "done"].includes(currentSlide) && (
              <div className="flex items-center justify-between gap-3 mt-7">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  disabled={step <= 1}
                  className="rounded-2xl text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Indietro
                </Button>
                <Button
                  onClick={goNext}
                  disabled={!canProceed}
                  size="lg"
                  className="rounded-2xl h-12 px-6 bg-gradient-to-r from-primary to-tertiary border-0 shadow-level-1 hover:scale-[1.02] active:scale-[0.97] transition-all duration-300 ease-in-out"
                >
                  {currentSlide === "question" && questionIndex === totalQuestions - 1 ? "Calcola Esagono" : "Avanti"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        {subtitle && <p className="text-[11px] font-semibold tracking-wider text-primary uppercase mb-2">{subtitle}</p>}
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}