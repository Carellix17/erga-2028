import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dumbbell, Send, Lightbulb, CheckCircle2, XCircle, Eye, MessageCircle, RotateCcw, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LessonMarkdown } from "@/components/studio/LessonMarkdown";
import { fetchContextSubjectInfo } from "@/lib/subjectFamily";
import { checkAnswer, type ScientificExercise } from "../../../supabase/functions/_shared/scientificGym";
import { cn } from "@/lib/utils";

/**
 * 🏋️ PERCORSI 2.0 — LA PALESTRA SCIENTIFICA.
 *
 * Esercizi numerici con verifica immediata, suggerimenti progressivi,
 * soluzione passo-passo e chat socratica. Visibile solo per i percorsi
 * di matematica, fisica e chimica (la card si mostra solo in Studio per
 * i corsi scientifici; qui resta la guardia di sicurezza).
 */

type Stage = "idle" | "generating" | "playing" | "done";
type Outcome = "correct" | "wrong" | "solution";

interface SocraticTurn {
  role: "user" | "assistant";
  content: string;
}

async function gymFetch(body: Record<string, unknown>): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { user } } = await supabase.auth.getUser();
  return fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scientific-gym`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ userId: user?.id, ...body }),
  });
}

/** "12,5" → 12.5 (gli studenti italiani usano la virgola). */
function parseNumber(value: string): number {
  const cleaned = value.trim().replace(",", ".");
  const n = Number(cleaned);
  return cleaned !== "" && Number.isFinite(n) ? n : Number.NaN;
}

export function ScientificGymView({ contextId, contextName }: { contextId?: string | null; contextName?: string | null }) {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>("idle");
  const [family, setFamily] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState(false);
  const [moduleTitles, setModuleTitles] = useState<string[] | null>(null);
  const [moduleIndex, setModuleIndex] = useState<number | null>(null);
  const [exercises, setExercises] = useState<ScientificExercise[]>([]);
  const [idx, setIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<null | "correct" | "wrong">(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [genError, setGenError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [turns, setTurns] = useState<SocraticTurn[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const ex = exercises[idx];

  useEffect(() => {
    let alive = true;
    setFamily(null);
    setFamilyError(false);
    setModuleTitles(null);
    if (!contextId) return;
    fetchContextSubjectInfo(contextId)
      .then((info) => {
        if (!alive) return;
        setFamily(info.subject_family);
        setModuleTitles(info.module_titles);
      })
      .catch(() => alive && setFamilyError(true));
    return () => { alive = false; };
  }, [contextId]);

  useEffect(() => {
    // Il guard assorbe gli ambienti senza scrollIntoView (es. i test in jsdom).
    if (typeof chatBottomRef.current?.scrollIntoView === "function") {
      chatBottomRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [turns, chatLoading]);

  const score = useMemo(() => outcomes.filter((o) => o === "correct").length, [outcomes]);

  const resetExerciseState = () => {
    setValue("");
    setFeedback(null);
    setHintsShown(0);
    setSolutionShown(false);
    setTurns([]);
  };

  const generate = async () => {
    if (!contextId) return;
    setStage("generating");
    setGenError(false);
    try {
      const resp = await gymFetch({
        action: "generate",
        contextId,
        moduleIndex,
        count: 5,
        language: currentLanguage(),
      });
      const data = await resp.json();
      if (!resp.ok || !data.exercises?.length) throw new Error(data.error || "generation failed");
      setExercises(data.exercises as ScientificExercise[]);
      setOutcomes(new Array(data.exercises.length).fill("wrong"));
      setIdx(0);
      resetExerciseState();
      setStage("playing");
    } catch {
      setGenError(true);
      setStage("idle");
    }
  };

  const verify = () => {
    if (!ex) return;
    const n = parseNumber(value);
    if (Number.isNaN(n)) return;
    const ok = checkAnswer(n, ex);
    setFeedback(ok ? "correct" : "wrong");
    if (ok) {
      setOutcomes((prev) => {
        const next = [...prev];
        if (!solutionShown) next[idx] = "correct";
        return next;
      });
    }
  };

  const showHint = () => setHintsShown((h) => Math.min(h + 1, ex?.hints.length ?? 0));

  const showSolution = () => {
    setSolutionShown(true);
    setOutcomes((prev) => {
      const next = [...prev];
      if (next[idx] !== "correct") next[idx] = "solution";
      return next;
    });
  };

  const next = () => {
    if (idx + 1 < exercises.length) {
      setIdx(idx + 1);
      resetExerciseState();
    } else {
      setStage("done");
      // Il punteggio alimenta l'Esagono (area Applicazione), come gli altri esercizi.
      supabase.auth.getSession().then(({ data }) => {
        const authToken = data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        supabase.auth.getUser().then(({ data: ud }) => {
          if (!ud.user) return;
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cognitive-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({
              action: "updateFromPerformance",
              userId: ud.user.id,
              correct: outcomes.filter((o) => o === "correct").length,
              total: exercises.length,
              area: "APP",
            }),
          }).catch(() => {});
        });
      });
    }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !ex || chatLoading) return;
    setChatInput("");
    const history = [...turns, { role: "user" as const, content: text }];
    setTurns(history);
    setChatLoading(true);
    try {
      const resp = await gymFetch({
        action: "socratic",
        contextId,
        exercise: { text: ex.text, answerUnit: ex.answerUnit, steps: ex.steps },
        history: history.map(({ role, content }) => ({ role, content })),
        studentAnswer: value || undefined,
        solved: outcomes[idx] === "correct",
        language: currentLanguage(),
      });
      const data = await resp.json();
      if (!resp.ok || typeof data.reply !== "string") throw new Error("socratic failed");
      setTurns([...history, { role: "assistant", content: data.reply }]);
    } catch {
      setTurns([...history, { role: "assistant", content: t("gym.tutorError") }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── GUARDE ────────────────────────────────────────────────────────────────
  if (!contextId) return null;
  if (familyError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
        {t("gym.unavailable")}
      </div>
    );
  }
  if (family !== null && family !== "scientifiche") {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
        {t("gym.onlyScientific")}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5 pb-[env(safe-area-inset-bottom)] sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Intestazione */}
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2.5 text-brand-deep">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="title-large text-foreground">{t("gym.title")}</h2>
            <p className="body-medium text-muted-foreground">
              {contextName ? `${contextName} · ` : ""}{t("gym.subtitle")}
            </p>
          </div>
        </div>

        {/* Scegli il terreno di allenamento */}
        {stage === "idle" && (
          <div className="space-y-4">
            {moduleTitles && moduleTitles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setModuleIndex(null)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    moduleIndex === null
                      ? "border-primary bg-primary/10 text-brand-deep"
                      : "border-outline-variant text-muted-foreground hover:bg-surface-container",
                  )}
                >
                  {t("gym.allModules")}
                </button>
                {moduleTitles.map((title, i) => (
                  <button
                    key={i}
                    onClick={() => setModuleIndex(i)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                      moduleIndex === i
                        ? "border-primary bg-primary/10 text-brand-deep"
                        : "border-outline-variant text-muted-foreground hover:bg-surface-container",
                    )}
                  >
                    {t("gym.module", { n: i + 1 })} · {title.length > 24 ? title.slice(0, 24) + "…" : title}
                  </button>
                ))}
              </div>
            )}

            {genError && (
              <p className="rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                {t("gym.error")}
              </p>
            )}

            <Button onClick={generate} className="h-12 w-full rounded-2xl text-base">
              {t("gym.generate")}
            </Button>
          </div>
        )}

        {/* Preparazione */}
        {stage === "generating" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-outline-variant bg-surface-container-lowest p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-deep" />
            <p className="title-medium text-foreground">{t("gym.generating")}</p>
            <p className="body-medium text-muted-foreground">{t("gym.generatingNote")}</p>
          </div>
        )}

        {/* Allenamento */}
        {stage === "playing" && ex && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="label-medium text-muted-foreground">
                {t("gym.exerciseN", { current: idx + 1, total: exercises.length })}
              </p>
              <span className="rounded-full bg-surface-container px-3 py-1 font-mono text-xs text-muted-foreground">
                {score} ✓
              </span>
            </div>

            <div className="rounded-2xl border-2 border-outline-variant bg-surface-container-lowest p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-container px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {ex.kind === "problem" ? t("gym.problem") : t("gym.drill")}
                </span>
                <span className="text-xs text-muted-foreground">{ex.topic}</span>
              </div>
              <div className="body-large text-foreground">
                <LessonMarkdown>{ex.text}</LessonMarkdown>
              </div>

              {/* Suggerimenti */}
              {hintsShown > 0 && (
                <div className="mt-3 space-y-2">
                  {ex.hints.slice(0, hintsShown).map((hint, i) => (
                    <p key={i} className="rounded-xl bg-amber-500/10 p-3 text-sm text-foreground">
                      💡 {hint}
                    </p>
                  ))}
                </div>
              )}

              {/* Soluzione */}
              {solutionShown && (
                <div className="mt-4 rounded-2xl border-2 border-outline-variant bg-surface-container p-4">
                  <p className="mb-2 flex items-center gap-1.5 title-small text-foreground">
                    <Eye className="w-4 h-4" /> {t("gym.solution")}
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
                    {ex.steps.map((step, i) => (
                      <li key={i}><LessonMarkdown components={{ p: "span" }}>{step}</LessonMarkdown></li>
                    ))}
                  </ol>
                  <p className="mt-3 font-mono text-sm text-foreground">
                    → {ex.answerValue} {ex.answerUnit}
                  </p>
                </div>
              )}
            </div>

            {/* Verifica */}
            {feedback !== "correct" && !solutionShown && (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setFeedback(null); }}
                    onKeyDown={(e) => e.key === "Enter" && verify()}
                    inputMode="decimal"
                    placeholder={t("gym.answerLabel")}
                    className="h-12 rounded-2xl text-center font-mono text-base"
                    aria-label={t("gym.answerLabel")}
                  />
                </div>
                <span className="font-mono text-sm text-muted-foreground">{ex.answerUnit}</span>
                <Button onClick={verify} disabled={!value.trim()} className="h-12 rounded-2xl">
                  {t("gym.check")}
                </Button>
              </div>
            )}

            {feedback === "correct" && (
              <p className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 p-3.5 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> {t("gym.correct")}
              </p>
            )}
            {feedback === "wrong" && (
              <p className="flex items-center gap-2 rounded-2xl bg-rose-500/10 p-3.5 text-foreground">
                <XCircle className="w-5 h-5 text-rose-500" /> {t("gym.wrong")}
              </p>
            )}

            {/* Azioni secondarie */}
            <div className="flex flex-wrap gap-2">
              {feedback !== "correct" && !solutionShown && ex.hints.length > 0 && hintsShown < ex.hints.length && (
                <Button variant="outline" onClick={showHint} className="rounded-xl">
                  <Lightbulb className="w-4 h-4 mr-1.5" /> {t("gym.hint")}
                </Button>
              )}
              {feedback !== "correct" && !solutionShown && (
                <Button
                  variant="outline"
                  onClick={() => { setChatOpen(true); if (turns.length === 0) setTurns([{ role: "assistant", content: t("gym.tutorIntro") }]); }}
                  className="rounded-xl"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" /> {t("gym.askTutor")}
                </Button>
              )}
              {!solutionShown && feedback !== "correct" && (
                <Button variant="ghost" onClick={showSolution} className="rounded-xl text-muted-foreground">
                  <Eye className="w-4 h-4 mr-1.5" /> {t("gym.showSolution")}
                </Button>
              )}
            </div>

            {(feedback === "correct" || solutionShown) && (
              <Button onClick={next} className="h-12 w-full rounded-2xl">
                {idx + 1 < exercises.length ? t("gym.next") : t("gym.finish")}
              </Button>
            )}
          </div>
        )}

        {/* Risultato */}
        {stage === "done" && (
          <div className="space-y-4 rounded-2xl border-2 border-outline-variant bg-surface-container-lowest p-6 text-center">
            <p className="title-large text-foreground">{t("gym.doneTitle")}</p>
            <p className="font-mono text-3xl text-brand-deep">
              {score}/{exercises.length}
            </p>
            <p className="body-medium text-muted-foreground">{t("gym.doneScore", { correct: score, total: exercises.length })}</p>
            <p className="text-sm text-muted-foreground">{t("gym.doneNote")}</p>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button onClick={generate} className="flex-1 rounded-2xl">
                <RotateCcw className="w-4 h-4 mr-2" /> {t("gym.newSet")}
              </Button>
              <Button variant="outline" onClick={() => setStage("idle")} className="flex-1 rounded-2xl">
                {t("gym.changeModule")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Chat socratica */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2 text-left">
              <MessageCircle className="w-4 h-4 text-brand-deep" /> {t("gym.tutorTitle")}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-2">
            {turns.map((turn, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed",
                  turn.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-surface-container text-foreground",
                )}
              >
                <LessonMarkdown components={{ p: "span" }}>{turn.content}</LessonMarkdown>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("gym.tutorThinking")}
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-outline-variant p-3">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder={t("gym.tutorPlaceholder")}
              className="rounded-xl"
              aria-label={t("gym.tutorPlaceholder")}
            />
            <Button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} size="icon" className="rounded-xl" aria-label={t("gym.send")}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
