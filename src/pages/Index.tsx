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
import { Loader2 } from "lucide-react";

type Tab = "studio" | "piano" | "pratica" | "profilo";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
}

const Index = () => {
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

  // Loading iniziale: solo il primo fetch, mai più tra le tab
  const initialLoading = hasContentQuery.isLoading;
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        onUploadClick={() => setShowUpload(true)}
        hasFiles={hasFiles}
      />

      <main className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        <h1 className="sr-only">Erga — Il tuo assistente di studio intelligente</h1>
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
          <ProfileView />
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
    </div>
  );
};

export default Index;
