import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permission: "default" as NotificationPermission,
  requestPermission: vi.fn<() => Promise<NotificationPermission>>(),
  getSubscription: vi.fn<() => Promise<PushSubscription | null>>(),
  createSubscription: vi.fn<() => Promise<PushSubscription>>(),
  getSession: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/pushSupport", () => ({
  detectPushCapability: () => "supported",
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
  },
}));

import { usePushNotifications } from "@/hooks/usePushNotifications";

const subscription = {
  toJSON: () => ({ endpoint: "https://push.example.test/subscription" }),
} as PushSubscription;

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
