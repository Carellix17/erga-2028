import { useState } from "react";
import { MessageSquarePlus, Trash2, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  /** Chat d'argomento (P7): il documento a cui è dedicata, null = generale. */
  context_id?: string | null;
  topic_title?: string | null;
  system_prompt?: string | null;
}

interface ChatHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Oggi";
  if (isYesterday(d)) return "Ieri";
  return format(d, "d MMM", { locale: it });
}

export function ChatHistory({ conversations, activeId, onSelect, onNew, onDelete }: ChatHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-surface-container rounded-2xl shadow-level-1 overflow-hidden">
      {/* New chat button */}
      <button
        onClick={onNew}
        className="flex items-center gap-2.5 px-4 py-3 m-2 rounded-2xl bg-primary text-primary-foreground font-medium text-sm hover:shadow-level-2 active:scale-[0.98] transition-all duration-200"
      >
        <MessageSquarePlus className="w-4.5 h-4.5" />
        Nuova chat
      </button>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 scrollbar-thin">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/60">
            <Clock className="w-8 h-8 mb-2" />
            <p className="text-xs">Nessuna conversazione</p>
          </div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200",
              activeId === conv.id
                ? "bg-primary text-primary-foreground shadow-level-1"
                : "hover:bg-surface-container-high text-foreground"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                {conv.context_id && (
                  <BookOpen className="w-3 h-3 opacity-70 flex-shrink-0" />
                )}
                {conv.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {conv.context_id && conv.topic_title ? `📂 ${conv.topic_title} · ` : ""}
                {formatDate(conv.updated_at)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (deletingId === conv.id) {
                  onDelete(conv.id);
                  setDeletingId(null);
                } else {
                  setDeletingId(conv.id);
                  setTimeout(() => setDeletingId(null), 3000);
                }
              }}
              className={cn(
                "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200",
                deletingId === conv.id
                  ? "bg-destructive text-destructive-foreground opacity-100"
                  : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
