import { beforeEach, describe, expect, it } from "vitest";
import {
  detectPushCapability,
  PUSH_PROMPT_COOLDOWN_MS,
  readPushPromptState,
  recordPushPromptNotNow,
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
});
