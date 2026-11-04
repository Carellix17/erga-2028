export type PushCapability = "supported" | "ios_needs_install" | "unsupported" | "denied";

export interface PushFeatureEnvironment {
  hasWindow: boolean;
  hasNavigator: boolean;
  standalone: boolean | undefined;
  hasNotification: boolean;
  permission: NotificationPermission | undefined;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  inPreviewOrIframe: boolean;
}

function isPreviewOrIframe(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  const hostname = window.location.hostname;
  const firstLabel = hostname.split(".")[0] ?? "";
  const isIdPreviewHost = firstLabel.startsWith("id-preview--");
  const isLovableProjectHost = hostname === "lovableproject.com"
    || hostname.endsWith(".lovableproject.com");
  return isIdPreviewHost || isLovableProjectHost || hostname === "localhost";
}

export function readPushFeatureEnvironment(): PushFeatureEnvironment {
  const hasWindow = typeof window !== "undefined";
  const hasNavigator = typeof navigator !== "undefined";
  const hasNotification = typeof Notification !== "undefined";
  const standalone = hasNavigator
    ? (navigator as Navigator & { standalone?: boolean }).standalone
    : undefined;

  return {
    hasWindow,
    hasNavigator,
    standalone,
    hasNotification,
    permission: hasNotification ? Notification.permission : undefined,
    hasServiceWorker: hasNavigator && "serviceWorker" in navigator,
    hasPushManager: hasWindow && "PushManager" in window,
    inPreviewOrIframe: isPreviewOrIframe(),
  };
}

/** Detects Web Push from browser capabilities, never from the user-agent string. */
export function detectPushCapability(
  environment: Partial<PushFeatureEnvironment> = readPushFeatureEnvironment(),
): PushCapability {
  const features = { ...readPushFeatureEnvironment(), ...environment };

  if (!features.hasWindow || !features.hasNavigator || features.inPreviewOrIframe) {
    return "unsupported";
  }

  // Safari exposes `navigator.standalone` only for its Home Screen app mode.
  // A false value identifies the iPhone/iPad browser that must be installed first.
  if (features.standalone === false) return "ios_needs_install";
  if (features.hasNotification && features.permission === "denied") return "denied";

  if (!features.hasNotification || !features.hasServiceWorker || !features.hasPushManager) {
    return "unsupported";
  }

  return "supported";
}

const PUSH_PROMPT_STORAGE_KEY = "erga:push-preprompt:v1";
export const PUSH_PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export interface PushPromptState {
  dismissals: number;
  cooldownUntil: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let volatilePromptState: PushPromptState = { dismissals: 0, cooldownUntil: 0 };

function localStorageOrNull(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function safeReadState(storage: StorageLike | null, now: number): PushPromptState {
  if (!storage) {
    if (volatilePromptState.cooldownUntil > now) return volatilePromptState;
    if (volatilePromptState.cooldownUntil > 0) {
      volatilePromptState = { dismissals: 0, cooldownUntil: 0 };
    }
    return volatilePromptState;
  }

  try {
    const raw = storage.getItem(PUSH_PROMPT_STORAGE_KEY);
    if (!raw) return { dismissals: 0, cooldownUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<PushPromptState>;
    const dismissals = Number.isInteger(parsed.dismissals)
      ? Math.max(0, Math.min(2, parsed.dismissals as number))
      : 0;
    const cooldownUntil = Number.isFinite(parsed.cooldownUntil)
      ? Math.max(0, parsed.cooldownUntil as number)
      : 0;

    if (cooldownUntil > now) return { dismissals: 2, cooldownUntil };
    if (cooldownUntil > 0) {
      storage.removeItem(PUSH_PROMPT_STORAGE_KEY);
      return { dismissals: 0, cooldownUntil: 0 };
    }
    return { dismissals: Math.min(dismissals, 1), cooldownUntil: 0 };
  } catch {
    return { dismissals: 0, cooldownUntil: 0 };
  }
}

export function readPushPromptState(
  now = Date.now(),
  storage: StorageLike | null = localStorageOrNull(),
): PushPromptState {
  return safeReadState(storage, now);
}

export function recordPushPromptNotNow(
  now = Date.now(),
  storage: StorageLike | null = localStorageOrNull(),
): PushPromptState {
  const current = safeReadState(storage, now);
  if (current.cooldownUntil > now) return current;

  const dismissals = Math.min(2, current.dismissals + 1);
  const next = {
    dismissals,
    cooldownUntil: dismissals >= 2 ? now + PUSH_PROMPT_COOLDOWN_MS : 0,
  };
  volatilePromptState = next;
  if (storage) {
    try {
      storage.setItem(PUSH_PROMPT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the cooldown in memory when browser storage is unavailable.
    }
  }
  return next;
}

let autoReplanVersion = 0;
let dismissalReplanVersion: number | null = null;
const autoReplanListeners = new Set<() => void>();

export function getAutoReplanVersion(): number {
  return autoReplanVersion;
}

export function subscribeToAutoReplans(listener: () => void): () => void {
  autoReplanListeners.add(listener);
  return () => autoReplanListeners.delete(listener);
}

/** In-memory signal used only to unlock the second, contextual pre-prompt. */
export function signalAutoReplanApplied(): void {
  autoReplanVersion += 1;
  autoReplanListeners.forEach((listener) => listener());
}

export function notePushPromptDismissal(): void {
  dismissalReplanVersion = autoReplanVersion;
}

export function ensurePushPromptReplanBaseline(): void {
  dismissalReplanVersion ??= autoReplanVersion;
}

export function hasAutoReplanSincePushPromptDismissal(): boolean {
  return dismissalReplanVersion !== null && autoReplanVersion > dismissalReplanVersion;
}

export function clearPushPromptReplanBaseline(): void {
  dismissalReplanVersion = null;
}
