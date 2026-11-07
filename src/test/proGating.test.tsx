import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn();

  return {
    isPro: false,
    subscriptionLoading: false,
    userId: "student-1" as string | null,
    readingLogs: [] as Array<Record<string, unknown>>,
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

function measuredLog(index: number) {
  return {
    active_seconds: 600,
    base_estimate_min: 10,
    completed_at: `2026-11-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
    subject: "Biologia",
    subject_type: "scientifico",
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

beforeEach(() => {
  window.localStorage.clear();
  mocks.isPro = false;
  mocks.subscriptionLoading = false;
  mocks.userId = "student-1";
  mocks.readingLogs = [];
  mocks.from.mockClear().mockImplementation(() => mocks.builder);
  mocks.builder.select.mockClear().mockImplementation(() => mocks.builder);
  mocks.builder.eq.mockReset().mockImplementation(async () => ({ data: mocks.readingLogs, error: null }));
  Object.values(mocks.focus).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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

  it("mostra la spiegazione della stima per Free e Pro senza nascondere i tempi reali", async () => {
    const view = render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);

    expect(screen.getByText(/1 ora e 38 minuti/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    expect(await screen.findByText("Stima basata su lunghezza della lezione e tipo di materia. Con Pro la stima impara dalla tua velocità reale.")).toBeInTheDocument();

    view.unmount();
    mocks.isPro = true;
    render(<ol role="list"><PlanSlot slot={studySlot()} /></ol>);
    fireEvent.click(screen.getByRole("button", { name: "Informazioni sulla stima" }));
    expect(await screen.findByText("Biologia: di solito ci metti 1,2 volte la stima (8 lezioni misurate)")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
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
