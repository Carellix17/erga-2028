import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectPushCapability, type PushCapability } from "@/lib/pushSupport";

// Public key VAPID (può stare in chiaro, è pubblica per definizione).
const VAPID_PUBLIC_KEY =
  "BAXm3i-O54rBBUA5ara0kvEMuzwLl1Rk-ZCdCczyxlJ9Mauni-KkzdXwYUpYnON0v9mrYzU3usm0sazZFMcEv2s";

export type EnablePushResult = "enabled" | "denied" | "dismissed" | "unsupported" | "failed";
export type PushSubscriptionStatus = "not_subscribed" | "subscribing" | "subscribed" | "failed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

function currentPermission(): NotificationPermission {
  return typeof Notification === "undefined" ? "default" : Notification.permission;
}

interface PushNotificationSnapshot {
  permission: NotificationPermission;
  subscriptionStatus: PushSubscriptionStatus;
}

const serverSnapshot: PushNotificationSnapshot = {
  permission: "default",
  subscriptionStatus: "not_subscribed",
};
let pushSnapshot: PushNotificationSnapshot = {
  ...serverSnapshot,
  permission: currentPermission(),
};
const pushListeners = new Set<() => void>();
let registrationInFlight: Promise<boolean> | null = null;
let existingSubscriptionCheck: Promise<boolean> | null = null;
let existingSubscriptionCheckComplete = false;
let permissionEpoch = 0;

function subscribeToPushStore(listener: () => void): () => void {
  pushListeners.add(listener);
  return () => pushListeners.delete(listener);
}

function getPushSnapshot(): PushNotificationSnapshot {
  return pushSnapshot;
}

function getServerPushSnapshot(): PushNotificationSnapshot {
  return serverSnapshot;
}

function publishPushSnapshot(next: PushNotificationSnapshot): void {
  if (
    next.permission === pushSnapshot.permission
    && next.subscriptionStatus === pushSnapshot.subscriptionStatus
  ) return;

  pushSnapshot = next;
  pushListeners.forEach((listener) => listener());
}

function setSubscriptionStatus(subscriptionStatus: PushSubscriptionStatus): void {
  publishPushSnapshot({ ...pushSnapshot, subscriptionStatus });
}

function setPermission(permission: NotificationPermission): void {
  if (permission === pushSnapshot.permission) return;

  const resetRegistration = permission !== "granted";
  permissionEpoch += 1;
  existingSubscriptionCheckComplete = false;
  existingSubscriptionCheck = null;
  publishPushSnapshot({
    permission,
    subscriptionStatus: resetRegistration ? "not_subscribed" : pushSnapshot.subscriptionStatus,
  });
}

interface RegisterOptions {
  allowCreate: boolean;
  existingSubscription?: PushSubscription;
}

/** Registers an existing subscription, or creates one only for an explicit activation action. */
function registerSubscription({
  allowCreate,
  existingSubscription,
}: RegisterOptions): Promise<boolean> {
  if (registrationInFlight) return registrationInFlight;
  if (detectPushCapability() !== "supported" || currentPermission() !== "granted") {
    return Promise.resolve(false);
  }

  existingSubscriptionCheckComplete = true;
  setSubscriptionStatus("subscribing");

  const registration = (async (): Promise<boolean> => {
    try {
      let sub = existingSubscription;
      if (!sub) {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();
        if (!sub && allowCreate) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
          });
        }
      }

      if (!sub) {
        setSubscriptionStatus("not_subscribed");
        return false;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSubscriptionStatus("failed");
        return false;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        },
      );
      const succeeded = res.ok;
      setSubscriptionStatus(succeeded ? "subscribed" : "failed");
      return succeeded;
    } catch (err) {
      console.error("[push] subscribe failed:", err);
      setSubscriptionStatus("failed");
      return false;
    }
  })();

  registrationInFlight = registration;
  void registration.then(() => {
    if (registrationInFlight === registration) registrationInFlight = null;
  });
  return registration;
}

/** Silently re-registers a browser subscription only when one already exists. */
function syncExistingSubscription(): Promise<boolean> {
  if (currentPermission() !== "granted" || detectPushCapability() !== "supported") {
    return Promise.resolve(false);
  }
  if (existingSubscriptionCheck) return existingSubscriptionCheck;
  if (existingSubscriptionCheckComplete) {
    return Promise.resolve(pushSnapshot.subscriptionStatus === "subscribed");
  }
  if (registrationInFlight) {
    existingSubscriptionCheckComplete = true;
    return registrationInFlight;
  }

  existingSubscriptionCheckComplete = true;
  const checkEpoch = permissionEpoch;
  const check = (async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (checkEpoch !== permissionEpoch || currentPermission() !== "granted") return false;
      if (!sub) {
        setSubscriptionStatus("not_subscribed");
        return false;
      }
      return await registerSubscription({ allowCreate: false, existingSubscription: sub });
    } catch (err) {
      console.error("[push] existing subscription check failed:", err);
      if (checkEpoch === permissionEpoch && currentPermission() === "granted") {
        setSubscriptionStatus("failed");
      }
      return false;
    }
  })();

  existingSubscriptionCheck = check;
  void check.then(() => {
    if (existingSubscriptionCheck === check) existingSubscriptionCheck = null;
  });
  return check;
}

export function usePushNotifications() {
  const capability: PushCapability = detectPushCapability();
  const supported = capability === "supported";
  const snapshot = useSyncExternalStore(
    subscribeToPushStore,
    getPushSnapshot,
    getServerPushSnapshot,
  );
  const { permission, subscriptionStatus } = snapshot;

  useEffect(() => {
    const refreshPermission = () => setPermission(currentPermission());
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);
    refreshPermission();
    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, []);

  useEffect(() => {
    if (supported && permission === "granted") void syncExistingSubscription();
  }, [permission, supported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (capability !== "supported" || currentPermission() !== "granted") return false;
    setPermission("granted");

    // If a silent startup check is already reading the browser subscription, reuse
    // its registration. If none exists, this explicit action may create it below.
    const pendingCheck = existingSubscriptionCheck;
    if (pendingCheck && await pendingCheck) return true;
    if (pushSnapshot.subscriptionStatus === "subscribed") return true;
    return registerSubscription({ allowCreate: true });
  }, [capability]);

  /** Call only from a direct user action such as an enabled button's onClick. */
  const enableFromUserGesture = useCallback(async (): Promise<EnablePushResult> => {
    if (capability !== "supported") return "unsupported";

    let current = currentPermission();
    if (current === "default") {
      try {
        // This is intentionally the only permission request in the hook and runs
        // synchronously up to the browser API from the caller's click handler.
        current = await Notification.requestPermission();
      } catch (err) {
        console.error("[push] permission request failed:", err);
        return "failed";
      }
    }
    setPermission(current);

    if (current === "denied") return "denied";
    if (current !== "granted") return "dismissed";

    return (await subscribe()) ? "enabled" : "failed";
  }, [capability, subscribe]);

  return {
    capability,
    supported,
    permission,
    subscriptionStatus,
    isSubscribed: supported && permission === "granted" && subscriptionStatus === "subscribed",
    registrationFailed: subscriptionStatus === "failed",
    subscribe,
    enableFromUserGesture,
  };
}
