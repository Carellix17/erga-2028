import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioView } from "@/components/studio/StudioView";
import { lessonsKeys, type StudyContextSummary } from "@/hooks/useLessons";
import { rejectedGenerationState } from "../../supabase/functions/_shared/studyMaterial";
import { SaveStatusProvider } from "@/contexts/SaveStatusContext";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "user-1" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/usePushNotifications", () => ({ usePushNotifications: () => ({ supported: false }) }));
vi.mock("@/hooks/useSubjectAccent", () => ({ useSubjectAccent: vi.fn() }));
vi.mock("@/lib/subjectFamily", () => ({ fetchContextSubjectInfo: vi.fn().mockResolvedValue({ subject_family: "umanistiche" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { last_studio_context_id: "bad" } }) }) }),
    update: () => ({ eq: async () => ({ error: null }) }),
  }) },
}));
vi.mock("@/lib/edgeFetch", () => ({ edgeFetch: vi.fn().mockResolvedValue({ lessons: [], unlimited: true }) }));
vi.mock("@/components/studio/PathHero", () => ({ PathHero: ({ title }: { title: string }) => <h2>{title}</h2> }));
vi.mock("@/components/studio/ModulesOverview", () => ({ MODULES_LAYER_ID: "modules", ModulesOverview: () => null }));

const bad: StudyContextSummary = { id: "bad", file_name: "Foto", created_at: "2026-10-17", processing_status: "completed", ...rejectedGenerationState() };
const previous: StudyContextSummary = { id: "previous", file_name: "Storia.pdf", created_at: "2026-10-16", processing_status: "completed", generation_status: "idle", lesson_count: 1 };

function setup(context: StudyContextSummary = bad) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(lessonsKeys.contexts("user-1"), [context, previous]);
  client.setQueryData(lessonsKeys.list("user-1", "bad"), { lessons: [], currentIndex: 0 });
  client.setQueryData(lessonsKeys.list("user-1", "previous"), {
    lessons: [{ id: "l1", title: "Medioevo", lesson_order: 0, is_generated: true }], currentIndex: 0,
  });
  const onUploadClick = vi.fn();
  render(<QueryClientProvider client={client}><SaveStatusProvider><StudioView hasFiles onUploadClick={onUploadClick} /></SaveStatusProvider></QueryClientProvider>);
  return { client, onUploadClick };
}

describe("Studio dopo una generazione fallita", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra il rifiuto senza rigenerazione o loader e permette di caricare altri materiali", async () => {
    const { onUploadClick } = setup();
    expect(await screen.findByText("Generazione impossibile")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("i file non contengono materiale didattico utilizzabile");
    expect(screen.queryByRole("button", { name: "Genera percorso" })).not.toBeInTheDocument();
    expect(screen.queryByText("Erga sta trasformando il tuo materiale")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Carica altri materiali" }));
    expect(onUploadClick).toHaveBeenCalledOnce();
  });

  it("consente di aprire davvero un percorso precedente dalla schermata di errore", async () => {
    setup();
    await screen.findByText("Generazione impossibile");
    fireEvent.click(screen.getByRole("button", { name: /Foto.*Percorso attivo/ }));
    fireEvent.click(await screen.findByText("Storia"));
    await waitFor(() => expect(screen.queryByText("Generazione impossibile")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Storia" })).toBeInTheDocument();
  });

  it("tratta un vecchio fallimento di estrazione come terminale anche con un job rimasto generating", async () => {
    setup({ ...bad, processing_status: "failed", generation_status: "generating", error_message: "Impossibile estrarre contenuto sufficiente dalle immagini. Prova con foto più nitide." });
    expect(await screen.findByText("Generazione impossibile")).toBeInTheDocument();
    expect(screen.queryByText("Erga sta trasformando il tuo materiale")).not.toBeInTheDocument();
  });

  it("mantiene il tentativo manuale per gli errori temporanei", async () => {
    setup({ ...bad, generation_error: "Servizio AI temporaneamente occupato" });
    expect(await screen.findByText("Generazione non riuscita")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Genera percorso" })).toBeEnabled();
  });

  it("consente di valutare materiale nuovo senza mostrare il vecchio rifiuto", async () => {
    setup({ ...bad, new_material_pending: true });
    expect(await screen.findByRole("button", { name: "Genera percorso" })).toBeEnabled();
    expect(screen.queryByText("Generazione impossibile")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
