import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EserciziView } from "@/components/pratica/EserciziView";
import { InterrogazioneView } from "@/components/pratica/InterrogazioneView";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: "user-1" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    supported: false,
    permission: "default",
    subscribe: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe("Pratica integrata in Studio con contesto selezionato", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes("get-lessons")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              contexts: [{ id: "ctx-1", file_name: "Fisica.pdf" }],
              lessons: [
                { id: "l1", title: "Cinematica", lesson_order: 0 },
                { id: "l2", title: "Dinamica", lesson_order: 1 },
              ],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("EserciziView con contextId salta la schermata di selezione corso", async () => {
    render(<EserciziView contextId="ctx-1" contextName="Fisica" />);

    expect(screen.getByText("Esercizi Mirati")).toBeInTheDocument();
    expect(screen.getByText("Genera esercizi")).toBeInTheDocument();
    expect(screen.queryByText("Scegli un corso per iniziare")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Genera esercizi"));

    expect(await screen.findByText("Scegli le lezioni")).toBeInTheDocument();
    expect(screen.getByText("1. Cinematica")).toBeInTheDocument();
    expect(screen.getByText("2. Dinamica")).toBeInTheDocument();
    expect(screen.queryByText("Scegli un corso per iniziare")).not.toBeInTheDocument();
  });

  it("P42: EserciziView avvisa il contenitore quando si lascia il menu (sheet → schermo intero)", async () => {
    const onSessionStart = vi.fn();
    render(<EserciziView contextId="ctx-1" contextName="Fisica" onSessionStart={onSessionStart} />);

    expect(screen.getByText("Genera esercizi")).toBeInTheDocument();
    expect(onSessionStart).not.toHaveBeenCalled(); // ancora nella schermata di scelta

    fireEvent.click(screen.getByText("Genera esercizi"));
    await waitFor(() => expect(onSessionStart).toHaveBeenCalledTimes(1));
  });

  it("P42: InterrogazioneView avvisa il contenitore al click su Domande/Esposizione", async () => {
    const onSessionStart = vi.fn();
    render(<InterrogazioneView contextId="ctx-1" contextName="Fisica" onSessionStart={onSessionStart} />);

    const domande = await screen.findByText("Domande");
    expect(onSessionStart).not.toHaveBeenCalled();

    fireEvent.click(domande);
    await waitFor(() => expect(onSessionStart).toHaveBeenCalledTimes(1));
  });

  it("InterrogazioneView con contextId mostra direttamente le modalità per il corso selezionato", async () => {
    render(<InterrogazioneView contextId="ctx-1" contextName="Fisica" />);

    expect(await screen.findByText("Interrogazione")).toBeInTheDocument();
    expect(screen.getByText("Simulazione su: Fisica")).toBeInTheDocument();
    expect(screen.getByText("Domande")).toBeInTheDocument();
    expect(screen.getByText("Esposizione")).toBeInTheDocument();
    expect(screen.queryByText("Scegli il corso:")).not.toBeInTheDocument();
  });

  it("P2: una sessione a domande produce UNA sola chiamata evaluate, alla fine", async () => {
    const recognition: Record<string, unknown> & { onresult?: (e: unknown) => void } = {
      lang: "",
      interimResults: false,
      continuous: false,
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
    };
    (window as unknown as Record<string, unknown>).SpeechRecognition = vi.fn(() => recognition);

    const calls: string[] = [];
    let askCount = 0;
    global.fetch = vi.fn().mockImplementation((url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      if (String(url).includes("get-lessons")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contexts: [{ id: "ctx-1", file_name: "Fisica.pdf" }] }),
        });
      }
      if (String(url).includes("/interrogazione")) {
        calls.push(body.action);
        if (body.action === "ask") {
          askCount += 1;
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ question: `Domanda ${askCount}` }) });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              scores: (body.transcript ?? []).map((_: unknown, i: number) => ({ question: i + 1, score: 7 })),
              average: 7,
              considerations: "Analisi finale",
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<InterrogazioneView contextId="ctx-1" contextName="Fisica" />);

    fireEvent.click(await screen.findByText("Domande"));
    fireEvent.click(await screen.findByText("Avvia Interrogazione"));
    await screen.findByText("Domanda 1");

    for (let turn = 1; turn <= 5; turn++) {
      await waitFor(() => expect(screen.getByText("Invia risposta")).not.toBeDisabled = undefined as never, { timeout: 0 }).catch(() => {});
      recognition.onresult?.({
        resultIndex: 0,
        results: [{ 0: { transcript: `risposta ${turn}` }, isFinal: true, length: 1 }],
      });
      await waitFor(() => expect(screen.getByText(`risposta ${turn}`)).toBeInTheDocument());
      fireEvent.click(screen.getByText("Invia risposta"));
      if (turn < 5) {
        await screen.findByText(`Domanda ${turn + 1}`);
        expect(screen.getAllByText("Ok! Prossima domanda.").length).toBe(turn);
      }
    }

    expect(await screen.findByText("Report finale")).toBeInTheDocument();
    expect(calls.filter((a) => a === "evaluate")).toHaveLength(1);
    expect(calls.filter((a) => a === "ask")).toHaveLength(5);
  });
});

