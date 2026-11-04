import { useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, Loader2, Send, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddToHomeSheet } from "@/components/notifications/AddToHomeSheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const DEFAULT_NOTIFY_TYPES = {
  slot_start: true,
  pomodoro: true,
  overrun: true,
  evening_summary: true,
  hide_subject: false,
};

type NotifyTypes = Record<string, Json | undefined> & typeof DEFAULT_NOTIFY_TYPES;
type NotifyTypeKey = keyof typeof DEFAULT_NOTIFY_TYPES;

function isJsonObject(value: unknown): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNotifyTypes(value: unknown): NotifyTypes {
  const stored = isJsonObject(value) ? value : {};
  return {
    ...stored,
    slot_start: typeof stored.slot_start === "boolean" ? stored.slot_start : true,
    pomodoro: typeof stored.pomodoro === "boolean" ? stored.pomodoro : true,
    overrun: typeof stored.overrun === "boolean" ? stored.overrun : true,
    evening_summary: typeof stored.evening_summary === "boolean" ? stored.evening_summary : true,
    hide_subject: typeof stored.hide_subject === "boolean" ? stored.hide_subject : false,
  };
}

const settingRows: { key: NotifyTypeKey; labelKey: string; descriptionKey?: string }[] = [
  { key: "slot_start", labelKey: "slotStartLabel", descriptionKey: "slotStartDescription" },
  { key: "pomodoro", labelKey: "pomodoroLabel", descriptionKey: "pomodoroDescription" },
  { key: "overrun", labelKey: "overrunLabel", descriptionKey: "overrunDescription" },
  { key: "evening_summary", labelKey: "eveningSummaryLabel", descriptionKey: "eveningSummaryDescription" },
  { key: "hide_subject", labelKey: "hideSubjectLabel", descriptionKey: "hideSubjectDescription" },
];

export function NotificationsCard() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { capability, permission, subscribe, enableFromUserGesture } = usePushNotifications();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [homeSheetOpen, setHomeSheetOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsLoadError, setSettingsLoadError] = useState(false);
  const [savingKey, setSavingKey] = useState<NotifyTypeKey | null>(null);
  const [notifyTypes, setNotifyTypes] = useState<NotifyTypes>(DEFAULT_NOTIFY_TYPES);

  useEffect(() => {
    let alive = true;
    setSettingsLoaded(false);
    setSettingsLoadError(false);
    setNotifyTypes(DEFAULT_NOTIFY_TYPES);

    if (!currentUser) {
      setSettingsLoaded(true);
      return () => { alive = false; };
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("planner_settings")
          .select("notify_types")
          .eq("user_id", currentUser)
          .maybeSingle();
        if (!alive) return;
        if (error) setSettingsLoadError(true);
        else setNotifyTypes(normalizeNotifyTypes(data?.notify_types));
      } catch {
        if (alive) setSettingsLoadError(true);
      } finally {
        if (alive) setSettingsLoaded(true);
      }
    })();

    return () => { alive = false; };
  }, [currentUser]);

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    const result = await enableFromUserGesture();
    setBusy(false);
    if (result === "enabled") {
      toast({ title: t("pushNotifications.enabledTitle"), description: t("pushNotifications.enabledDescription") });
    } else {
      toast({
        title: t("pushNotifications.enableFailedTitle"),
        description: result === "denied" || permission === "denied"
          ? t("pushNotifications.permissionDenied")
          : t("pushNotifications.enableError"),
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Conserva l'azione di test già presente: la sottoscrizione qui non chiede permessi.
      await subscribe();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Non autenticato");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-test`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Errore");
      if ((data?.subscriptions ?? 0) === 0) {
        toast({
          title: t("pushNotifications.noDevicesTitle"),
          description: t("pushNotifications.noDevicesDescription"),
          variant: "destructive",
        });
      } else {
        toast({ title: t("pushNotifications.testSentTitle"), description: t("pushNotifications.testSentDescription") });
      }
    } catch (error) {
      toast({
        title: t("pushNotifications.testFailedTitle"),
        description: error instanceof Error ? error.message : t("pushNotifications.enableError"),
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const updateNotifyType = async (key: NotifyTypeKey, checked: boolean) => {
    if (!currentUser || savingKey) return;
    setSavingKey(key);
    try {
      // Read the latest JSON before writing so unknown existing keys survive this update.
      const { data, error: readError } = await supabase
        .from("planner_settings")
        .select("notify_types")
        .eq("user_id", currentUser)
        .maybeSingle();
      if (readError) throw readError;

      const next = normalizeNotifyTypes(data?.notify_types);
      next[key] = checked;
      const { error: saveError } = await supabase
        .from("planner_settings")
        .upsert({ user_id: currentUser, notify_types: next }, { onConflict: "user_id" });
      if (saveError) throw saveError;

      setNotifyTypes(next);
      setSettingsLoadError(false);
      toast({ title: t("pushNotifications.settingsSaved") });
    } catch (error) {
      console.error("Could not save notification settings:", error);
      toast({
        title: t("pushNotifications.settingsSaveFailed"),
        description: t("pushNotifications.settingsSaveRetry"),
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const granted = capability === "supported" && permission === "granted";
  const denied = capability !== "ios_needs_install"
    && (capability === "denied" || permission === "denied");
  const canEnable = capability === "supported" && !granted && !denied;

  return (
    <section className="space-y-5 border border-border bg-surface-primary p-4 sm:p-5">
      <header className="flex items-center gap-3">
        <Bell className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">{t("pushNotifications.title")}</h2>
      </header>

      <p className="text-base leading-relaxed text-muted-foreground">
        {t("pushNotifications.description")}
      </p>

      {denied ? (
        <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/5 p-3 text-base leading-relaxed text-foreground" role="status">
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <p>{t("pushNotifications.permissionDenied")}</p>
        </div>
      ) : granted ? (
        <div className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-base text-foreground" role="status">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span>{t("pushNotifications.activeOnDevice")}</span>
        </div>
      ) : capability === "ios_needs_install" ? (
        <div className="space-y-3 border border-border p-3">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-base leading-relaxed text-foreground">
              {t("pushNotifications.iosSettingsDescription")}
            </p>
          </div>
          <Button type="button" variant="outline" className="min-h-11 w-full text-base" onClick={() => setHomeSheetOpen(true)}>
            {t("pushNotifications.openInstallGuide")}
          </Button>
        </div>
      ) : capability === "unsupported" ? (
        <div className="flex items-start gap-3 border border-border p-3 text-base leading-relaxed text-foreground" role="status">
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>{t("pushNotifications.unsupportedDescription")}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canEnable && (
          <Button type="button" className="min-h-11 text-base" disabled={busy} onClick={handleEnable}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? t("pushNotifications.enabling") : t("pushNotifications.enable")}
          </Button>
        )}
        {capability === "supported" && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 text-base"
            disabled={testing || !granted}
            onClick={handleTest}
          >
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
            {testing ? t("pushNotifications.testSending") : t("pushNotifications.sendTest")}
          </Button>
        )}
      </div>

      <div className="space-y-1 border-t border-border pt-4">
        <h3 className="text-base font-semibold text-foreground">{t("pushNotifications.typesTitle")}</h3>
        <p className="text-base leading-relaxed text-muted-foreground">
          {t("pushNotifications.dailyLimit")}
        </p>
      </div>

      {!settingsLoaded && (
        <div className="flex min-h-11 items-center gap-2 text-base text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("common.loading")}
        </div>
      )}
      {settingsLoadError && (
        <p role="alert" className="text-base leading-relaxed text-destructive">
          {t("pushNotifications.settingsLoadFailed")}
        </p>
      )}

      <div className="divide-y divide-border border-y border-border">
        {settingRows.map(({ key, labelKey, descriptionKey }) => (
          <div key={key} className="flex min-h-[4.25rem] items-center justify-between gap-4 py-3">
            <label htmlFor={`notify-${key}`} className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5">
              <span className="text-base font-medium leading-snug text-foreground">
                {t(`pushNotifications.${labelKey}`)}
              </span>
              {descriptionKey && (
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {t(`pushNotifications.${descriptionKey}`)}
                </span>
              )}
            </label>
            <Switch
              id={`notify-${key}`}
              aria-label={t(`pushNotifications.${labelKey}`)}
              checked={notifyTypes[key] === true}
              disabled={!currentUser || !settingsLoaded || !!savingKey}
              className="h-11 w-12"
              onCheckedChange={(checked) => { void updateNotifyType(key, checked); }}
            />
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("pushNotifications.overrunCaveat")}
      </p>

      {capability === "ios_needs_install" && (
        <AddToHomeSheet
          open={homeSheetOpen}
          onOpenChange={setHomeSheetOpen}
          source="settings"
          onUseInAppAlerts={() => toast({ title: t("pushNotifications.inAppAlertsTitle") })}
        />
      )}
    </section>
  );
}
