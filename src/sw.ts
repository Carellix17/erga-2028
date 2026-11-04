// @ts-nocheck
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

self.skipWaiting();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

function internalPath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

// === Web Push ===
self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "Erga", body: event.data?.text() ?? "" };
  }
  const title = data.title || "Erga";
  const tag = typeof data.tag === "string" && data.tag.length > 0 ? data.tag : undefined;
  const options: NotificationOptions = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: Boolean(tag),
    data: { url: internalPath(data.url) },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = internalPath(event.notification.data?.url);
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        const wc = c as WindowClient;
        try {
          await wc.navigate(url);
          return wc.focus();
        } catch {
          /* ignore */
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(url);
    })()
  );
});
