import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Outlet, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { CoreView } from "@/components/core/CoreView";
import { HomeView } from "@/components/home/HomeView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { useUserData } from "@/hooks/useUserData";
import { useHasContentQuery, useLessonsCacheControls } from "@/hooks/useLessons";
import { useGenerationRealtime } from "@/hooks/useGenerationRealtime";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveOnboarding } from "@/components/onboarding/CognitiveOnboarding";
import { resolveOnboardingGate } from "@/lib/onboardingGate";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle } from "lucide-react";
import { useDemoHandoff } from "@/hooks/useDemoHandoff";
import type { StudioTool } from "@/components/studio/StudioPractice";
import { useTranslation } from "react-i18next";
import { SeoHead } from "@/components/SeoHead";
import { setAppScrollTop } from "@/lib/appScroll";
import { RoomClarify } from "@/components/shared/RoomClarify";
import { useAppTab, type AppTab } from "@/hooks/useAppTab";
import { useOverlayHistory } from "@/hooks/useOverlayHistory";

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
  const { t } = useTranslation();
  const location = useLocation();
  const { activeTab, navigateToTab } = useAppTab();
  const [lessonHistoryBackRequest, setLessonHistoryBackRequest] = useState(0);
  const handleLessonHistoryBack = useCallback(
    () => setLessonHistoryBackRequest((request) => request + 1),
    [],
  );
  const { pushEntry: pushLessonHistoryEntry, closeEntry: closeLessonHistoryEntry } =
    useOverlayHistory(handleLessonHistoryBack);
  const [showUpload, setShowUpload] = useState(false);
  const [materialRequest, setMaterialRequest] = useState<{ tab: "loading" | "manage" } | null>(null);
  const [uploaderHost] = useState(() => document.createElement("div"));
  useEffect(() => {
    document.body.appendChild(uploaderHost);
    return () => uploaderHost.remove();
  }, [uploaderHost]);
  const [manageFocusContextId, setManageFocusContextId] = useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const openUpload = () => {
    setManageFocusContextId(null);
    setMaterialRequest({ tab: "loading" });
    setShowUpload(true);
  };
  // Stesso foglio di «Carica altri materiali»: non c'è più un pannello fisso.
  const openCreatePath = () => {
    openUpload();
  };
  // 🧭 Percorsi 2.0 — strumento di Studio da aprire al prossimo ingresso
  // (es. "Chat", "Esercizi" o "Palestra" dalle pillole della Home o dalla chat).
  const [toolLaunch, setToolLaunch] = useState<{ tool: StudioTool; requestId: number } | null>(null);
  const [lessonLaunch, setLessonLaunch] = useState<{ contextId: string; lessonIndex: number; requestId: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const changeTab = useCallback(
    (tab: AppTab, { replace = true }: { replace?: boolean } = {}) => {
      if (tab === activeTab) return;
      // Prima del paint: html ha scroll-behavior smooth, quindi il salto
      // in cima deve essere istantaneo, nel gesto, non dopo.
      setAppScrollTop(0);
      navigateToTab(tab, { replace });
    },
    [activeTab, navigateToTab]
  );
  const changeTabFromDock = useCallback(
    (tab: AppTab) => changeTab(tab, { replace: false }),
    [changeTab],
  );

  // 🤖 P7 — il citofono dell'agente: la chat può chiedere di cambiare scheda
  // ("portami agli esercizi", "apri le lezioni") senza conoscere la app.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | { tab: string; tool?: StudioTool }>).detail;
      // 🧭 Percorsi 2.0: il payload può essere una scheda ("studio") oppure
      // { tab, tool } per aprire direttamente uno strumento di Studio.
      if (typeof detail === "object" && detail !== null) {
        if (detail.tab === "studio" && detail.tool) {
          setToolLaunch({ tool: detail.tool, requestId: Date.now() });
          changeTab("studio");
        } else if (detail.tab === "home" || detail.tab === "studio" || detail.tab === "piano" || detail.tab === "core") {
          changeTab(detail.tab);
        }
        return;
      }
      const tab = detail;
      if (tab === "home" || tab === "studio" || tab === "piano" || tab === "core") {
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
  const {
    profile: cognitive,
    gateInput: cognitiveGateInput,
    refresh: refreshCognitive,
  } = useCognitiveProfile();
  const { logout } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 🔒 anti-regressione: un errore di lettura NON equivale a "utente nuovo".
  // Il cancello mostra l'onboarding solo quando il server ha RISPOSTO che
  // l'utente non ha completato il percorso cognitivo.
  const cognitiveGate = resolveOnboardingGate(cognitiveGateInput);

  // Loading iniziale: solo il primo fetch, mai più tra le tab
  const initialLoading = hasContentQuery.isLoading || cognitiveGate.kind === "loading";
  // 🎬 P14: terzo e ultimo cancello del sipario (cronometro condiviso)
  const splash = useSplashGate(initialLoading);
  const hasCloudContent = hasContentQuery.data ?? false;
  const hasFiles = uploadedFiles.length > 0 || hasCloudContent;
  const hasContentError = hasContentQuery.isError;

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
    changeTab("studio", { replace: false });
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

  // ── Impostazioni DENTRO l'albero di /app (fix «la pagina si ricarica»):
  // le pagine di /app/impostazioni sono route figlie di questa, quindi
  // Index resta MONTATA mentre l'utente è nelle impostazioni — scheda
  // attiva e cache dati sopravvivono all'andata e al ritorno.
  // Lo scroll, invece, riparte dall'alto a ogni ingresso.
  // Prima erano route separate: uscendo, l'intera app si smontava e si
  // rimontava da zero (skeleton + stato perso), sembrava un reload.
  const isSettingsRoute = location.pathname.startsWith("/app/impostazioni");

  // Le impostazioni sostituiscono la shell, non l'app: si saltano anche i
  // cancelli di sotto (splash/onboarding), che parlano solo della stanza.
  if (isSettingsRoute) return <Outlet />;

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  // ⚠️ Lettura profilo fallita (rete, CORS, Edge Function non deployata,
  // sessione scaduta): NON mostriamo l'onboarding a un utente esistente.
  // Blocchiamo con un errore recuperabile, con il dettaglio in chiaro.
  if (cognitiveGate.kind === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-level-1">
          <Brain className="mx-auto h-10 w-10 text-brand-deep" />
          <h1 className="mt-3 font-display text-xl font-semibold tracking-tight">
            Non riusciamo a caricare i tuoi dati
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Il tuo account esiste, ma in questo momento non è stato possibile
            leggere il profilo.{" "}
            {cognitiveGate.error && (
              <span className="block text-xs text-foreground/70">
                ({cognitiveGate.error})
              </span>
            )}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => void refreshCognitive()}>Riprova</Button>
            <Button variant="ghost" onClick={() => void logout()}>
              Esci e accedi di nuovo
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Onboarding bloccante: SOLO dopo conferma positiva del server che l'utente
  // non ha completato il test cognitivo.
  if (cognitiveGate.kind === "ready" && cognitiveGate.showOnboarding) {
    return (
      <CognitiveOnboarding
        onCompleted={async () => {
          await refreshCognitive();
        }}
      />
    );
  }

  // Home e Core portano già la propria intestazione dentro la stanza:
  // niente titolo duplicato nella barra in alto (un solo <h1> per pagina).
  const headerTitle = activeTab === "home" || activeTab === "core" ? null : t(`nav.${activeTab}`);

  return (
    <>
      <SeoHead
        title="Studio — Erga"
        description="Il tuo spazio di studio personale: lezioni, esercizi, piano e focus in un'unica app."
        path="/app"
        noindex
      />
      <AppLayout
        activeTab={activeTab}
        onTabChange={changeTabFromDock}
        headerTitle={headerTitle}
        hideChrome={isFullscreen}
      >
        {/* ⚠️ Errori di lettura dati visibili (mai "vuoto" silenzioso):
            se il contenuto cloud non si carica, l'utente lo sa e può riprovare. */}
        {hasContentError && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-card border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p>
              Alcuni dati non si sono caricati.{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => {
                  invalidateAll();
                  invalidateHasContent();
                }}
              >
                Riprova
              </button>
            </p>
          </div>
        )}
        <RoomClarify
          screenKey={activeTab}
          disabled={lessonLaunch != null || isFullscreen}
          studio={activeTab === "studio"}
          className={activeTab === "studio" ? "bg-[#0a0a0a]" : undefined}
        >
        {activeTab === "home" && (
          <HomeView
            onOpenStudio={() => changeTab("studio", { replace: false })}
            onResumeLesson={(contextId, lessonIndex) => {
              setSelectedContextId(contextId);
              setLessonLaunch({ contextId, lessonIndex, requestId: Date.now() });
              // Studio opens this through the same overlay-history path as a
              // lesson opened there: first Back closes the reader, the next
              // returns to the source Home tab.
              changeTab("studio", { replace: false });
            }}
            onOpenPlan={() => changeTab("piano", { replace: false })}
            onUpload={openUpload}
          />
        )}
        {/* Banner ricalcola Esagono se per qualche motivo i punteggi sono tutti default */}
        {activeTab === "studio" && cognitive && [cognitive.log_score, cognitive.mem_score, cognitive.foc_score, cognitive.voc_score, cognitive.ans_score, cognitive.app_score].every((s) => s === 50) && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="interactive-card mt-4 mb-2 flex w-full items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-left"
          >
            <Brain className="w-5 h-5 text-brand-deep shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Personalizza Erga al massimo</p>
              <p className="text-xs text-muted-foreground">Calcola il tuo Esagono Cognitivo in 2 minuti.</p>
            </div>
          </button>
        )}
        {activeTab === "studio" && (
          <section aria-label="Percorso e minilezioni" className="study-workspace min-w-0 bg-[#0a0a0a] text-foreground">
            <StudioView
              embeddedReader
              hasFiles={hasFiles}
              onUploadClick={openUpload}
              onCreatePathClick={openCreatePath}
              selectedContextId={selectedContextId}
              lessonLaunch={lessonLaunch}
              onLessonLaunchHandled={() => setLessonLaunch(null)}
              lessonHistoryBackRequest={lessonHistoryBackRequest}
              onLessonHistoryOpen={pushLessonHistoryEntry}
              onLessonHistoryClose={closeLessonHistoryEntry}
              toolLaunch={toolLaunch}
              onToolLaunchHandled={() => setToolLaunch(null)}
              onClearContext={() => setSelectedContextId(null)}
              onOpenCourseMaterials={(contextId) => {
                setManageFocusContextId(contextId);
                setMaterialRequest({ tab: "manage" });
                setShowUpload(true);
              }}
              onFullscreenChange={setIsFullscreen}
            />
          </section>
        )}
        {activeTab === "piano" && (
          <PianoView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
          />
        )}
        {activeTab === "core" && (
          <CoreView onOpenCognitive={() => setShowOnboarding(true)} />
        )}
        </RoomClarify>
      </AppLayout>



      {createPortal(
      <UploadSheet
        panelRequest={materialRequest}
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
      , uploaderHost)}

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
    </>
  );
};

export default Index;


