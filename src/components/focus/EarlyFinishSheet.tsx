import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOptionalFocus } from "@/contexts/FocusContext";
import type { EarlyFinishPrompt } from "@/lib/focus/slotOverrun";

interface EarlyFinishSheetProps {
  prompt: EarlyFinishPrompt | null;
  isSaving: boolean;
  onMarkDone: () => void;
  onStartNext: () => void;
  onStartBreak: () => void;
  onLeaveFree: () => void;
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

export function EarlyFinishSheet({
  prompt,
  isSaving,
  onMarkDone,
  onStartNext,
  onStartBreak,
  onLeaveFree,
  onDismiss,
}: EarlyFinishSheetProps) {
  const { t } = useTranslation();
  const focus = useOptionalFocus();
  const desktop = useDesktopViewport();
  const visible = !!prompt && !!focus;

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

  if (!prompt || !focus) return null;

  const lessonLabel = prompt.lessonFrom != null && prompt.lessonTo != null
    ? prompt.lessonFrom === prompt.lessonTo
      ? t("focusTimer.lessonNumber", { number: prompt.lessonFrom + 1 })
      : t("focusTimer.lessonRange", { from: prompt.lessonFrom + 1, to: prompt.lessonTo + 1 })
    : null;
  const nextLabel = prompt.nextItem?.kind === "routine"
    ? t(`focusTimer.routine.${prompt.nextItem.label}`, { defaultValue: prompt.nextItem.label })
    : prompt.nextItem?.label ?? "";

  const content = (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("focusTimer.earlyFinishTitle")}
        </p>
        <h2 id="focus-early-finish-title" className="mt-1 font-display text-lg font-semibold text-foreground">
          {t("focusTimer.earlyFinishQuestion")}
        </h2>
        <p className="mt-2 text-sm text-foreground">{prompt.subject}</p>
        {lessonLabel && <p className="mt-0.5 text-sm text-muted-foreground">{lessonLabel}</p>}
      </div>

      <p className="rounded-control border border-border bg-surface-container-low px-3 py-2 text-sm text-foreground">
        {prompt.nextItem
          ? t("focusTimer.nextItem", { time: prompt.nextItem.time, item: nextLabel })
          : t("focusTimer.noNext")}
      </p>

      <div className="grid gap-2">
        <Button type="button" className="min-h-11 w-full justify-start" disabled={isSaving} onClick={onMarkDone}>
          {t("focusTimer.markAsDone")}
        </Button>
        {prompt.nextStudyEvent && (
          <Button type="button" className="min-h-11 w-full justify-start" disabled={isSaving} onClick={onStartNext}>
            {t("focusTimer.startNext")}
          </Button>
        )}
        <Button type="button" variant="outline" className="min-h-11 w-full justify-start" disabled={isSaving} onClick={onStartBreak}>
          {t("focusTimer.startBreak")}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 w-full justify-start" disabled={isSaving} onClick={onLeaveFree}>
          {t("focusTimer.leaveFree")}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 w-full justify-start text-muted-foreground" onClick={onDismiss}>
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
            aria-labelledby="focus-early-finish-title"
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
          aria-labelledby="focus-early-finish-title"
          className="fixed inset-x-3 bottom-3 z-[110] max-h-[min(78dvh,40rem)] overflow-y-auto rounded-t-dialog border border-border bg-popover p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-level-4"
        >
          {content}
        </section>
      )}
    </>
  );
}
