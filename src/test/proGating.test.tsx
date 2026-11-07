import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { calculateSpeedFactor, type ReadingSpeedSample } from "@/lib/planner/speed";

const mocks = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn();

  return {
    isPro: false,
    subscriptionLoading: false,
    userId: "student-1" as string | null,
    readingLogs: [] as ReadingSpeedSample[],
    readingLogsByUser: {} as Record<string, ReadingSpeedSample[]>,
    queryError: null as Error | null,
    queriedUserIds: [] as string[],
    builder,
    from: vi.fn(() => builder),
    focus: {
      task: null,
      phase: "focus",
      remaining: 25 * 60,
      overrun: 0,
      isActive: true,
      isRunning: true,
      isSyncing: false,
      sessionKey: null as string | null,
      awaitingChoice: false,
      toggleRun: vi.fn(),
      addFiveMinutes: vi.fn(),
      endWithReason: vi.fn(),
    },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: mocks.userId,
    session: mocks.userId ? { user: { id: mocks.userId } } : null,
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: mocks.isPro ? "pro" : "free",
    isPro: mocks.isPro,
    isBetaTester: false,
    hasActiveSubscription: mocks.isPro,
    loading: mocks.subscriptionLoading,
  }),
}));

vi.mock("@/contexts/FocusContext", () => ({
  useFocus: () => mocks.focus,
  useOptionalFocus: () => mocks.focus,
  formatMMSS: (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  },
}));

vi.mock("@/hooks/usePushNotifications", () => ({
  usePushNotifications: () => ({
    capability: "unsupported",
    permission: "default",
    subscriptionStatus: "not_subscribed",
    isSubscribed: false,
    subscribe: vi.fn(async () => false),
    enableFromUserGesture: vi.fn(async () => "unsupported"),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

import { TimerPanel } from "@/components/focus/TimerPanel";
import { PlanSlot, type PlanSlotData } from "@/components/piano/PlanSlot";
import { ProExplainer } from "@/components/piano/ProExplainer";
import { ProLabel } from "@/components/piano/ProLabel";
import { ProNudgeCard } from "@/components/piano/ProNudgeCard";
import { hasFeature } from "@/lib/features";

function measuredLog(index: number, overrides: Partial<ReadingSpeedSample> = {}): ReadingSpeedSample {
  return {
    active_seconds: 600,
    base_estimate_min: 10,
    completed_at: `2026-11-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
    subject: "Biologia",
    subject_type: "scientifico",
    ...overrides,
  };
}

const studySlot = (overrides: Partial<PlanSlotData> = {}): PlanSlotData => ({
  id: "estimate-slot",
  kind: "study",
  title: "Ripasso cellule",
  subject: "Biologia",
  startTime: "15:00",
  endTime: "16:38",
  durationMinutes: 98,
  lessonFrom: 0,
  lessonTo: 2,
  status: "planned",
  ...overrides,
});

function renderTimerPanel(mobile = true) {
  return render(
    <TimerPanel
      trigger={<button type="button">Timer</button>}
      open
      onOpenChange={vi.fn()}
      mobile={mobile}
    />,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage("it");
  window.localStorage.clear();
  mocks.isPro = false;
  mocks.subscriptionLoading = false;
  mocks.userId = "student-1";
  mocks.readingLogs = [];
  mocks.readingLogsByUser = {};
  mocks.queryError = null;
  mocks.queriedUserIds = [];
  mocks.from.mockClear().mockImplementation(() => mocks.builder);
  mocks.builder.select.mockClear().mockImplementation(() => mocks.builder);
  mocks.builder.eq.mockReset().mockImplementation(async (_column: string, userId: unknown) => {
    const key = String(userId);
    mocks.queriedUserIds.push(key);
    const data = Object.prototype.hasOwnProperty.call(mocks.readingLogsByUser, key)
      ? mocks.readingLogsByUser[key]
      : mocks.readingLogs;
    return { data, error: mocks.queryError };
  });
  Object.values(mocks.focus).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  });
});

afterEach(async () => {
  cleanup();
  window.localStorage.clear();
  await i18n.changeLanguage("it");
});

describe("struttura Free/Pro del Piano", () => {
  it("applica il flag Pro alle sole funzioni richieste", () => {
    expect(hasFeature("speed_learning", false)).toBe(false);
    expect(hasFeature("custom_pomodoro", false)).toBe(false);
    expect(hasFeature("speed_learning", true)).toBe(true);
    expect(hasFeature("custom_pomodoro", true)).toBe(true);
  });

  it("mostra l'etichetta Pro con bordo e testo cognitive da 14px", () => {
    render(<ProLabel data-testid="pro-label" />);
    const label = screen.getByTestId("pro-label");

    expect(label).toHaveTextContent("Pro");
    expect(label).toHaveClass("border", "border-cognitive", "text-sm", "text-cognitive");
  });

  it("spiega le funzioni del Piano senza prezzo né checkout nei componenti nuovi", () => {
    render(<ProExplainer open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Funzioni Pro nel Piano" })).toBeInTheDocument();
    expect(screen.getByText(/personalizzare le stime future/i)).toBeInTheDocument();
    expect(screen.getByText(/durata delle fasi di focus e delle pause/i)).toBeInTheDocument();

    const newComponents = [
      "src/components/piano/ProLabel.tsx",
      "src/components/piano/ProExplainer.tsx",
      "src/components/piano/ProNudgeCard.tsx",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");
    expect(newComponents).not.toContain("€");
    expect(newComponents).not.toMatch(/openCheckout/i);
  });

  it("mantiene il testo Free e non inventa misurazioni Pro quando non ce ne sono", async () => {
    const freeView = render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);

    expect(screen.getByText(/1 ora e 38 minuti/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    expect(await screen.findByText("Stima basata su lunghezza della lezione e tipo di materia. Con Pro la stima impara dalla tua velocità reale.")).toBeInTheDocument();

    freeView.unmount();
    mocks.isPro = true;
    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    expect(await screen.findByText("Nessuna misurazione ancora per Biologia.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/\d/);
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("mantiene il caricamento neutro e il messaggio Free dopo la verifica del tier", async () => {
    mocks.subscriptionLoading = true;
    const view = render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));

    expect(await screen.findByText("Caricamento delle informazioni sulla stima…")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/\d/);
    mocks.subscriptionLoading = false;
    view.rerender(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    expect(await screen.findByText("Stima basata su lunghezza della lezione e tipo di materia. Con Pro la stima impara dalla tua velocità reale.")).toBeInTheDocument();
  });

  it("non usa misurazioni di altre materie per il fattore dello slot", async () => {
    mocks.isPro = true;
    mocks.readingLogs = [measuredLog(0, { subject: "Matematica", active_seconds: 1_440 })];
    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));

    expect(await screen.findByText("Nessuna misurazione ancora per Biologia.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/\d/);
  });

  it("mostra fattore reale e singolare in italiano", async () => {
    mocks.isPro = true;
    const samples = [measuredLog(0, { active_seconds: 1_200 })];
    mocks.readingLogs = samples;
    const expected = calculateSpeedFactor("Biologia", "scientifico", samples);
    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));

    const factor = new Intl.NumberFormat("it", { maximumFractionDigits: 1 }).format(expected.explanation.factor);
    expect(await screen.findByText(
      `Biologia: di solito ci metti ${factor} volte la stima (${expected.n} lezione misurata)`,
    )).toBeInTheDocument();
    expect(mocks.builder.eq).toHaveBeenCalledWith("user_id", "student-1");
  });

  it("mostra fattore reale, numeri inglesi e plurale in inglese", async () => {
    await i18n.changeLanguage("en");
    mocks.isPro = true;
    const samples = [
      measuredLog(0, { active_seconds: 720, subject: "Biology" }),
      measuredLog(1, { active_seconds: 1_080, subject: "Biology" }),
      measuredLog(2, { active_seconds: 1_440, subject: "Mathematics" }),
    ];
    mocks.readingLogs = samples;
    const expected = calculateSpeedFactor("Biology", "scientifico", samples);
    render(<ol role="list"><PlanSlot slot={studySlot({ subject: "Biology" })} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "About this estimate" }));

    const factor = new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(expected.explanation.factor);
    expect(await screen.findByText(
      `Biology: you usually take ${factor} times the estimate (${expected.n} measured lessons)`,
    )).toBeInTheDocument();
  });

  it("gestisce caricamento ed errore senza mostrare fattori fittizi", async () => {
    mocks.isPro = true;
    let resolveQuery: ((value: { data: ReadingSpeedSample[]; error: Error | null }) => void) | undefined;
    mocks.builder.eq.mockImplementationOnce(() => new Promise((resolve) => {
      resolveQuery = resolve;
    }));
    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));

    expect(await screen.findByText("Caricamento delle tue misurazioni…")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/\d/);
    if (!resolveQuery) throw new Error("La query delle misurazioni non è stata avviata");
    resolveQuery({ data: [measuredLog(0, { active_seconds: 1_200 })], error: null });
    expect(await screen.findByText(/Biologia: di solito ci metti 1,2 volte la stima/)).toBeInTheDocument();

    cleanup();
    mocks.queryError = new Error("offline");
    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    expect(await screen.findByText("Non è stato possibile caricare le tue misurazioni.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/\d/);
  });

  it("isola i dati quando cambia account e li cancella al logout", async () => {
    mocks.isPro = true;
    mocks.userId = "account-a";
    const resolvers: Record<string, (value: { data: ReadingSpeedSample[]; error: Error | null }) => void> = {};
    mocks.builder.eq.mockImplementation((_column: string, userId: unknown) => new Promise((resolve) => {
      resolvers[String(userId)] = resolve;
    }));

    const view = render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    await waitFor(() => expect(resolvers["account-a"]).toBeDefined());

    mocks.userId = "account-b";
    mocks.subscriptionLoading = true;
    view.rerender(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    expect(screen.getByText("Caricamento delle informazioni sulla stima…")).toBeInTheDocument();
    expect(screen.queryByText(/volte la stima/)).not.toBeInTheDocument();

    await act(async () => {
      resolvers["account-a"]({ data: [measuredLog(0, { active_seconds: 1_200 })], error: null });
      await Promise.resolve();
    });
    expect(screen.queryByText(/volte la stima/)).not.toBeInTheDocument();
    mocks.subscriptionLoading = false;
    view.rerender(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    await waitFor(() => expect(resolvers["account-b"]).toBeDefined());
    expect(screen.getByText("Caricamento delle tue misurazioni…")).toBeInTheDocument();
    await act(async () => {
      resolvers["account-b"]({ data: [measuredLog(0, { active_seconds: 300 })], error: null });
      await Promise.resolve();
    });
    expect(await screen.findByText(/Biologia: di solito ci metti 0,9 volte la stima/)).toBeInTheDocument();
    expect(mocks.builder.eq).toHaveBeenCalledWith("user_id", "account-a");
    expect(mocks.builder.eq).toHaveBeenCalledWith("user_id", "account-b");

    mocks.userId = null;
    mocks.subscriptionLoading = true;
    view.rerender(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    expect(screen.getByText("Caricamento delle informazioni sulla stima…")).toBeInTheDocument();
    expect(screen.queryByText(/volte la stima/)).not.toBeInTheDocument();

    mocks.isPro = false;
    mocks.subscriptionLoading = false;
    view.rerender(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    expect(await screen.findByText("Stima basata su lunghezza della lezione e tipo di materia. Con Pro la stima impara dalla tua velocità reale.")).toBeInTheDocument();
    expect(screen.queryByText(/volte la stima/)).not.toBeInTheDocument();
  });

  it("mostra nel TimerPanel la riga informativa sul Pomodoro personalizzato Pro solo a Free", () => {
    const freeView = renderTimerPanel();
    expect(screen.getByText("Pomodoro personalizzato · Pro")).toBeInTheDocument();
    freeView.unmount();

    mocks.isPro = true;
    renderTimerPanel();
    expect(screen.queryByText("Pomodoro personalizzato · Pro")).not.toBeInTheDocument();
  });

  it("mostra il nudge dopo cinque lezioni misurate, apre ProExplainer e non riappare dopo il rifiuto", async () => {
    mocks.readingLogs = Array.from({ length: 5 }, (_, index) => measuredLog(index));
    const firstView = render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));

    const discoverButton = await screen.findByRole("button", { name: "Scopri Pro" });
    fireEvent.click(discoverButton);
    expect(await screen.findByRole("heading", { name: "Funzioni Pro nel Piano" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Funzioni Pro nel Piano" })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Non mi interessa" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Scopri Pro" })).not.toBeInTheDocument());
    firstView.unmount();

    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    expect(screen.queryByRole("button", { name: "Scopri Pro" })).not.toBeInTheDocument();
  });

  it("non mostra il nudge prima di cinque misurazioni valide o a Pro", async () => {
    mocks.readingLogs = [
      measuredLog(0),
      measuredLog(1),
      measuredLog(2),
      measuredLog(3),
      { ...measuredLog(4), active_seconds: 30 },
    ];
    render(<ProNudgeCard userId="student-1" isPro={false} />);
    await waitFor(() => expect(mocks.builder.eq).toHaveBeenCalledOnce());
    expect(screen.queryByRole("button", { name: "Scopri Pro" })).not.toBeInTheDocument();

    cleanup();
    mocks.readingLogs = Array.from({ length: 5 }, (_, index) => measuredLog(index));
    render(<ProNudgeCard userId="student-1" isPro />);
    expect(screen.queryByRole("button", { name: "Scopri Pro" })).not.toBeInTheDocument();
  });
});
