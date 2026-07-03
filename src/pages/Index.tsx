import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { PraticaView } from "@/components/pratica/PraticaView";
import { ProfileView } from "@/components/profile/ProfileView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { useUserData } from "@/hooks/useUserData";
import { useHasContentQuery, useLessonsCacheControls } from "@/hooks/useLessons";
import { useGenerationRealtime } from "@/hooks/useGenerationRealtime";
import { Loader2 } from "lucide-react";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveOnboarding } from "@/components/onboarding/CognitiveOnboarding";
import { Brain } from "lucide-react";
import { useDemoHandoff } from "@/hooks/useDemoHandoff";

type Tab = "studio" | "piano" | "pratica" | "profilo";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
}

const Index = () => {
  // Mantiene in tempo reale lo stato dei job di generazione (lezioni + esercizi)
  // così la UI riprende l'attesa anche se l'utente è uscito e rientrato nell'app.
  useGenerationRealtime();
  // Se l'utente arriva qui dopo una sessione demo anonima, persistiamo l'esagono
  // calcolato in locale sul suo nuovo profilo cognitivo.
  useDemoHandoff();
  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: uploadedFiles, updateData: setUploadedFiles } = useUserData<UploadedFile[]>(
    "uploaded_files",
    []
  );

  const hasContentQuery = useHasContentQuery();
  const { invalidateAll, invalidateContexts, invalidateHasContent } = useLessonsCacheControls();

  // Cognitive onboarding gate
  const { hasCompletedOnboarding, profile: cognitive, isLoaded: cognitiveLoaded, refresh: refreshCognitive } = useCognitiveProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Loading iniziale: solo il primo fetch, mai più tra le tab
  const initialLoading = hasContentQuery.isLoading || !cognitiveLoaded;
  const hasCloudContent = hasContentQuery.data ?? false;
  const hasFiles = uploadedFiles.length > 0 || hasCloudContent;

  const handleUpload = (files: { name: string; size: number }[], contextId?: string) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    if (contextId) setSelectedContextId(contextId);
    // Nuovo file caricato: invalida tutto il dominio lezioni/contesti
    invalidateAll();
    invalidateHasContent();
    setActiveTab("studio");
  };

  const handleSelectFile = (contextId: string) => {
    setSelectedContextId(contextId);
    setActiveTab("studio");
  };

  const handleFileDeleted = () => {
    invalidateAll();
    invalidateContexts();
    invalidateHasContent();
  };

  const displayFiles = uploadedFiles.map((f) => ({
    name: f.name,
    size: f.size,
  }));

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-level-3 animate-pulse">
          <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground font-medium text-sm">Caricamento...</p>
      </div>
    );
  }

  // Onboarding bloccante: se l'utente non ha completato il test cognitivo,
  // mostriamo la sequenza di slide e blocchiamo l'accesso alla dashboard.
  if (!hasCompletedOnboarding) {
    return (
      <CognitiveOnboarding
        onCompleted={async () => {
          await refreshCognitive();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-dot-grid">
      <AppHeader
        onUploadClick={() => setShowUpload(true)}
        hasFiles={hasFiles}
      />

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <h1 className="sr-only">Erga — Il tuo assistente di studio intelligente</h1>
        {/* Banner ricalcola Esagono se per qualche motivo i punteggi sono tutti default */}
        {activeTab === "studio" && cognitive && [cognitive.log_score, cognitive.mem_score, cognitive.foc_score, cognitive.voc_score, cognitive.ans_score, cognitive.app_score].every((s) => s === 50) && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full mt-4 mb-2 rounded-3xl bg-white border border-slate-200/70 px-4 py-3 flex items-center gap-3 text-left transition-all duration-300 hover:scale-[1.005] hover:border-slate-300"
          >
            <Brain className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Personalizza Erga al massimo</p>
              <p className="text-xs text-muted-foreground">Calcola il tuo Esagono Cognitivo in 2 minuti.</p>
            </div>
          </button>
        )}
        {activeTab === "studio" && (
          <StudioView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
            selectedContextId={selectedContextId}
            onClearContext={() => setSelectedContextId(null)}
            onFullscreenChange={setIsFullscreen}
          />
        )}
        {activeTab === "piano" && (
          <PianoView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
          />
        )}
        {activeTab === "pratica" && (
          <PraticaView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
            onFullscreenChange={setIsFullscreen}
          />
        )}
        {activeTab === "profilo" && (
          <ProfileView onOpenCognitive={() => setShowOnboarding(true)} />
        )}
      </main>

      {!isFullscreen && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}

      <UploadSheet
        open={showUpload}
        onOpenChange={setShowUpload}
        onUpload={handleUpload}
        uploadedFiles={displayFiles}
        onSelectFile={handleSelectFile}
        onFileDeleted={handleFileDeleted}
      />

      {showOnboarding && (
        <CognitiveOnboarding
          allowClose
          onClose={() => setShowOnboarding(false)}
          onCompleted={async () => {
            await refreshCognitive();
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
};

export default Index;
