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
 * 🌿 P21c ERGA OPAL: la sala-lezione si è fatta sobria.
 * Via il tasto di vetro, via XP e coriandoli, via il fondo a puntini:
 * restano i contenuti, la barra a segmenti e i box-pastello nel testo
 * (DECISIONE DEL CAPO: i pastelli restano — ma ora esistono anche in
 * versione notturna, così sul nero non accecano).
 * La LOGICA (step, quiz, figure, prefetch, assistente) è intatta.
 */

// 🌲 P24 × MONOCROMO — i box d'evidenziazione usano l'ACCENTO MATERIA
// (--subject-accent): tinta chiara di sfondo + bordo al 30%. Gli emoji
// del contenuto restano il marcatore semantico.
function CalloutBlockquote({ children }: { children?: React.ReactNode }) {
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
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4 animate-fade-up">
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
