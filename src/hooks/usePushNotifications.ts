import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectPushCapability, type PushCapability } from "@/lib/pushSupport";

// Public key VAPID (può stare in chiaro, è pubblica per definizione).
const VAPID_PUBLIC_KEY =
  "BAXm3i-O54rBBUA5ara0kvEMuzwLl1Rk-ZCdCczyxlJ9Mauni-KkzdXwYUpYnON0v9mrYzU3usm0sazZFMcEv2s";

export type EnablePushResult = "enabled" | "denied" | "dismissed" | "unsupported" | "failed";

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

export function usePushNotifications() {
  const capability: PushCapability = detectPushCapability();
  const supported = capability === "supported";
  const [permission, setPermission] = useState<NotificationPermission>(currentPermission);

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

  const registerSubscription = useCallback(async (): Promise<boolean> => {
    if (detectPushCapability() !== "supported" || currentPermission() !== "granted") return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;

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
      return res.ok;
    } catch (err) {
      console.error("[push] subscribe failed:", err);
      return false;
    }
  }, []);

  /** Subscribe silently when permission is already granted; never opens a permission prompt. */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (capability !== "supported" || currentPermission() !== "granted") return false;
    return registerSubscription();
  }, [capability, registerSubscription]);

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
      setPermission(current);
    }

    if (current === "denied") return "denied";
    if (current !== "granted") return "dismissed";

    return (await registerSubscription()) ? "enabled" : "failed";
  }, [capability, registerSubscription]);

  return { capability, supported, permission, subscribe, enableFromUserGesture };
}
