import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomeView } from "@/components/home/HomeView";
import { StudioView } from "@/components/studio/StudioView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { LessonReaderPreview } from "./LessonReaderPreview";
import { useIsMobile } from "@/hooks/use-mobile";
import type { StudioTool } from "@/components/studio/StudioPractice";
import i18n from "@/i18n";
import "@/index.css";
import "@/App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

type Tab = "home" | "studio" | "piano" | "core";
type MaterialRequest = { tab: "loading" | "manage" } | null;

export function VisualPreview() {
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const isLessonPreview = requestedView === "lesson";
  const [activeTab, setActiveTab] = useState<Tab>(
    requestedView === "studio" || isLessonPreview ? "studio" : "home",
  );
  const [showUpload, setShowUpload] = useState(false);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [materialRequest, setMaterialRequest] = useState<MaterialRequest>(null);
  const [materialPane, setMaterialPane] = useState<HTMLDivElement | null>(null);
  const [uploaderHost] = useState(() => document.createElement("div"));
  const isMobile = useIsMobile();

  // Mirror Index's portal target without mounting Index or its cloud queries.
  useEffect(() => {
    (activeTab === "studio" && materialPane ? materialPane : document.body).appendChild(uploaderHost);
  }, [activeTab, materialPane, uploaderHost]);
  useEffect(() => () => uploaderHost.remove(), [uploaderHost]);

  useEffect(() => {
    document.documentElement.dataset.visualReady = "true";
  }, []);

  const openUpload = () => {
    setMaterialRequest({ tab: "loading" });
    if (activeTab === "studio") {
      setMaterialsExpanded(true);
      requestAnimationFrame(() => materialPane?.scrollIntoView({ block: "start" }));
    } else {
      setShowUpload(true);
    }
  };

  // Same mobile/desktop split as Index.openCreatePath; the rest of Index is
  // intentionally absent so this fixture cannot trigger product mutations.
  const openCreatePath = () => {
    if (activeTab === "studio" && isMobile) {
      setMaterialRequest({ tab: "loading" });
      setMaterialsExpanded(false);
      setShowUpload(true);
      return;
    }
    openUpload();
  };

  const handleOpenChange = (open: boolean) => {
    setShowUpload(open);
    if (!open) {
      setMaterialsExpanded(false);
      setMaterialRequest(null);
    }
  };

  const handleStudioTool = (_tool: StudioTool) => setActiveTab("studio");

  return (
    <MemoryRouter initialEntries={["/app"]}>
      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerTitle={activeTab === "home" || activeTab === "core" ? null : activeTab === "studio" ? "Studio" : "Piano"}
      >
        {isLessonPreview ? (
          <section className="min-h-[50vh] p-6" aria-label="Anteprima lettore lezione" />
        ) : activeTab === "home" ? (
          <HomeView
            cognitiveProfile={{
              nome: "Arianna",
              eta: 16,
              istituto: "Liceo",
              log_score: 71,
              mem_score: 62,
              foc_score: 79,
              voc_score: 54,
              ans_score: 68,
              app_score: 73,
            }}
            onOpenStudio={() => setActiveTab("studio")}
            onResumeLesson={() => setActiveTab("studio")}
            onOpenPlan={() => setActiveTab("piano")}
            onOpenStudioTool={handleStudioTool}
            onUpload={openUpload}
          />
        ) : activeTab === "studio" ? (
          <div className="study-workspace grid min-w-0 grid-cols-12 border border-border bg-sheet text-foreground lg:grid-cols-[minmax(18rem,4fr)_minmax(0,8fr)]">
            <aside
              className={`col-span-12 min-w-0 border-b border-border bg-background lg:col-span-1 lg:border-b-0 lg:border-r ${materialsExpanded ? "block" : "hidden lg:block"}`}
            >
              <div id="study-material-controls" className={materialsExpanded ? "block" : "hidden lg:block"}>
                <div className="border-b border-border p-4">
                  <label htmlFor="visual-reading-mode" className="block text-sm font-medium">Taglio di lettura</label>
                  <select id="visual-reading-mode" defaultValue="calma" className="mt-2 min-h-11 w-full border border-input bg-sheet px-3 text-base text-foreground">
                    <option value="calma">Calma</option>
                    <option value="logica">Logica</option>
                  </select>
                  <p className="mt-2 text-sm text-muted-foreground">Testo più arioso per leggere con calma.</p>
                </div>
                <div ref={setMaterialPane} className="scroll-mt-16" />
              </div>
            </aside>
            <section aria-label="Percorso e minilezioni" className="col-span-12 min-w-0 bg-sheet lg:col-span-1">
              <StudioView
                embeddedReader
                hasFiles
                onUploadClick={openUpload}
                onCreatePathClick={openCreatePath}
                onClearContext={() => {}}
                onOpenCourseMaterials={() => {
                  setMaterialRequest({ tab: "manage" });
                  setMaterialsExpanded(true);
                }}
              />
            </section>
          </div>
        ) : (
          <section className="min-h-[50vh] p-6" aria-label="Anteprima area applicativa">
            <h1 className="text-2xl font-semibold">Anteprima {activeTab}</h1>
          </section>
        )}
      </AppLayout>

      {isLessonPreview && <LessonReaderPreview />}

      {createPortal(
        <UploadSheet
          embedded={activeTab === "studio" && !showUpload && !isLessonPreview}
          panelRequest={materialRequest}
          open={(activeTab === "studio" && !isLessonPreview) || showUpload}
          onOpenChange={handleOpenChange}
          onUpload={() => {}}
          uploadedFiles={[]}
          onFileDeleted={() => {}}
        />,
        uploaderHost,
      )}
    </MemoryRouter>
  );
}

void i18n.changeLanguage("it").then(() => {
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <VisualPreview />
    </QueryClientProvider>,
  );
});
