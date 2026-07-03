import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { ChatHistory, Conversation } from "./ChatHistory";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { History, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { currentLanguage } from "@/i18n";

interface ChatViewProps { hasFiles: boolean; onUploadClick: () => void; }
type Message = { id: string; role: "user" | "assistant"; content: string; imageUrl?: string; };

export function ChatView({ hasFiles, onUploadClick }: ChatViewProps) {
  const { t } = useTranslation();
  const welcomeMessage: Message = {
    id: "welcome", role: "assistant",
    content: t("chat.welcome"),
  };
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, [currentUser]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, image_url, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const loaded: Message[] = data.map((m: any) => ({
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
    setShowHistory(false);
  }, []);

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

    // Create or reuse conversation
    let convId = activeConversationId;
    if (!convId) {
      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({ user_id: currentUser, title: generateTitle(content) })
        .select("id")
        .single();
      if (newConv) {
        convId = newConv.id;
        setActiveConversationId(convId);
      }
    }

    // Save user message
    if (convId) {
      await saveMessage(convId, "user", content, imageUrl);
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

    let assistantContent = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, messages: apiMessages, language: currentLanguage() }) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Errore nella risposta"); }
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.response) {
          const assistantMsg: Message = { id: String(Date.now()), role: "assistant", content: data.response };
          setMessages(prev => [...prev, assistantMsg]);
          if (convId) { await saveMessage(convId, "assistant", data.response); }
          setIsLoading(false);
          // Update conversation timestamp
          if (convId) await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          loadConversations();
          return;
        }
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder(); let textBuffer = "";
      const updateAssistantMessage = (text: string) => {
        assistantContent = text;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id !== "welcome") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          return [...prev, { id: String(Date.now()), role: "assistant", content: assistantContent }];
        });
      };
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex); textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim(); if (jsonStr === "[DONE]") break;
          try { const parsed = JSON.parse(jsonStr); const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) updateAssistantMessage(assistantContent + deltaContent);
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue; if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim(); if (jsonStr === "[DONE]") continue;
          try { const parsed = JSON.parse(jsonStr); const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) updateAssistantMessage(assistantContent + deltaContent);
          } catch { /* ignore */ }
        }
      }
      // Save final assistant message
      if (convId && assistantContent) {
        await saveMessage(convId, "assistant", assistantContent);
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        loadConversations();
      }
    } catch (error) { console.error("Chat error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella chat", variant: "destructive" });
      setMessages(prev => [...prev, { id: String(Date.now()), role: "assistant", content: "Mi dispiace, si è verificato un errore. Riprova tra qualche secondo." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex h-full relative">
      {/* History sidebar - mobile overlay / desktop panel */}
      {showHistory && (
        <>
          {/* Backdrop on mobile */}
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
        {/* History toggle bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
              showHistory
                ? "bg-primary-container text-primary"
                : "hover:bg-surface-container-high text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="w-4 h-4" />
            {t("chat.history")}
          </button>
          {activeConversationId && (
            <span className="text-xs text-muted-foreground truncate">
              {conversations.find(c => c.id === activeConversationId)?.title}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
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
