import { beforeEach, describe, expect, it } from "vitest";
import {
  detectPushCapability,
  isPreviewHostname,
  PUSH_PROMPT_COOLDOWN_MS,
  readPushPromptState,
  recordPushPromptNotNow,
  suppressPushPromptFor30Days,
  type PushFeatureEnvironment,
} from "@/lib/pushSupport";

const completePushEnvironment: PushFeatureEnvironment = {
  hasWindow: true,
  hasNavigator: true,
  standalone: undefined,
  hasNotification: true,
  permission: "default",
  hasServiceWorker: true,
  hasPushManager: true,
  inPreviewOrIframe: false,
};

describe("preview hostname detection", () => {
  it("matches Lovable preview domains without accepting lookalike hostnames", () => {
    expect(isPreviewHostname("evil-lovableproject.com.example.org")).toBe(false);
    expect(isPreviewHostname("id-preview--abc.lovable.app")).toBe(true);
    expect(isPreviewHostname("abc.lovableproject.com")).toBe(true);
  });
});

describe("push capability detection", () => {
  it("identifies an iPhone browser without Notification that has not been installed", () => {
    expect(detectPushCapability({
      ...completePushEnvironment,
      standalone: false,
      hasNotification: false,
      permission: undefined,
      hasServiceWorker: false,
      hasPushManager: false,
    })).toBe("ios_needs_install");
  });

  it("reports supported only when Web Push APIs are available", () => {
    expect(detectPushCapability(completePushEnvironment)).toBe("supported");
    expect(detectPushCapability({
      ...completePushEnvironment,
      hasPushManager: false,
    })).toBe("unsupported");
  });

  it("distinguishes a browser-blocked permission even when another Push API is missing", () => {
    expect(detectPushCapability({
      ...completePushEnvironment,
      permission: "denied",
      hasPushManager: false,
    })).toBe("denied");
  });
});

describe("push pre-prompt dismissal storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts a 30-day cooldown after the second Not now", () => {
    const now = Date.now();
    expect(recordPushPromptNotNow(now)).toEqual({ dismissals: 1, cooldownUntil: 0 });
    expect(recordPushPromptNotNow(now)).toEqual({
      dismissals: 2,
      cooldownUntil: now + PUSH_PROMPT_COOLDOWN_MS,
    });
    expect(readPushPromptState(now + PUSH_PROMPT_COOLDOWN_MS - 1)).toEqual({
      dismissals: 2,
      cooldownUntil: now + PUSH_PROMPT_COOLDOWN_MS,
    });
    expect(readPushPromptState(now + PUSH_PROMPT_COOLDOWN_MS)).toEqual({
      dismissals: 0,
      cooldownUntil: 0,
    });
  });

  it("persists an explicit in-app-only choice immediately across sessions", () => {
    const now = Date.now();
    const cooldown = { dismissals: 2, cooldownUntil: now + PUSH_PROMPT_COOLDOWN_MS };

    expect(suppressPushPromptFor30Days(now)).toEqual(cooldown);
    // A new page session reads the same localStorage value and stays suppressed.
    expect(readPushPromptState(now + 1)).toEqual(cooldown);
    expect(recordPushPromptNotNow(now + 2)).toEqual(cooldown);
  });
});
