import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsCard } from "@/components/profile/NotificationsCard";
import { TimerPanel } from "@/components/focus/TimerPanel";

const mocks = vi.hoisted(() => ({
  permission: "default" as NotificationPermission,
  requestPermission: vi.fn<() => Promise<NotificationPermission>>(),
  getSubscription: vi.fn<() => Promise<PushSubscription | null>>(),
  createSubscription: vi.fn<() => Promise<PushSubscription>>(),
  getSession: vi.fn(),
  fetch: vi.fn(),
  toast: vi.fn(),
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
}));

vi.mock("@/lib/pushSupport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/pushSupport")>();
  return { ...actual, detectPushCapability: () => "supported" };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ currentUser: null }),
}));

vi.mock("@/contexts/FocusContext", () => ({
  useFocus: () => mocks.focus,
  useOptionalFocus: () => mocks.focus,
  formatMMSS: (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: { notify_types: {} }, error: null })),
    upsert: vi.fn(async () => ({ error: null })),
    insert: vi.fn(async () => ({ error: null })),
  };
  return {
    supabase: {
      from: vi.fn(() => builder),
      auth: { getSession: mocks.getSession },
    },
  };
});

import { usePushNotifications } from "@/hooks/usePushNotifications";

const subscription = {
  toJSON: () => ({ endpoint: "https://push.example.test/subscription" }),
} as PushSubscription;

function TimerPanelForTest() {
  return (
    <TimerPanel
      trigger={<button type="button">Timer</button>}
      open
      onOpenChange={vi.fn()}
      mobile={false}
    />
  );
}

describe("usePushNotifications permission and registration", () => {
  beforeEach(() => {
    mocks.permission = "default";
    mocks.requestPermission.mockReset().mockImplementation(async () => {
      mocks.permission = "granted";
      return "granted";
    });
    mocks.getSubscription.mockReset().mockResolvedValue(null);
    mocks.createSubscription.mockReset().mockResolvedValue(subscription);
    mocks.getSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "test-access-token" } },
    });
    mocks.fetch.mockReset().mockResolvedValue({ ok: true });
    mocks.toast.mockReset();
    mocks.focus.sessionKey = null;

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: mocks.getSubscription,
            subscribe: mocks.createSubscription,
          },
        }),
      },
    });
    vi.stubGlobal("Notification", {
      get permission() { return mocks.permission; },
      requestPermission: mocks.requestPermission,
    });
    vi.stubGlobal("fetch", mocks.fetch);

    // Reset the module-level snapshot left by the preceding case without
    // triggering startup sync (permission is still default here).
    const reset = renderHook(() => usePushNotifications());
    reset.unmount();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
  });

  it("subscribe does not request permission or subscribe while permission is default", async () => {
    const { result } = renderHook(() => usePushNotifications());
    let succeeded: boolean | undefined;

    await act(async () => {
      succeeded = await result.current.subscribe();
    });

    expect(succeeded).toBe(false);
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.getSubscription).not.toHaveBeenCalled();
    expect(mocks.createSubscription).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("automatically registers an existing browser subscription and shares active state between surfaces", async () => {
    mocks.permission = "granted";
    mocks.getSubscription.mockResolvedValue(subscription);

    const hookA = renderHook(() => usePushNotifications());
    const hookB = renderHook(() => usePushNotifications());
    render(
      <>
        <NotificationsCard />
        <TimerPanelForTest />
      </>,
    );

    await waitFor(() => expect(hookA.result.current.isSubscribed).toBe(true));
    expect(hookB.result.current.isSubscribed).toBe(true);
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.getSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.createSubscription).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Notifiche attive su questo dispositivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invia notifica di test" })).toBeEnabled();
    expect(screen.queryByText("Senza avvisi, se blocchi lo schermo non sentirai la fine del pomodoro.")).not.toBeInTheDocument();

    const laterMount = renderHook(() => usePushNotifications());
    await waitFor(() => expect(laterMount.result.current.isSubscribed).toBe(true));
    expect(mocks.getSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("stays not_subscribed when the silent check finds no browser subscription", async () => {
    mocks.permission = "granted";
    mocks.getSubscription.mockResolvedValue(null);
    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => expect(mocks.getSubscription).toHaveBeenCalledTimes(1));
    expect(result.current.subscriptionStatus).toBe("not_subscribed");
    expect(result.current.isSubscribed).toBe(false);
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.createSubscription).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("shows retry after silent registration fails and retries without requesting permission", async () => {
    mocks.permission = "granted";
    mocks.getSubscription.mockResolvedValue(subscription);
    mocks.fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => usePushNotifications());
    render(<NotificationsCard />);

    await waitFor(() => expect(result.current.registrationFailed).toBe(true));
    expect(await screen.findByRole("alert")).toHaveTextContent(/registrare il dispositivo/i);
    const retry = screen.getByRole("button", { name: "Riprova" });

    await act(async () => { fireEvent.click(retry); });
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.createSubscription).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Notifiche attive su questo dispositivo")).toBeInTheDocument();
  });

  it("enableFromUserGesture requests permission and registers exactly one subscription", async () => {
    const { result } = renderHook(() => usePushNotifications());
    let outcome: string | undefined;

    await act(async () => {
      outcome = await result.current.enableFromUserGesture();
    });

    expect(outcome).toBe("enabled");
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1);
    expect(mocks.getSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.createSubscription).toHaveBeenCalledTimes(1);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.permission).toBe("granted");
    expect(result.current.subscriptionStatus).toBe("subscribed");
    expect(result.current.isSubscribed).toBe(true);
  });
});
