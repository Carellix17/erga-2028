import { MotionPreferences } from "@/components/shared/MotionPreferences";
import { AppointmentsCalendar } from "@/components/piano/AppointmentsCalendar";
import { InteractionFeedback } from "@/components/shared/InteractionFeedback";
import { addDays, format } from "date-fns";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";
import { HomeView } from "@/components/home/HomeView";
import { StudioView } from "@/components/studio/StudioView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { LessonReaderPreview } from "./LessonReaderPreview";
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
    requestedView === "piano" ? "piano" : requestedView === "studio" || isLessonPreview ? "studio" : "home",
  );
  const [showUpload, setShowUpload] = useState(false);
  const [materialRequest, setMaterialRequest] = useState<MaterialRequest>(null);
  const [uploaderHost] = useState(() => document.createElement("div"));

  // Mirror Index's portal target without mounting Index or its cloud queries.
  useEffect(() => {
    document.body.appendChild(uploaderHost);
    return () => uploaderHost.remove();
  }, [uploaderHost]);

  useEffect(() => {
    document.documentElement.dataset.visualReady = "true";
  }, []);

  const openUpload = () => {
    setMaterialRequest({ tab: "loading" });
    setShowUpload(true);
  };

  // Same sheet as Index.openCreatePath; the rest of Index is intentionally
  // absent so this fixture cannot trigger product mutations.
  const openCreatePath = () => {
    openUpload();
  };

  const handleOpenChange = (open: boolean) => {
    setShowUpload(open);
    if (!open) setMaterialRequest(null);
  };

  const handleStudioTool = (_tool: StudioTool) => setActiveTab("studio");

  return (
    <MemoryRouter initialEntries={["/app"]}>
      <InteractionFeedback />
      <p className="sr-only">Anteprima isolata · Dati dimostrativi · Nessun accesso al tuo account</p>
      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hideChrome={isLessonPreview}
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
          <section aria-label="Percorso e minilezioni" data-studio="" className="study-workspace room-fade min-w-0 bg-[#0a0a0a] text-foreground">
            <StudioView
              embeddedReader
              hasFiles
              onUploadClick={openUpload}
              onCreatePathClick={openCreatePath}
              onClearContext={() => {}}
              onOpenCourseMaterials={() => {
                setMaterialRequest({ tab: "manage" });
                setShowUpload(true);
              }}
            />
          </section>
        ) : activeTab === "piano" ? (
          <AppointmentsCalendar evaluations={[
            { id: "demo-eval-today", title: "Interrogazione sul moto", subject_id: "demo-physics", type: "orale" as const, date: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(), topic_type: "linked" as const, topic_id: "demo-course" },
            { id: "demo-eval-history", title: "La rivoluzione francese", subject_id: "demo-history", type: "scritta" as const, date: format(addDays(new Date(), 2), "yyyy-MM-dd"), topic_type: "free" as const, topic_id: null },
          ].map((event) => ({ ...event, user_id: "demo", description: null, free_topic_title: null, goal: null, is_completed: false, created_at: "2026-11-01" }))} events={[
            { id: "demo-today", title: "Ripasso: il moto rettilineo", subject: "Fisica", event_date: format(new Date(), "yyyy-MM-dd"), event_time: "15:30", event_type: "study" },
            { id: "demo-tomorrow", title: "Verifica sui Promessi sposi", subject: "Italiano", event_date: format(addDays(new Date(), 1), "yyyy-MM-dd"), event_type: "test" },
            ...[
              { subject: "Matematica", title: "Verifica sulle funzioni", days: 4 },
              { subject: "Inglese", title: "Interrogazione di inglese", days: 5 },
              { subject: "Scienze", title: "La struttura della cellula", days: 7 },
              { subject: "Filosofia", title: "Socrate e Platone", days: 8 },
              { subject: "Arte", title: "Il Rinascimento", days: 10 },
            ].map((event, index) => ({ id: `demo-deadline-${index}`, title: event.title, subject: event.subject, event_date: format(addDays(new Date(), event.days), "yyyy-MM-dd"), event_type: "test" as const })),
            { id: "demo-extra", title: "Allenamento di pallavolo", subject: "Altro", event_date: format(new Date(), "yyyy-MM-dd"), event_time: "18:00", event_type: "assignment" },
            { id: "demo-all-day", title: "Consegna ricerca di storia", subject: "Storia", event_date: format(new Date(), "yyyy-MM-dd"), event_type: "assignment" },
            { id: "demo-simultaneous", title: "Ripasso delle formule", subject: "Fisica", event_date: format(new Date(), "yyyy-MM-dd"), event_time: "15:30", event_type: "study" },
            { id: "demo-week", title: "Esercizi sulle disequazioni", subject: "Matematica", event_date: format(addDays(new Date(), 3), "yyyy-MM-dd"), event_time: "16:00", event_type: "assignment" },
          ]} subjects={[
            { id: "demo-physics", user_id: "demo", name: "Fisica", color: null },
            { id: "demo-history", user_id: "demo", name: "Storia", color: null },
          ]} courses={[{ id: "demo-course", file_name: "Fisica: il moto rettilineo.pdf" }]} exitingIds={[]} onAddEvent={() => window.alert("Anteprima: aggiunta evento dimostrativa.")} showGeneratePlan onPreparePlan={() => window.alert("Anteprima: nessuna generazione AI viene eseguita.")} isPreparingPlan={false} onOpenHistory={() => window.alert("Anteprima: cronologia modifiche.")} onEditEvaluation={() => {}} onEditStudyEvent={() => {}} onDeleteEvaluation={() => {}} onDeleteStudyEvent={() => {}} />
        ) : (
          <section className="min-h-[50vh] p-6" aria-label="Anteprima area applicativa">
            <h1 className="text-2xl font-semibold">Anteprima {activeTab}</h1>
          </section>
        )}
      </AppLayout>

      {isLessonPreview && <LessonReaderPreview />}

      {createPortal(
        <UploadSheet
          panelRequest={materialRequest}
          open={showUpload}
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
      <MotionPreferences><SaveStatusProvider><VisualPreview /></SaveStatusProvider></MotionPreferences>
    </QueryClientProvider>,
  );
});
