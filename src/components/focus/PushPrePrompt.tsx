import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddToHomeSheet } from "@/components/notifications/AddToHomeSheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPushPromptReplanBaseline,
  ensurePushPromptReplanBaseline,
  getAutoReplanVersion,
  hasAutoReplanSincePushPromptDismissal,
  notePushPromptDismissal,
  readPushPromptState,
  recordPushPromptNotNow,
  subscribeToAutoReplans,
  suppressPushPromptFor30Days,
  type PushCapability,
} from "@/lib/pushSupport";
import type { EnablePushResult, PushSubscriptionStatus } from "@/hooks/usePushNotifications";

interface PushPrePromptProps {
  active: boolean;
  isRunning: boolean;
  sessionKey: string | null;
  capability: PushCapability;
  permission: NotificationPermission;
  subscriptionStatus: PushSubscriptionStatus;
  subscribe: () => Promise<boolean>;
  enableFromUserGesture: () => Promise<EnablePushResult>;
}

type PromptEventName = "push_preprompt_shown" | "push_preprompt_accepted" | "push_preprompt_denied";
type PromptAttempt = 1 | 2;

function recordPromptEvent(
  userId: string | null,
  name: PromptEventName,
  props: { surface: "timer"; attempt?: PromptAttempt; reason?: "not_now" | "in_app" | "permission_denied" },
): void {
  if (!userId) return;
  void (async () => {
    try {
      const { error } = await supabase.from("planner_events").insert({
        user_id: userId,
        name,
        props,
      });
      if (error) console.warn("Could not record push prompt event:", error.message);
    } catch (error) {
      console.warn("Could not record push prompt event:", error);
    }
  })();
}

export function PushPrePrompt({
  active,
  isRunning,
  sessionKey,
  capability,
  permission,
  subscriptionStatus,
  subscribe,
  enableFromUserGesture,
}: PushPrePromptProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const autoReplanVersion = useSyncExternalStore(
    subscribeToAutoReplans,
    getAutoReplanVersion,
    getAutoReplanVersion,
  );
  const [promptDue, setPromptDue] = useState(false);
  const [promptState, setPromptState] = useState(() => readPushPromptState());
  const [promptAttempt, setPromptAttempt] = useState<PromptAttempt | null>(null);
  const [homeSheetOpen, setHomeSheetOpen] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [enableError, setEnableError] = useState(false);
  const [dismissedSessionKey, setDismissedSessionKey] = useState<string | null>(null);
  const shownAttempts = useRef(new Set<string>());

  useEffect(() => {
    setPromptDue(false);
    setPromptAttempt(null);
    setHomeSheetOpen(false);
    if (!active || !isRunning || !sessionKey) return;

    const startedAt = Number(sessionKey);
    const elapsed = Number.isFinite(startedAt) ? Date.now() - startedAt : 0;
    const delay = Math.max(0, 30_000 - elapsed);
    const timeout = window.setTimeout(() => setPromptDue(true), delay);
    return () => window.clearTimeout(timeout);
  }, [active, isRunning, sessionKey]);

  useEffect(() => {
    setDismissedSessionKey(null);
    setEnableError(false);
  }, [sessionKey]);

  useEffect(() => {
    if (promptState.dismissals === 1) ensurePushPromptReplanBaseline();
  }, [promptState.dismissals]);

  useEffect(() => {
    const cooldownActive = promptState.cooldownUntil > Date.now();
    const canShow = promptDue
      && active
      && isRunning
      && !!sessionKey
      && dismissedSessionKey !== sessionKey
      && !cooldownActive
      && (
        capability === "ios_needs_install"
        || (
          capability === "supported"
          && (
            permission === "default"
            || subscriptionStatus === "subscribing"
            || subscriptionStatus === "failed"
          )
        )
      );

    if (!canShow) {
      setPromptAttempt(null);
      return;
    }

    let nextAttempt: PromptAttempt | null = null;
    if (promptState.dismissals === 0) nextAttempt = 1;
    if (promptState.dismissals === 1 && hasAutoReplanSincePushPromptDismissal()) nextAttempt = 2;
    if (!nextAttempt) {
      setPromptAttempt(null);
      return;
    }

    setPromptAttempt(nextAttempt);
    const shownKey = `${sessionKey}:${nextAttempt}`;
    if (!shownAttempts.current.has(shownKey)) {
      shownAttempts.current.add(shownKey);
      recordPromptEvent(currentUser, "push_preprompt_shown", { surface: "timer", attempt: nextAttempt });
    }
  }, [
    active,
    autoReplanVersion,
    capability,
    currentUser,
    dismissedSessionKey,
    isRunning,
    permission,
    promptDue,
    promptState,
    sessionKey,
    subscriptionStatus,
  ]);

  const handleNotNow = () => {
    if (!promptAttempt) return;
    recordPromptEvent(currentUser, "push_preprompt_denied", {
      surface: "timer",
      attempt: promptAttempt,
      reason: "not_now",
    });
    if (promptAttempt === 1) notePushPromptDismissal();
    const nextState = recordPushPromptNotNow();
    setPromptState(nextState);
    setPromptAttempt(null);
    setEnableError(false);
    if (nextState.dismissals >= 2) clearPushPromptReplanBaseline();
  };

  const useInAppAlerts = () => {
    if (promptAttempt) {
      recordPromptEvent(currentUser, "push_preprompt_denied", {
        surface: "timer",
        attempt: promptAttempt,
        reason: "in_app",
      });
    }
    setPromptState(suppressPushPromptFor30Days());
    clearPushPromptReplanBaseline();
    setDismissedSessionKey(sessionKey);
    setPromptAttempt(null);
    setHomeSheetOpen(false);
    setEnableError(false);
  };

  const handleEnable = async () => {
    if (!promptAttempt || isEnabling) return;
    const attempt = promptAttempt;
    recordPromptEvent(currentUser, "push_preprompt_accepted", { surface: "timer", attempt });
    setIsEnabling(true);
    setEnableError(false);
    const result = await enableFromUserGesture();
    setIsEnabling(false);

    if (result === "denied") {
      recordPromptEvent(currentUser, "push_preprompt_denied", {
        surface: "timer",
        attempt,
        reason: "permission_denied",
      });
      setPromptAttempt(null);
      return;
    }
    if (result === "dismissed") {
      handleNotNow();
      return;
    }
    if (result === "enabled" || result === "unsupported") {
      setDismissedSessionKey(sessionKey);
      setPromptAttempt(null);
      setEnableError(false);
      return;
    }
    setEnableError(true);
  };

  const handleRetry = async () => {
    if (isEnabling) return;
    setIsEnabling(true);
    setEnableError(false);
    const succeeded = await subscribe();
    setIsEnabling(false);
    if (succeeded) {
      setPromptAttempt(null);
      setEnableError(false);
      return;
    }
    setEnableError(true);
  };

  if (!promptAttempt) return null;

  const needsInstall = capability === "ios_needs_install";
  const titleId = `push-preprompt-title-${sessionKey}-${promptAttempt}`;

  return (
    <section
      aria-labelledby={titleId}
      className="space-y-3 border-t border-border pt-4"
      data-testid="push-preprompt"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center border border-border text-primary" aria-hidden="true">
          {needsInstall ? <Smartphone className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 space-y-1">
          <h3 id={titleId} className="text-base font-semibold leading-snug text-foreground">
            {needsInstall ? t("pushNotifications.iosPromptTitle") : t("pushNotifications.promptTitle")}
          </h3>
          <p className="text-base leading-relaxed text-muted-foreground">
            {needsInstall ? t("pushNotifications.iosPromptDescription") : t("pushNotifications.promptDescription")}
          </p>
        </div>
      </div>

      {needsInstall ? (
        <div className="grid gap-2">
          <Button
            type="button"
            className="min-h-11 text-base"
            onClick={() => {
              if (promptAttempt) {
                recordPromptEvent(currentUser, "push_preprompt_accepted", {
                  surface: "timer",
                  attempt: promptAttempt,
                });
              }
              setHomeSheetOpen(true);
            }}
          >
            {t("pushNotifications.openInstallGuide")}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 text-base" onClick={useInAppAlerts}>
            <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("pushNotifications.useInAppAlerts")}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 text-base" onClick={handleNotNow}>
            {t("pushNotifications.notNow")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            className="min-h-11 text-base"
            disabled={isEnabling}
            onClick={enableError || subscriptionStatus === "failed" ? handleRetry : handleEnable}
          >
            {isEnabling
              ? t("pushNotifications.enabling")
              : enableError || subscriptionStatus === "failed"
                ? t("pushNotifications.retry")
                : t("pushNotifications.enable")}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 text-base" onClick={handleNotNow}>
            {t("pushNotifications.notNow")}
          </Button>
        </div>
      )}

      {(enableError || subscriptionStatus === "failed") && (
        <p role="alert" className="text-base leading-relaxed text-destructive">
          {t("pushNotifications.enableError")}
        </p>
      )}

      {needsInstall && (
        <AddToHomeSheet
          open={homeSheetOpen}
          onOpenChange={setHomeSheetOpen}
          source="timer"
          onUseInAppAlerts={useInAppAlerts}
        />
      )}
    </section>
  );
}
