import { useState, type ReactNode } from "react";
import { Check, Pause, Play, Plus, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatMMSS, useFocus } from "@/contexts/FocusContext";
import type { FocusEndReason, FocusPhase } from "@/lib/focusClock";

interface TimerPanelProps {
  trigger: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile: boolean;
}

function phaseLabel(phase: FocusPhase, t: ReturnType<typeof useTranslation>["t"]): string {
  if (phase === "short") return t("focusTimer.phaseShort");
  if (phase === "long") return t("focusTimer.phaseLong");
  return t("focusTimer.phaseFocus");
}

function endReason(phaseOverrun: number): FocusEndReason {
  return phaseOverrun > 0 ? "overrun" : "finished";
}

function TimerPanelContent() {
  const { t } = useTranslation();
  const {
    task,
    phase,
    remaining,
    overrun,
    isRunning,
    isSyncing,
    toggleRun,
    addFiveMinutes,
    endWithReason,
  } = useFocus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lessonRange = task?.lessonFrom != null && task.lessonTo != null
    ? task.lessonFrom === task.lessonTo
      ? t("focusTimer.lessonNumber", { number: task.lessonFrom + 1 })
      : t("focusTimer.lessonRange", { from: task.lessonFrom + 1, to: task.lessonTo + 1 })
    : null;
  const countdown = overrun > 0
    ? t("focusTimer.overrun", { time: formatMMSS(overrun) })
    : formatMMSS(remaining);

  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {phaseLabel(phase, t)}
        </p>
        <h2 className="mt-1 truncate font-display text-lg font-semibold text-foreground">
          {task?.subject || task?.label || t("focusTimer.defaultSubject")}
        </h2>
        {task?.subject && task.label && task.label !== task.subject && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{task.label}</p>
        )}
        {lessonRange && <p className="mt-1 text-sm text-muted-foreground">{lessonRange}</p>}
      </div>

      <div className="flex items-center gap-3 rounded-control border border-border bg-surface-container-low px-3 py-3">
        <div
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-primary/30 text-primary"
        >
          <span className="text-xs font-semibold tabular-nums">{Math.floor((overrun > 0 ? overrun : remaining) / 60)}</span>
        </div>
        <p className="min-w-0 flex-1 font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {countdown}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 justify-start"
          disabled={isSyncing}
          onClick={toggleRun}
        >
          {isRunning ? <Pause className="mr-2 h-4 w-4" aria-hidden="true" /> : <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
          {isRunning ? t("focusTimer.pause") : t("focusTimer.resume")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 justify-start"
          disabled={isSyncing}
          onClick={addFiveMinutes}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("focusTimer.addFiveMinutes")}
        </Button>
        <Button
          type="button"
          className="min-h-11 justify-start"
          disabled={isSyncing}
          onClick={() => endWithReason(endReason(overrun))}
        >
          <Check className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("focusTimer.finished")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 justify-start text-muted-foreground"
          disabled={isSyncing}
          onClick={() => setConfirmOpen(true)}
        >
          <Square className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("focusTimer.interrupt")}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="z-[70]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("focusTimer.interruptTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("focusTimer.interruptDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => endWithReason("interrupted")}>
              {t("focusTimer.confirmInterrupt")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function TimerPanel({ trigger, open, onOpenChange, mobile }: TimerPanelProps) {
  const { t } = useTranslation();

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[min(82dvh,42rem)] overflow-y-auto rounded-t-dialog px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        >
          <SheetHeader className="mb-5 pr-10 text-left">
            <SheetTitle>{t("focusTimer.panelTitle")}</SheetTitle>
            <SheetDescription>{t("focusTimer.panelDescription")}</SheetDescription>
          </SheetHeader>
          <TimerPanelContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[21rem] p-4">
        <TimerPanelContent />
      </PopoverContent>
    </Popover>
  );
}
