import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsCard } from "@/components/profile/NotificationsCard";
import { PushPrePrompt } from "@/components/focus/PushPrePrompt";
import { TimerPanel } from "@/components/focus/TimerPanel";
import {
  clearPushPromptReplanBaseline,
  getAutoReplanVersion,
  PUSH_PROMPT_COOLDOWN_MS,
  readPushPromptState,
  signalAutoReplanApplied,
} from "@/lib/pushSupport";

const mocks = vi.hoisted(() => ({
  currentUser: "student-1" as string | null,
  notifyTypes: { slot_start: false, keep_existing: true } as Record<string, unknown>,
  savedSettings: null as unknown,
  plannerEvents: [] as unknown[],
  focus: {
    task: null as null,
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
  enable: vi.fn<() => Promise<string>>(),
  subscribe: vi.fn<() => Promise<boolean>>(),
  subscriptionStatus: "not_subscribed" as "not_subscribed" | "subscribing" | "subscribed" | "failed",
  capability: "unsupported" as "supported" | "unsupported" | "denied" | "ios_needs_install",
  permission: "default" as NotificationPermission,
  toast: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: mocks.currentUser }),
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
    capability: mocks.capability,
    supported: mocks.capability === "supported",
    permission: mocks.permission,
    subscriptionStatus: mocks.subscriptionStatus,
    isSubscribed: mocks.subscriptionStatus === "subscribed",
    registrationFailed: mocks.subscriptionStatus === "failed",
    subscribe: mocks.subscribe,
    enableFromUserGesture: mocks.enable,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: { notify_types: mocks.notifyTypes }, error: null })),
    upsert: vi.fn(async (payload: unknown) => {
      mocks.savedSettings = payload;
      return { error: null };
    }),
    insert: vi.fn(async (payload: unknown) => {
      mocks.plannerEvents.push(payload);
      return { error: null };
    }),
  };
  return {
    supabase: {
      from: vi.fn(() => builder),
      auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    },
  };
});

function renderPrompt(
  sessionKey = String(Date.now()),
  capability: "supported" | "ios_needs_install" = "supported",
) {
  return render(
    <PushPrePrompt
      active
      isRunning
      sessionKey={sessionKey}
      capability={capability}
      permission="default"
      subscriptionStatus={mocks.subscriptionStatus}
      subscribe={mocks.subscribe}
      enableFromUserGesture={mocks.enable as () => Promise<"enabled" | "denied" | "dismissed" | "unsupported" | "failed">}
    />,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.currentUser = "student-1";
  mocks.notifyTypes = { slot_start: false, keep_existing: true };
  mocks.savedSettings = null;
  mocks.plannerEvents.length = 0;
  mocks.focus.phase = "focus";
  mocks.focus.isActive = true;
  mocks.focus.isRunning = true;
  mocks.focus.awaitingChoice = false;
  mocks.focus.sessionKey = null;
  mocks.enable.mockReset().mockResolvedValue("enabled");
  mocks.subscribe.mockReset().mockResolvedValue(true);
  mocks.subscriptionStatus = "not_subscribed";
  mocks.capability = "unsupported";
  mocks.permission = "default";
  mocks.toast.mockReset();
  clearPushPromptReplanBaseline();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  clearPushPromptReplanBaseline();
});

describe("PushPrePrompt", () => {
  it("does not request permission until the user clicks the action", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    const requestPermission = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    mocks.enable.mockImplementation(async () => {
      await (globalThis.Notification as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      return "enabled";
    });

    renderPrompt(String(Date.now()));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(mocks.enable).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByTestId("push-preprompt")).toBeInTheDocument();
    expect(requestPermission).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Attiva notifiche" }));
      await Promise.resolve();
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it("counts a dismissed browser permission prompt as Not now and allows the contextual second attempt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    const sessionKey = String(Date.now());
    mocks.enable.mockResolvedValue("dismissed");
    renderPrompt(sessionKey);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Attiva notifiche" }));
      await Promise.resolve();
    });
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();
    expect(readPushPromptState().dismissals).toBe(1);

    act(() => signalAutoReplanApplied());
    expect(screen.getByTestId("push-preprompt")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Attiva notifiche" }));
      await Promise.resolve();
    });
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();

    const cooldown = readPushPromptState();
    expect(cooldown.dismissals).toBe(2);
    expect(cooldown.cooldownUntil).toBe(Date.now() + PUSH_PROMPT_COOLDOWN_MS);
    expect(mocks.enable).toHaveBeenCalledTimes(2);
  });

  it("starts the in-app-only cooldown immediately and keeps it across a new session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    const view = renderPrompt(String(Date.now()), "ios_needs_install");

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    fireEvent.click(screen.getByRole("button", { name: "Usa gli avvisi nell'app" }));

    const cooldown = readPushPromptState();
    expect(cooldown.dismissals).toBe(2);
    expect(cooldown.cooldownUntil).toBe(Date.now() + PUSH_PROMPT_COOLDOWN_MS);
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();

    view.unmount();
    renderPrompt(String(Date.now()), "ios_needs_install");
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();
  });

  it("clears the error, timer prompt, and fallback note after a successful retry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    mocks.capability = "supported";
    mocks.permission = "granted";
    mocks.subscriptionStatus = "failed";
    mocks.focus.sessionKey = String(Date.now());
    mocks.subscribe.mockResolvedValue(true);
    const props = { trigger: <button type="button">Timer</button>, open: true, onOpenChange: vi.fn(), mobile: true };
    const view = render(<TimerPanel {...props} />);

    expect(screen.getByText("Senza avvisi, se blocchi lo schermo non sentirai la fine del pomodoro.")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByTestId("push-preprompt")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
      await Promise.resolve();
    });
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    mocks.subscriptionStatus = "subscribed";
    act(() => view.rerender(<TimerPanel {...props} />));
    expect(screen.queryByText("Senza avvisi, se blocchi lo schermo non sentirai la fine del pomodoro.")).not.toBeInTheDocument();
  });

  it("shows a registration error and retries without repeating the permission request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    mocks.enable.mockResolvedValue("failed");
    mocks.subscribe.mockResolvedValue(false);
    renderPrompt(String(Date.now()));

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Attiva notifiche" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
      await Promise.resolve();
    });
    expect(mocks.subscribe).toHaveBeenCalledTimes(1);
    expect(mocks.enable).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("offers a second attempt after an automatic replan, then hides for 30 days after two Not now choices", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T10:00:00.000Z"));
    const sessionKey = String(Date.now());
    const baseline = getAutoReplanVersion();
    const view = renderPrompt(sessionKey);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.getByTestId("push-preprompt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Non ora" }));
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();
    expect(readPushPromptState().dismissals).toBe(1);

    act(() => signalAutoReplanApplied());
    expect(getAutoReplanVersion()).toBe(baseline + 1);
    expect(screen.getByTestId("push-preprompt")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Non ora" }));
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();

    const cooldown = readPushPromptState();
    expect(cooldown.dismissals).toBe(2);
    expect(cooldown.cooldownUntil).toBe(Date.now() + PUSH_PROMPT_COOLDOWN_MS);

    view.rerender(
      <PushPrePrompt
        active
        isRunning
        sessionKey={String(Date.now())}
        capability="supported"
        permission="default"
        subscriptionStatus={mocks.subscriptionStatus}
        subscribe={mocks.subscribe}
        enableFromUserGesture={mocks.enable as () => Promise<"enabled" | "denied" | "dismissed" | "unsupported" | "failed">}
      />,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(screen.queryByTestId("push-preprompt")).not.toBeInTheDocument();
  });
});

describe("TimerPanel in-app fallback", () => {
  it("shows the honest locked-screen note and restores the browser title after the Pomodoro boundary", () => {
    const originalTitle = document.title;
    mocks.focus.awaitingChoice = true;
    const props = { trigger: <button type="button">Timer</button>, open: true, onOpenChange: vi.fn(), mobile: true };
    const view = render(<TimerPanel {...props} />);

    expect(screen.getByText("Senza avvisi, se blocchi lo schermo non sentirai la fine del pomodoro.")).toBeInTheDocument();
    expect(document.title).toBe("⏸ Pausa! · Erga");

    mocks.focus.awaitingChoice = false;
    act(() => view.rerender(<TimerPanel {...props} />));
    expect(document.title).toBe(originalTitle);
  });
});

describe("NotificationsCard settings", () => {
  it("does not report notifications active after permission until registration succeeds", async () => {
    mocks.capability = "supported";
    mocks.permission = "granted";
    mocks.subscriptionStatus = "failed";
    mocks.subscribe.mockResolvedValue(false);
    render(<NotificationsCard />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Non è stato possibile registrare/);
    expect(screen.queryByText("Notifiche attive su questo dispositivo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    await waitFor(() => expect(mocks.subscribe).toHaveBeenCalledTimes(1));
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(screen.queryByText("Notifiche attive su questo dispositivo")).not.toBeInTheDocument();
  });

  it("defaults hide_subject to off and saves it without losing other notify_types keys", async () => {
    mocks.notifyTypes = { slot_start: false, keep_existing: true };
    render(<NotificationsCard />);

    const hideSubject = await screen.findByRole("switch", { name: "Nascondi la materia nei banner" });
    expect(hideSubject).toHaveAttribute("aria-checked", "false");

    fireEvent.click(hideSubject);
    await waitFor(() => expect(mocks.savedSettings).not.toBeNull());

    const saved = mocks.savedSettings as { user_id: string; notify_types: Record<string, unknown> };
    expect(saved.user_id).toBe("student-1");
    expect(saved.notify_types).toMatchObject({
      slot_start: false,
      pomodoro: true,
      overrun: true,
      evening_summary: true,
      hide_subject: true,
      keep_existing: true,
    });
  });
});
