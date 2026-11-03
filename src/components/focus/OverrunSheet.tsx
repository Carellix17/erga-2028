import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOptionalFocus } from "@/contexts/FocusContext";
import type { ExtensionLimit, ScheduleItem } from "@/lib/focus/slotOverrun";

interface OverrunSheetProps {
  open: boolean;
  subject: string;
  lessonLabel: string | null;
  nextItem: ScheduleItem | null;
  extensionMinutes: number;
  extensionLimit: ExtensionLimit;
  isSaving: boolean;
  onExtend: (minutes: number) => void;
  onFinish: () => void;
  onStop: () => void;
  onDismiss: () => void;
}

function useDesktopViewport(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return desktop;
}

export function OverrunSheet({
  open,
  subject,
  lessonLabel,
  nextItem,
  extensionMinutes,
  extensionLimit,
  isSaving,
  onExtend,
  onFinish,
  onStop,
  onDismiss,
}: OverrunSheetProps) {
  const { t } = useTranslation();
  const focus = useOptionalFocus();
  const desktop = useDesktopViewport();
  const visible = open && !!focus?.isActive;
  const scheduleLabel = (item: ScheduleItem | null) => {
    if (!item || item.kind !== "routine") return item?.label ?? "";
    const routineKey = `focusTimer.routine.${item.label}`;
    return t(routineKey, { defaultValue: item.label });
  };
  const blockerLabel = extensionLimit.item
    ? t(`focusTimer.routine.${extensionLimit.item}`, { defaultValue: extensionLimit.item })
    : null;

  useEffect(() => {
    if (!visible || desktop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDismiss();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [desktop, onDismiss, visible]);

  const content = (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("focusTimer.overrunTitle")}
        </p>
        <h2 id="focus-overrun-title" className="mt-1 font-display text-lg font-semibold text-foreground">
          {t("focusTimer.overrunQuestion")}
        </h2>
        <p className="mt-2 text-sm text-foreground">{subject}</p>
        {lessonLabel && <p className="mt-0.5 text-sm text-muted-foreground">{lessonLabel}</p>}
      </div>

      <p className="rounded-control border border-border bg-surface-container-low px-3 py-2 text-sm text-foreground">
        {nextItem
          ? t("focusTimer.nextItem", { time: nextItem.time, item: scheduleLabel(nextItem) })
          : t("focusTimer.noNext")}
      </p>

      {extensionLimit.item && extensionLimit.time && (
        <p className="text-sm text-muted-foreground">
          {t("focusTimer.extensionLimit", {
            time: extensionLimit.time,
            item: blockerLabel,
            minutes: extensionLimit.minutes,
          })}
        </p>
      )}
      {extensionMinutes <= 0 && (
        <p className="text-sm text-muted-foreground">{t("focusTimer.extensionUnavailable")}</p>
      )}

      <div className="grid gap-2">
        {extensionMinutes > 0 && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full justify-start"
            disabled={isSaving || focus?.isSyncing === true}
            onClick={() => onExtend(extensionMinutes)}
          >
            {t("focusTimer.extendBy", { minutes: extensionMinutes })}
          </Button>
        )}
        <Button
          type="button"
          className="min-h-11 w-full justify-start"
          disabled={isSaving || focus?.isSyncing === true}
          onClick={onFinish}
        >
          {t("focusTimer.finished")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-start"
          disabled={isSaving || focus?.isSyncing === true}
          onClick={onStop}
        >
          {t("focusTimer.stopHere")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 w-full justify-start text-muted-foreground"
          onClick={onDismiss}
        >
          {t("focusTimer.decideLater")}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {desktop && (
        <Popover
          open={visible}
          onOpenChange={(nextOpen) => { if (!nextOpen && visible) onDismiss(); }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none fixed right-6 top-16 h-px w-px opacity-0"
            />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="z-[110] w-[min(22rem,calc(100vw-2rem))] p-4"
            aria-labelledby="focus-overrun-title"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              onDismiss();
            }}
          >
            {content}
          </PopoverContent>
        </Popover>
      )}
      {!desktop && visible && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="focus-overrun-title"
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[110] max-h-[min(78dvh,40rem)] overflow-y-auto rounded-t-dialog border border-border bg-popover p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-popover-foreground shadow-level-4"
        >
          {content}
        </section>
      )}
    </>
  );
}
