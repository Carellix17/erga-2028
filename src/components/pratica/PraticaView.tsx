import { useState } from "react";
import { MessageCircle, Mic, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatView } from "@/components/chat/ChatView";
import { InterrogazioneView } from "./InterrogazioneView";
import { EserciziView } from "./EserciziView";
import { EmptyState } from "@/components/shared/EmptyState";

type SubTab = "chat" | "interrogazione" | "esercizi";

interface PraticaViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const subTabs = [
  { id: "chat" as SubTab, label: "Chat", icon: MessageCircle, description: "Fatti spiegare" },
  { id: "interrogazione" as SubTab, label: "Interrogazione", icon: Mic, description: "Parlare per imparare" },
  { id: "esercizi" as SubTab, label: "Esercizi", icon: Dumbbell, description: "Allenati" },
];

export function PraticaView({ hasFiles, onUploadClick, onFullscreenChange }: PraticaViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("chat");
  const [isExerciseFullscreen, setIsExerciseFullscreen] = useState(false);

  const handleFullscreenChange = (isFullscreen: boolean) => {
    setIsExerciseFullscreen(isFullscreen);
    onFullscreenChange?.(isFullscreen);
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  return (
    <div className="flex flex-col min-h-[calc(100vh-7.5rem)]">
      {/* Sub-tab selector - hidden during exercises fullscreen */}
      {!isExerciseFullscreen && (
        <div className="sticky top-16 px-3 pt-2 pb-2 flex-shrink-0 z-30 bg-background/95 backdrop-blur-md -mx-4 sm:-mx-6 px-4 sm:px-6">
          <div className="flex gap-1.5 p-1 rounded-2xl bg-surface-container">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all duration-400 ease-m3-emphasized",
                    isActive
                      ? "bg-tertiary text-tertiary-foreground shadow-level-1"
                      : "text-muted-foreground hover:bg-foreground/[0.05]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="label-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSubTab === "chat" && (
          <ChatView hasFiles={hasFiles} onUploadClick={onUploadClick} />
        )}
        {activeSubTab === "interrogazione" && (
          <InterrogazioneView />
        )}
        {activeSubTab === "esercizi" && (
          <EserciziView onFullscreenChange={handleFullscreenChange} />
        )}
      </div>
    </div>
  );
}
