import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { currentLanguage } from "@/i18n";

// ── Tipi ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LessonChatProps {
  lessonTitle: string;
  lessonContent: string; // concept + explanation + example concatenati
}

// ── Componente ────────────────────────────────────────────────────────────────

export function LessonChat({ lessonTitle, lessonContent }: LessonChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Ciao! Sono qui per aiutarti a capire meglio **${lessonTitle}**. Hai domande su questa lezione?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: String(Date.now()), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const apiMessages = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

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
            lessonContent,
            lessonTitle,
            language: currentLanguage(),
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Errore ${response.status}`);
      }

      // Streaming
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantText = "";
      let textBuffer = "";
      const assistantId = String(Date.now() + 1);

      const updateMsg = (text: string) => {
        assistantText = text;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === assistantId) {
            return prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m));
          }
          return [...prev, { id: assistantId, role: "assistant", content: assistantText }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIdx);
          textBuffer = textBuffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) updateMsg(assistantText + delta);
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "assistant",
          content: "Mi dispiace, si è verificato un errore. Riprova tra qualche secondo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, lessonContent, lessonTitle]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* FAB — bottone per aprire la chat */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-24 right-4 z-40",
            "w-14 h-14 rounded-full shadow-level-3",
            "bg-primary text-primary-foreground",
            "flex items-center justify-center",
            "hover:shadow-level-4 active:scale-95 transition-all duration-200",
            "animate-fade-up"
          )}
          aria-label="Apri chat lezione"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Pannello chat */}
      {open && (
        <div
          className={cn(
            "fixed bottom-20 right-3 z-50",
            "w-[min(360px,calc(100vw-24px))]",
            "h-[min(480px,calc(100vh-180px))]",
            "rounded-2xl shadow-level-4 border border-border",
            "bg-surface flex flex-col",
            "animate-fade-up"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary-container rounded-t-2xl flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="label-medium font-semibold text-foreground truncate">Tutor AI</p>
              <p className="label-small text-muted-foreground truncate">{lessonTitle}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Chiudi chat"
            >
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messaggi */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 animate-fade-up",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    msg.role === "assistant"
                      ? "bg-primary-container"
                      : "bg-secondary-container"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-secondary" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-surface-container-high text-foreground rounded-bl-md"
                      : "bg-primary text-primary-foreground rounded-br-md"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-3 py-2.5">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <div
                        key={delay}
                        className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-border flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Fai una domanda sulla lezione..."
                rows={1}
                disabled={isLoading}
                className={cn(
                  "flex-1 resize-none rounded-xl px-3 py-2 text-sm",
                  "bg-surface-container border border-border",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30",
                  "placeholder:text-muted-foreground",
                  "max-h-24 overflow-y-auto",
                  "disabled:opacity-50"
                )}
                style={{ minHeight: "40px" }}
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center label-small text-muted-foreground mt-1.5 text-xs">
              Enter per inviare · Shift+Enter per andare a capo
            </p>
          </div>
        </div>
      )}
    </>
  );
}
