import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, Flame, Minus, Play, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFocus } from "@/contexts/FocusContext";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import {
  buildFocusDailyStats,
  localDateFromKey,
  summarizeFocusPeriod,
  summarizePreviousFocusPeriod,
  type FocusDayStat,
  type FocusSessionStat,
} from "@/lib/focusStats";
import { toLocalDayKey } from "@/lib/homeDashboard";
import { cn } from "@/lib/utils";

const PERIODS = [7, 30, 60] as const;
type Period = (typeof PERIODS)[number];
const EMPTY_FOCUS_SESSIONS: FocusSessionStat[] = [];

interface FocusChartDatum extends FocusDayStat {
  label: string;
  fullLabel: string;
}

interface FocusChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: FocusChartDatum }>;
  formatMinutes: (minutes: number) => string;
  sessionsLabel: string;
}

function FocusChartTooltip({
  active,
  payload,
  formatMinutes,
  sessionsLabel,
}: FocusChartTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="min-w-[10rem] rounded-button border border-border bg-card px-3 py-2.5 text-left shadow-level-2">
      <p className="text-xs font-semibold text-muted-foreground">{point.fullLabel}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{formatMinutes(point.minutes)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {point.sessions} {sessionsLabel}
      </p>
    </div>
  );
}

function FocusStatsSkeleton() {
  return (
    <main className="mx-auto w-full max-w-lg space-y-10 px-4 py-7 pb-12 sm:max-w-2xl sm:px-6 lg:max-w-4xl">
      <section className="py-3 text-center">
        <Skeleton className="mx-auto h-32 w-32 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-6 w-32 rounded-full" />
        <Skeleton className="mx-auto mt-3 h-4 w-52 rounded-full" />
      </section>
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-[25rem] rounded-card" />
      <Skeleton className="h-48 rounded-card" />
    </main>
  );
}

function formatMinutesForDisplay(minutes: number, short = false): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  if (safeMinutes < 60) return `${safeMinutes} min`;

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (short || remainder === 0) return `${hours} h${remainder > 0 ? ` ${remainder} min` : ""}`;
  return `${hours} h ${remainder} min`;
}

function StreakEmblem({ days }: { days: number }) {
  return (
    <div data-testid="streak-emblem" className="relative mx-auto grid h-32 w-32 place-items-center" aria-hidden="true">
      <span className="absolute inset-1 rounded-full border border-foreground/15 bg-surface-container-low" aria-hidden="true" />
      <span className="absolute inset-[0.62rem] rounded-full border border-foreground/10" aria-hidden="true" />
      <span className="absolute left-5 top-5 h-px w-8 -rotate-45 bg-foreground/30" aria-hidden="true" />
      <Flame className="absolute -top-1.5 h-[4.6rem] w-[4.6rem] stroke-[1.35] text-foreground" aria-hidden="true" />
      <span className="relative z-10 mt-8 font-display text-5xl font-extrabold leading-none tracking-[-0.06em] text-foreground tabular-nums">
        {days}
      </span>
    </div>
  );
}

export function FocusStatsDashboard() {
  const { t, i18n } = useTranslation();
  const dashboard = useHomeDashboard();
  const focus = useFocus();
  const [period, setPeriod] = useState<Period>(30);

  const locale = i18n.language;
  const data = dashboard.data;
  const sessions = data?.focusSessions ?? EMPTY_FOCUS_SESSIONS;
  const [now] = useState(() => new Date());

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }),
    [locale],
  );
  const compactDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }),
    [locale],
  );
  const sessionDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  const chartData = useMemo<FocusChartDatum[]>(
    () => buildFocusDailyStats(sessions, period, now).map((entry) => ({
      ...entry,
      label: compactDateFormatter.format(localDateFromKey(entry.date)),
      fullLabel: dateFormatter.format(localDateFromKey(entry.date)),
    })),
    [compactDateFormatter, dateFormatter, period, sessions, now],
  );

  const summary = useMemo(
    () => summarizeFocusPeriod(sessions, period, now),
    [period, sessions, now],
  );
  const previousSummary = useMemo(
    () => summarizePreviousFocusPeriod(sessions, period, now),
    [period, sessions, now],
  );

  if (dashboard.isLoading) return <FocusStatsSkeleton />;

  if (dashboard.isError || !data) {
    return (
      <main className="mx-auto flex min-h-[55vh] w-full max-w-lg items-center px-4 py-10 sm:max-w-2xl sm:px-6 lg:max-w-4xl">
        <section className="w-full rounded-card border border-destructive/25 bg-card p-6 text-center shadow-level-1" aria-labelledby="focus-stats-error-title">
          <Clock3 className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <h2 id="focus-stats-error-title" className="mt-4 font-display text-xl font-bold text-foreground">
            {t("focusStats.error.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">
            {t("focusStats.error.description")}
          </p>
          <Button className="mt-5 min-h-12" onClick={() => dashboard.refetch()}>
            {t("focusStats.error.retry")}
          </Button>
        </section>
      </main>
    );
  }

  const hasPeriodData = summary.sessions > 0;
  const todayMinutes = data.minutesToday;
  const todaySessions = data.sessionsToday;
  const minutesDelta = summary.minutes - previousSummary.minutes;
  const recentSessions = sessions.slice(0, 5);
  const trendIcon = minutesDelta > 0 ? TrendingUp : minutesDelta < 0 ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendLabel = minutesDelta === 0
    ? t("focusStats.timeline.sameAsPrevious")
    : t("focusStats.timeline.comparedWithPrevious", {
      value: `${minutesDelta > 0 ? "+" : "−"}${formatMinutesForDisplay(Math.abs(minutesDelta), true)}`,
    });

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-7 pb-12 sm:max-w-2xl sm:px-6 sm:py-9 lg:max-w-4xl">
      <div className="space-y-10 sm:space-y-12">
        <section className="px-3 py-1 text-center sm:px-6" aria-labelledby="streak-title">
          <StreakEmblem days={data.streakDays} />
          <h2 id="streak-title" className="mt-5 font-display text-2xl font-extrabold tracking-tight text-foreground">
            {t("focusStats.streak.days", { count: data.streakDays })}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">
            {data.streakDays > 0 ? t("focusStats.streak.activeDescription") : t("focusStats.streak.emptyDescription")}
          </p>
        </section>

        <section aria-labelledby="today-focus-title">
          <h2 id="today-focus-title" className="sr-only">{t("focusStats.today.title")}</h2>
          <div className="border-y border-border">
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-5">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t("focusStats.today.minutes")}
                </p>
                <p className="mt-1.5 font-display text-[1.8rem] font-extrabold leading-none tracking-[-0.04em] text-foreground tabular-nums sm:text-[2.1rem]">
                  {formatMinutesForDisplay(todayMinutes)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t("focusStats.today.caption")}</p>
              </div>
              <div className="min-w-0 px-3 py-4 sm:px-5 sm:py-5">
                <p className="text-sm font-semibold text-muted-foreground">{t("focusStats.today.sessions")}</p>
                <p className="mt-1.5 font-display text-[1.8rem] font-extrabold leading-none tracking-[-0.04em] text-foreground tabular-nums sm:text-[2.1rem]">
                  {todaySessions}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{t("focusStats.today.sessionsCaption", { count: todaySessions })}</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="focus-timeline-title" className="overflow-hidden rounded-card border border-border bg-card shadow-level-1">
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 id="focus-timeline-title" className="font-display text-xl font-bold text-foreground sm:text-2xl">
                  {t("focusStats.timeline.title")}
                </h2>
                <p className="mt-1 max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {t("focusStats.timeline.description")}
                </p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto" role="group" aria-label={t("focusStats.timeline.periodLabel")}>
                {PERIODS.map((value) => {
                  const active = period === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPeriod(value)}
                      className={cn(
                        "min-h-11 flex-1 rounded-button border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-none",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:bg-surface-container-high hover:text-foreground",
                      )}
                    >
                      {t("focusStats.timeline.period", { count: value })}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasPeriodData ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden="true" />
                  <span>{t("focusStats.timeline.legend")}</span>
                  <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
                  <TrendIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{trendLabel}</span>
                </div>

                <div className="h-64 min-w-0 sm:h-72" role="img" aria-label={t("focusStats.timeline.chartAria", { count: period })}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 16, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="focus-minutes-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        interval={period === 7 ? 0 : period === 30 ? 4 : 9}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        width={34}
                        allowDecimals={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ stroke: "hsl(var(--foreground) / 0.28)", strokeWidth: 1 }}
                        content={(
                          <FocusChartTooltip
                            formatMinutes={formatMinutesForDisplay}
                            sessionsLabel={t("focusStats.timeline.sessions")}
                          />
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="minutes"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2}
                        fill="url(#focus-minutes-fill)"
                        activeDot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(var(--foreground))", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="sr-only">
                  <table>
                    <caption>{t("focusStats.timeline.tableCaption", { count: period })}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("focusStats.timeline.tableDate")}</th>
                        <th scope="col">{t("focusStats.timeline.minutes")}</th>
                        <th scope="col">{t("focusStats.timeline.sessions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((entry) => (
                        <tr key={entry.date}>
                          <td>{entry.fullLabel}</td>
                          <td>{formatMinutesForDisplay(entry.minutes)}</td>
                          <td>{entry.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center border-t border-border px-4 py-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-container-high text-foreground" aria-hidden="true">
                  <Clock3 className="h-5 w-5 stroke-[1.6]" />
                </span>
                <p className="mt-4 font-display text-lg font-bold text-foreground">{t("focusStats.timeline.emptyTitle")}</p>
                <p className="mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">{t("focusStats.timeline.emptyDescription")}</p>
                <Button className="mt-5 min-h-12 gap-2" onClick={focus.openSetup}>
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  {t("focusStats.actions.startFocus")}
                </Button>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {[
              { label: t("focusStats.summary.minutes"), value: formatMinutesForDisplay(summary.minutes) },
              { label: t("focusStats.summary.sessions"), value: summary.sessions },
              { label: t("focusStats.summary.activeDays"), value: summary.activeDays },
              { label: t("focusStats.summary.average"), value: formatMinutesForDisplay(summary.averageSessionMinutes) },
            ].map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "min-w-0 px-4 py-4 sm:px-5",
                  index % 2 === 1 && "border-l border-border",
                  index >= 2 && "border-t border-border sm:border-t-0",
                  index >= 1 && index < 4 && "sm:border-l",
                )}
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{item.label}</dt>
                <dd className="mt-2 font-display text-xl font-extrabold tracking-[-0.03em] text-foreground tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {recentSessions.length > 0 && (
          <section aria-labelledby="recent-focus-title" className="overflow-hidden rounded-card border border-border bg-card shadow-level-1">
            <div className="flex items-baseline justify-between gap-4 px-5 py-5 sm:px-6">
              <h2 id="recent-focus-title" className="font-display text-xl font-bold text-foreground">
                {t("focusStats.recent.title")}
              </h2>
              <p className="shrink-0 text-sm text-muted-foreground">{t("focusStats.recent.realData")}</p>
            </div>
            <ol className="border-t border-border">
              {recentSessions.map((session) => {
                const sessionKey = toLocalDayKey(session.completedAt);
                const isToday = sessionKey === toLocalDayKey(now);
                const title = session.taskLabel || session.subjectName || t("focusStats.recent.fallbackTitle");
                const when = isToday
                  ? t("focusStats.recent.todayAt", {
                    time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(session.completedAt)),
                  })
                  : sessionDateFormatter.format(new Date(session.completedAt));

                return (
                  <li key={session.id} className="flex min-h-[4.75rem] items-center gap-3 border-b border-border px-5 py-3 last:border-b-0 sm:px-6">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-container-high text-foreground" aria-hidden="true">
                      <Flame className="h-4 w-4 stroke-[1.6]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-foreground">{title}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {session.subjectName && session.taskLabel ? `${session.subjectName} · ${when}` : when}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-foreground tabular-nums">
                      {formatMinutesForDisplay(session.actualDuration)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>
    </main>
  );
}
