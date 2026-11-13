import { useEffect, useState } from "react";
import { ChevronDown, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOptionalFocus, formatMMSS } from "@/contexts/FocusContext";
import { TimerPanel } from "@/components/focus/TimerPanel";
import { cn } from "@/lib/utils";

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => typeof window === "undefined" ? 1024 : window.innerWidth);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

function TimerRing({
  remaining,
  overrun,
  duration,
  tiny = false,
}: {
  remaining: number;
  overrun: number;
  duration: number;
  tiny?: boolean;
}) {
  const circumference = 2 * Math.PI * 13;
  const progress = overrun > 0 ? 1 : Math.max(0, Math.min(1, 1 - remaining / Math.max(1, duration)));
  const minutes = overrun > 0 ? `+${Math.floor(overrun / 60)}` : String(Math.ceil(remaining / 60));
  return (
    <svg
      aria-hidden="true"
      data-testid={tiny ? "timer-ring-only" : "timer-ring"}
      viewBox="0 0 32 32"
      className={cn("shrink-0", tiny ? "h-11 w-11" : "h-[1.125rem] w-[1.125rem]")}
    >
      <circle cx="16" cy="16" r="13" fill="none" className="stroke-current opacity-20" strokeWidth="2.5" />
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="none"
        className="stroke-current"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform="rotate(-90 16 16)"
      />
      {tiny && (
        <text
          x="16"
          y="19"
          textAnchor="middle"
          className="fill-current font-sans text-[8px] font-semibold"
        >
          {minutes}
        </text>
      )}
    </svg>
  );
}

export function TimerChip() {
  const focus = useOptionalFocus();
  const { t } = useTranslation();
  const viewportWidth = useViewportWidth();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!focus?.isActive || !focus.task) return null;

  const {
    isRunning,
    isSyncing,
    remaining,
    overrun,
    phaseDurationSeconds,
    task,
    announcement,
    toggleRun,
  } = focus;
  const tiny = viewportWidth < 360;
  const narrow = viewportWidth >= 360 && viewportWidth < 390;
  const mobilePause = viewportWidth >= 390 && viewportWidth < 768;
  const desktop = viewportWidth >= 1024;
  const mobile = viewportWidth < 768;
  const taskName = task.subject || task.label;
  const accessibleTaskName = task.subject && task.label !== task.subject
    ? `${task.subject}: ${task.label}`
    : task.label;
  const timeLabel = overrun > 0
    ? t("focusTimer.overrun", { time: formatMMSS(overrun) })
    : formatMMSS(remaining);
  const fullLabel = t("focusTimer.openTimerAria", { subject: accessibleTaskName, time: timeLabel });

  const trigger = (
    <button
      type="button"
      data-testid="timer-chip-trigger"
      data-layout={tiny ? "ring" : desktop ? "wide" : "compact"}
      aria-label={fullLabel}
      title={fullLabel}
      disabled={isSyncing}
      className={cn(
        "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-pill border border-white/25 bg-card px-2.5 text-foreground shadow-level-1 transition-colors hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
        desktop && "max-w-[240px] justify-start gap-2.5 px-3",
        narrow && "w-[5.5rem] px-2",
        mobilePause && "h-11 w-[4.25rem] justify-start gap-1 px-1",
        tiny && "h-11 w-11 min-w-11 rounded-full p-0",
      )}
    >
      {desktop ? (
        <>
          {isRunning
            ? <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
            : <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{taskName}</span>
          <span data-testid="timer-countdown" className="shrink-0 font-mono text-xs font-semibold tabular-nums">
            {timeLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
        </>
      ) : tiny ? (
        <TimerRing remaining={remaining} overrun={overrun} duration={phaseDurationSeconds} tiny />
      ) : (
        <>
          <TimerRing remaining={remaining} overrun={overrun} duration={phaseDurationSeconds} />
          <span
            data-testid="timer-countdown"
            className="min-w-0 truncate font-mono text-xs font-semibold tabular-nums"
          >
            {overrun > 0 ? `+${formatMMSS(overrun)}` : formatMMSS(remaining)}
          </span>
        </>
      )}
    </button>
  );

  return (
    <div
      data-testid="timer-chip"
      className={cn(
        "relative inline-flex h-11 min-w-0 shrink-0 items-center",
        mobilePause && "w-[7rem] justify-start",
        !mobilePause && !tiny && desktop && "max-w-[240px]",
      )}
    >
      <TimerPanel trigger={trigger} open={panelOpen} onOpenChange={setPanelOpen} mobile={mobile} />
      {mobilePause && (
        <button
          type="button"
          data-testid="timer-chip-pause"
          aria-label={isRunning ? t("focusTimer.pause") : t("focusTimer.resume")}
          title={isRunning ? t("focusTimer.pause") : t("focusTimer.resume")}
          disabled={isSyncing}
          onClick={toggleRun}
          className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {isRunning
            ? <Pause className="h-4 w-4" aria-hidden="true" />
            : <Play className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
      <span
        className="sr-only"
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="timer-announcements"
      >
        {announcement}
      </span>
    </div>
  );
}
