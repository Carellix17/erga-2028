import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { ChatHistory, Conversation } from "./ChatHistory";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { History, X, BookOpen, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { currentLanguage } from "@/i18n";
import { edgeFetch } from "@/lib/edgeFetch";
import { useQueryClient } from "@tanstack/react-query";
import { studyEventsKeys } from "@/hooks/useStudyEvents";
import {
  cleanAssistantText,
  parseSpecialEvent,
  ChatSource,
  AgentAction,
} from "@/lib/chatProtocol";

interface ChatViewProps { hasFiles: boolean; onUploadClick: () => void; }

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  sources?: ChatSource[];
  actions?: AgentAction[];
  interrupted?: boolean;
};

interface TopicDoc { id: string; file_name: string; }

/** La sentinella anti-pianto (P7): se il tubo tace oltre questo tempo, chiudiamo noi. */
const STALL_TIMEOUT_MS = 45000;

export function ChatView({ hasFiles, onUploadClick }: ChatViewProps) {
  const { t } = useTranslation();
  const welcomeMessage: Message = useMemo(() => ({
    id: "welcome", role: "assistant",
    content: t("chat.welcome"),
  }), [t]);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  // 🚪 Il diario del Piano si scrive SOLO passando dal portinaio save-event:
  // stessa porta per tutti, così gli eventi dell'agente compaiono davvero in Piano.
  const queryClient = useQueryClient();

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load conversations list (chat generali + chat d'argomento)
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, updated_at, context_id, topic_title, system_prompt")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data as Conversation[]);
  }, [currentUser]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // I documenti disponibili diventano gli "argomenti" (stile NotebookLM)
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const { data } = await supabase
        .from("study_contexts")
        .select("id, file_name")
        .order("created_at", { ascending: false })
        .limit(12);
      if (data) setTopics(data as TopicDoc[]);
    })();
  }, [currentUser]);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, image_url, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const loaded: Message[] = data.map((m: { id: string; role: string; content: string; image_url: string | null }) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        imageUrl: m.image_url || undefined,
      }));
      setMessages([welcomeMessage, ...loaded]);
    } else {
      setMessages([welcomeMessage]);
    }
    setActiveConversationId(conversationId);
    // Il selettore d'argomento segue la conversazione aperta (niente più
    // "ultimo argomento appiccicato": l'argomento è UNA PROPRIETÀ della chat).
    const conv = conversations.find((c) => c.id === conversationId);
    setActiveTopicId(conv?.context_id ?? null);
    setShowHistory(false);
  }, [conversations, welcomeMessage]);

  const handleNewChat = () => {
    setMessages([welcomeMessage]);
    setActiveConversationId(null);
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await supabase.from("chat_conversations").delete().eq("id", id);
    if (activeConversationId === id) handleNewChat();
    loadConversations();
  };

  // Seleziona argomento dal selettore: apre la sua chat se esiste già,
  // altrimenti prepara una chat nuova che nascerà d'argomento al primo invio.
  const handleSelectTopic = (topicId: string | null) => {
    if (topicId === activeTopicId && !activeConversationId) return;
    setActiveTopicId(topicId);
    const existing = conversations.find((c) =>
      topicId === null ? !c.context_id : c.context_id === topicId
    );
    if (existing) {
      loadConversation(existing.id);
    } else {
      setMessages([welcomeMessage]);
      setActiveConversationId(null);
    }
  };

  const activeTopicName = activeTopicId
    ? topics.find((tp) => tp.id === activeTopicId)?.file_name || null
    : null;

  // Generate title from first user message
  const generateTitle = (content: string) => {
    const clean = content.replace(/\s+/g, " ").trim();
    return clean.length > 40 ? clean.slice(0, 40) + "…" : clean;
  };

  // Save a message to DB
  const saveMessage = async (conversationId: string, role: string, content: string, imageUrl?: string) => {
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role,
      content,
      image_url: imageUrl || null,
    });
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  const handleSend = async (content: string, imageUrl?: string) => {
    if (!currentUser) return;
    const userMessage: Message = { id: String(Date.now()), role: "user", content, imageUrl };
    setMessages(prev => [...prev, userMessage]); setIsLoading(true);

    try {
      // Create or reuse conversation
      let convId = activeConversationId;
      let conv: { id: string; context_id?: string | null; system_prompt?: string | null } | null =
        conversations.find((c) => c.id === convId) || null;
      if (!convId) {
        const { data: newConv } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: currentUser,
            title: activeTopicName || generateTitle(content),
            context_id: activeTopicId,
            topic_title: activeTopicName,
          })
          .select("id, context_id, system_prompt")
          .single();
        if (newConv) {
          convId = newConv.id;
          setActiveConversationId(convId);
          conv = newConv;
        }
      }
      if (!convId) throw new Error("Conversazione non creata");

      // Save user message
      await saveMessage(convId, "user", content, imageUrl);

      // Chat d'argomento: se il "contratto" personalizzato non c'è ancora,
      // lo scrive l'AI leggendo il documento (una volta sola per chat).
      let topicSystemPrompt: string | null = conv?.system_prompt ?? null;
      const convContextId: string | null = conv?.context_id ?? activeTopicId;
      if (convContextId && !topicSystemPrompt) {
        try {
          const res = await edgeFetch<{ prompt?: string }>("chat", {
            userId: currentUser,
            action: "topicPrompt",
            topicContextId: convContextId,
            language: currentLanguage(),
          });
          if (res?.prompt) {
            topicSystemPrompt = res.prompt;
            await supabase.from("chat_conversations")
              .update({ system_prompt: topicSystemPrompt })
              .eq("id", convId);
            setConversations(prev => prev.map((c) => c.id === convId ? { ...c, system_prompt: topicSystemPrompt } : c));
          }
        } catch (e) {
          console.warn("topicPrompt generation failed (non bloccante):", e);
        }
      }

      // Build API messages
      const apiMessages = [...messages.filter(m => m.id !== "welcome"), userMessage].map(m => {
        if (m.imageUrl && m.imageUrl.startsWith("data:image")) {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content || "Descrivi e analizza questa immagine in relazione ai materiali di studio." },
              { type: "image_url", image_url: { url: m.imageUrl } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      abortRef.current = new AbortController();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            userId: currentUser,
            messages: apiMessages,
            language: currentLanguage(),
            topicContextId: convContextId,
            topicSystemPrompt,
          }) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Errore nella risposta"); }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.response) {
          const assistantMsg: Message = { id: String(Date.now()), role: "assistant", content: data.response };
          setMessages(prev => [...prev, assistantMsg]);
          await saveMessage(convId, "assistant", data.response);
          await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          loadConversations();
          return;
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamSources: ChatSource[] = [];
      let streamInterrupted = false;

      // 🐕‍🦺 LA SENTINELLA: ogni pezzetto di testo azzera il timer; se il tubo
      // tace troppo, abortiamo noi e salviamo il salvabile (risposta parziale).
      let lastChunkAt = Date.now();
      const watchdog = setInterval(() => {
        if (Date.now() - lastChunkAt > STALL_TIMEOUT_MS) {
          clearInterval(watchdog);
          streamInterrupted = true;
          abortRef.current?.abort();
        }
      }, 3000);

      const updateAssistantMessage = (text: string) => {
        assistantContent = text;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id !== "welcome") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          return [...prev, { id: String(Date.now()), role: "assistant", content: assistantContent }];
        });
      };

      const parseLine = (line: string): boolean => {
        // true = la riga era "data: [DONE]" → stop
        if (!line.startsWith("data: ")) return false;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const special = parseSpecialEvent(parsed);
          if (special?.type === "sources") {
            streamSources = special.sources;
          } else if (special?.type === "warning") {
            streamInterrupted = true;
          } else {
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              lastChunkAt = Date.now();
              updateAssistantMessage(assistantContent + deltaContent);
            }
          }
        } catch { /* frammento: verrà ripescato dal buffer */ }
        return false;
      };

      let doneSeen = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lastChunkAt = Date.now();
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex); textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (parseLine(line)) { doneSeen = true; break; }
          }
          if (doneSeen) break;
        }
      } catch (streamErr) {
        // Abort dalla sentinella o rete caduta: se abbiamo testo, è parziale.
        if (assistantContent) streamInterrupted = true;
        else throw streamErr;
      } finally {
        clearInterval(watchdog);
      }

      // 🧽 Pulizia finale: azioni e tag immagine spariscono dalla vista
      const { cleanText, actions, imageQuery } = cleanAssistantText(assistantContent);

      // 🖼️ Se l'AI ha chiesto un'immagine, la macchinetta Wikipedia la trova
      let wikiImageUrl: string | undefined;
      if (imageQuery) {
        try {
          const res = await edgeFetch<{ image?: { url: string } | null }>("wiki-image", {
            userId: currentUser, query: imageQuery, language: currentLanguage(),
          });
          wikiImageUrl = res?.image?.url || undefined;
        } catch (e) { console.warn("wiki-image failed (non bloccante):", e); }
      }

      const finalMessage: Message = {
        id: String(Date.now()),
        role: "assistant",
        content: cleanText || "…",
        imageUrl: wikiImageUrl,
        sources: streamSources,
        actions,
        interrupted: streamInterrupted,
      };
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id !== "welcome") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...finalMessage, id: m.id } : m));
        }
        return [...prev, finalMessage];
      });

      if (streamInterrupted) {
        toast({ title: t("chat.stall.title"), description: t("chat.stall.desc") });
      }

      if (cleanText) {
        await saveMessage(convId, "assistant", cleanText, wikiImageUrl);
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        loadConversations();
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella chat", variant: "destructive" });
      setMessages(prev => [...prev, { id: String(Date.now()), role: "assistant", content: "Mi dispiace, si è verificato un errore. Riprova tra qualche secondo." }]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  // 🤖 L'agente propone, l'utente approva: esecuzione vera delle azioni.
  const handleExecuteAction = async (messageId: string, index: number, action: AgentAction) => {
    const key = `${messageId}:${index}`;
    if (executedActions[key] || !currentUser) return;
    try {
      if (action.kind === "add_event" || action.kind === "propose_review" || action.kind === "add_goal") {
        const title = String(action.title || (action.kind === "propose_review" ? "Ripasso" : "Evento di studio"));
        const finalTitle = action.kind === "propose_review" && !title.toLowerCase().startsWith("ripasso")
          ? `Ripasso: ${title}`
          : title;
        const date = typeof action.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(action.date)
          ? action.date
          : new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const eventType = action.kind === "add_goal" ? "test"
          : (["study", "test", "assignment"].includes(String(action.event_type)) ? String(action.event_type) : "study");
        // 🚪 Passiamo dal portinaio save-event (come fa il Piano): scrivere
        // nel caveau per conto nostro poteva fallire in silenzio per alcuni
        // utenti, e il Piano non avrebbe mostrato nulla. Trovato dal capocantiere!
        await edgeFetch("save-event", {
          userId: currentUser,
          action: "add",
          events: [{
            subject: String(action.subject || "Generale").slice(0, 60),
            title: finalTitle.slice(0, 120),
            date,
            type: eventType,
          }],
        });
        // 🔄 Avvisiamo il cruscotto del Piano che c'è un evento nuovo da pescare.
        queryClient.invalidateQueries({ queryKey: studyEventsKeys.all(currentUser) });
        toast({ title: t("chat.actions.eventAdded"), description: `${finalTitle} · ${date}` });
      } else if (action.kind === "goto_quiz") {
        window.dispatchEvent(new CustomEvent("erga:goto-tab", { detail: "pratica" }));
        toast({ title: t("chat.actions.gotoQuiz") });
      } else if (action.kind === "goto_lesson") {
        window.dispatchEvent(new CustomEvent("erga:goto-tab", { detail: "studio" }));
        toast({ title: t("chat.actions.gotoLesson"), description: String(action.query || "") });
      }
      setExecutedActions(prev => ({ ...prev, [key]: true }));
    } catch (e) {
      console.error("action failed:", e);
      toast({ title: t("chat.actions.failed"), variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full relative">
      {/* History sidebar - mobile overlay / desktop panel */}
      {showHistory && (
        <>
          <div className="absolute inset-0 bg-slate-500/10 backdrop-blur-sm z-20 md:hidden" onClick={() => setShowHistory(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] z-30 md:relative md:w-[260px] md:z-auto animate-fade-up">
            <div className="h-full relative">
              <button
                onClick={() => setShowHistory(false)}
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
              <ChatHistory
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={loadConversation}
                onNew={handleNewChat}
                onDelete={handleDeleteConversation}
              />
            </div>
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superiore: cronologia + selettore argomento (NotebookLM) */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
              showHistory
                ? "bg-primary-container text-primary"
                : "hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="w-4 h-4" />
            {t("chat.history")}
          </button>
          <div className="h-5 w-px bg-border/60 flex-shrink-0" />
          <button
            onClick={() => handleSelectTopic(null)}
            className={cn(
              "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200",
              activeTopicId === null
                ? "bg-primary text-primary-foreground shadow-level-1"
                : "hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
            )}
          >
            <Globe2 className="w-3.5 h-3.5" />
            {t("chat.topics.all")}
          </button>
          {topics.map((tp) => (
            <button
              key={tp.id}
              onClick={() => handleSelectTopic(tp.id)}
              title={tp.file_name}
              className={cn(
                "flex-shrink-0 max-w-[160px] truncate flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200",
                activeTopicId === tp.id
                  ? "bg-primary text-primary-foreground shadow-level-1"
                  : "hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{tp.file_name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onExecuteAction={handleExecuteAction}
              executedActions={executedActions}
            />
          ))}
          {isLoading && (
            <div className="flex gap-3 animate-fade-up">
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shadow-level-1">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3 shadow-level-1">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="px-3 pb-2 pt-1 space-y-1 flex-shrink-0">
          <QuickActions onAction={(action) => handleSend(action)} />
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
