import { useState, useEffect, useRef, useCallback } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { PraticaView } from "@/components/pratica/PraticaView";
import { ProfileView } from "@/components/profile/ProfileView";
import { HomeView } from "@/components/home/HomeView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { useUserData } from "@/hooks/useUserData";
import { useHasContentQuery, useLessonsCacheControls } from "@/hooks/useLessons";
import { useGenerationRealtime } from "@/hooks/useGenerationRealtime";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveOnboarding } from "@/components/onboarding/CognitiveOnboarding";
import { Brain } from "lucide-react";
import { useDemoHandoff } from "@/hooks/useDemoHandoff";

type Tab = "home" | "studio" | "piano" | "pratica" | "profilo";

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
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showUpload, setShowUpload] = useState(false);
  const [manageFocusContextId, setManageFocusContextId] = useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 🧭 P24 — memoria di posizione: ogni stanza riapre DOV'ERA (oggetti persistenti)
  const scrollPositions = useRef<Record<Tab, number>>({ home: 0, studio: 0, piano: 0, pratica: 0, profilo: 0 });
  const changeTab = useCallback(
    (tab: Tab) => {
      scrollPositions.current[activeTab] = window.scrollY;
      setActiveTab(tab);
    },
    [activeTab]
  );

  useEffect(() => {
    window.scrollTo(0, scrollPositions.current[activeTab]);
  }, [activeTab]);

  // 🤖 P7 — il citofono dell'agente: la chat può chiedere di cambiare scheda
  // ("portami agli esercizi", "apri le lezioni") senza conoscere la app.
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === "home" || tab === "studio" || tab === "piano" || tab === "pratica" || tab === "profilo") {
        changeTab(tab);
      }
    };
    window.addEventListener("erga:goto-tab", handler);
    return () => window.removeEventListener("erga:goto-tab", handler);
  }, [changeTab]);

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
  // 🎬 P14: terzo e ultimo cancello del sipario (cronometro condiviso)
  const splash = useSplashGate(initialLoading);
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
    changeTab("studio");
  };

  const handleSelectFile = (contextId: string) => {
    setSelectedContextId(contextId);
    changeTab("studio");
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

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
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
    <div className="min-h-screen bg-background bg-dot-grid dot-halo-scope flex flex-col md:flex-row">
      {!isFullscreen && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}

      <div className="flex-1 flex flex-col min-w-0">
        <main className="w-full max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 pb-24 md:pb-6">
        <h1 className="sr-only">Erga — Il tuo assistente di studio intelligente</h1>
        {/* 🌲 P24 — passaggio tra stanze: dissolvenza di sola luce (200ms) */}
        <div key={activeTab} className="room-fade">
        {activeTab === "home" && (
          <HomeView
            onOpenStudio={() => changeTab("studio")}
            onOpenPratica={() => changeTab("pratica")}
            onOpenCognitive={() => setShowOnboarding(true)}
          />
        )}
        {/* Banner ricalcola Esagono se per qualche motivo i punteggi sono tutti default */}
        {activeTab === "studio" && cognitive && [cognitive.log_score, cognitive.mem_score, cognitive.foc_score, cognitive.voc_score, cognitive.ans_score, cognitive.app_score].every((s) => s === 50) && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full mt-4 mb-2 rounded-3xl bg-card border border-border px-4 py-3 flex items-center gap-3 text-left transition-all duration-300 hover:scale-[1.005] hover:border-foreground/25"
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
            onOpenCourseMaterials={(contextId) => {
              setManageFocusContextId(contextId);
              setShowUpload(true);
            }}
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
        </div>
        </main>
      </div>

      <UploadSheet
        open={showUpload}
        onOpenChange={(o) => {
          setShowUpload(o);
          if (!o) setManageFocusContextId(null);
        }}
        onUpload={handleUpload}
        uploadedFiles={displayFiles}
        onSelectFile={handleSelectFile}
        onFileDeleted={handleFileDeleted}
        initialManageContextId={manageFocusContextId}
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
