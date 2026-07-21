import { useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, BookOpen, ChevronDown, Zap, Check, ImageOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { ChatSource, AgentAction } from "@/lib/chatProtocol";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
    sources?: ChatSource[];
    actions?: AgentAction[];
    interrupted?: boolean;
  };
  onExecuteAction?: (messageId: string, index: number, action: AgentAction) => void;
  executedActions?: Record<string, boolean>;
}

/** 📎 Una fonte citata: chip piccola che si espande col brano esatto. */
function SourceChip({ source }: { source: ChatSource }) {
  const [open, setOpen] = useState(false);
  const pageLabel = source.pageStart != null
    ? `pag. ${source.pageStart}${source.pageEnd && source.pageEnd !== source.pageStart ? `-${source.pageEnd}` : ""}`
    : null;
  return (
    <div className="rounded-xl overflow-hidden bg-surface-container-highest/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left hover:bg-surface-container-highest transition-colors"
      >
        <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
        <span className="flex-1 min-w-0 truncate text-[11px] font-medium text-foreground/80">
          {source.file}
          {pageLabel && <span className="text-muted-foreground"> · {pageLabel}</span>}
        </span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <p className="px-2.5 pb-2 text-[11px] leading-relaxed text-muted-foreground italic border-t border-border/40 pt-1.5 animate-fade-up">
          “{source.excerpt}”
        </p>
      )}
    </div>
  );
}

/** 🤖 La carta di un'azione proposta dall'agente: propone lui, approvi tu. */
function ActionCard({
  action,
  executed,
  onExecute,
}: {
  action: AgentAction;
  executed: boolean;
  onExecute: () => void;
}) {
  const { t } = useTranslation();
  const labels: Record<string, { title: string; cta: string }> = {
    add_event: { title: t("chat.actions.addEvent"), cta: t("chat.actions.confirm") },
    propose_review: { title: t("chat.actions.proposeReview"), cta: t("chat.actions.confirm") },
    add_goal: { title: t("chat.actions.addGoal"), cta: t("chat.actions.confirm") },
    goto_quiz: { title: t("chat.actions.gotoQuiz"), cta: t("chat.actions.go") },
    goto_lesson: { title: t("chat.actions.gotoLesson"), cta: t("chat.actions.go") },
  };
  const label = labels[action.kind] || { title: action.kind, cta: t("chat.actions.confirm") };
  const detail = [action.title, action.subject, action.date, action.query]
    .filter(Boolean)
    .map(String)
    .join(" · ");
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary-container/70 border border-secondary/20">
      <div className="w-7 h-7 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0">
        {executed ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground">{label.title}</p>
        {detail && <p className="text-[11px] text-muted-foreground truncate">{detail}</p>}
      </div>
      {!executed && (
        <button
          onClick={onExecute}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:shadow-level-1 active:scale-95 transition-all"
        >
          {label.cta}
        </button>
      )}
    </div>
  );
}

export function ChatMessage({ message, onExecuteAction, executedActions }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 animate-fade-up",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "flex gap-3 w-full",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {!isUser && (
          <div className="w-9 h-9 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-level-1">
            <Brain className="w-4 h-4 text-white" />
          </div>
        )}

        <div
          className={cn(
            "max-w-[85%] overflow-hidden transition-all duration-300 ease-m3-emphasized",
            isUser
              ? "gradient-cool text-white rounded-3xl rounded-br-lg shadow-level-2"
              : "bg-surface-container-high text-foreground rounded-3xl rounded-bl-lg shadow-level-1"
          )}
        >
          {message.imageUrl && (
            <div className="p-2.5 pb-0">
              <img
                src={message.imageUrl}
                alt="Immagine allegata al messaggio in chat"
                className="max-w-full max-h-52 rounded-2xl object-cover shadow-level-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {!isUser && (
                <p className="text-[10px] text-muted-foreground/80 mt-1 px-1">
                  <ImageOff className="hidden" />
                  {t("chat.imageCredit")}
                </p>
              )}
            </div>
          )}

          <div className={cn("px-4 py-3", message.imageUrl && "pt-2")}>
            {isUser ? (
              <p className="body-medium leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            ) : (
              <div className="body-medium leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-headings:font-display prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:text-foreground prose-em:text-foreground/90 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="my-1.5">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    h1: ({ children }) => <h3 className="font-display font-medium text-base mt-3 mb-1">{children}</h3>,
                    h2: ({ children }) => <h4 className="font-display font-medium text-base mt-2 mb-1">{children}</h4>,
                    h3: ({ children }) => <h5 className="font-display font-medium mt-2 mb-1">{children}</h5>,
                    code: ({ children }) => (
                      <code className="bg-surface-container-highest px-1.5 py-0.5 rounded-lg text-xs font-mono">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-surface-container-highest p-3 rounded-2xl overflow-x-auto my-2 text-xs">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-3 border-primary pl-3 my-2 italic text-muted-foreground">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {message.interrupted && !isUser && (
              <p className="mt-2 text-[11px] text-warning flex items-center gap-1">
                ⚠️ {t("chat.interrupted")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 📎 Fonti in piccolino, espandibili (P7) */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="ml-12 flex flex-col gap-1 max-w-[75%]">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium px-1">
            {t("chat.sources.title")}
          </p>
          {message.sources.map((s, i) => (
            <SourceChip key={`${s.file}-${s.pageStart ?? "full"}-${i}`} source={s} />
          ))}
        </div>
      )}

      {/* 🤖 Azioni proposte dall'agente (con conferma) */}
      {!isUser && message.actions && message.actions.length > 0 && onExecuteAction && (
        <div className="ml-12 flex flex-col gap-1.5 max-w-[75%]">
          {message.actions.map((a, i) => (
            <ActionCard
              key={`${message.id}-action-${i}`}
              action={a}
              executed={!!executedActions?.[`${message.id}:${i}`]}
              onExecute={() => onExecuteAction(message.id, i, a)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
