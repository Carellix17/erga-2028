import { useEffect, useId, useMemo, useRef, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PlanWarning, ScheduleEvaluation } from "@/lib/planner/schedule";
import type { PlanChange, PlanChangeEventValues, PlanChangeSnapshot } from "@/lib/planner/types";

interface ChangePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: PlanChange[];
  warnings: PlanWarning[];
  evaluations: readonly Pick<ScheduleEvaluation, "id" | "title" | "subject">[];
  isApplying?: boolean;
  onApply: (changes: PlanChange[]) => void | Promise<void>;
  onModify: () => void;
  onLeave: () => void;
}

interface ChangeRow {
  index: number;
  day: string;
  before: PlanChangeSnapshot | undefined;
  after: PlanChangeEventValues | undefined;
}

function changeRows(changes: readonly PlanChange[]): ChangeRow[] {
  return changes.map((change, index) => ({
    index,
    day: (change.op === "delete" ? change.before?.event_date : change.after.event_date)
      ?? change.before?.event_date
      ?? "",
    before: change.before,
    after: change.op === "delete" ? undefined : change.after,
  })).sort((left, right) => left.day.localeCompare(right.day) || left.index - right.index);
}

function slotText(
  value: PlanChangeSnapshot | PlanChangeEventValues | undefined,
  fallback: string,
  language: string,
): string {
  if (!value) return fallback;
  const day = typeof value.event_date === "string" ? value.event_date.slice(0, 10) : "";
  const date = day && isValid(parseISO(day))
    ? format(parseISO(day), "EEEE d MMMM", { locale: language.startsWith("en") ? enUS : it })
    : day;
  const time = typeof value.event_time === "string" ? value.event_time.slice(0, 5) : "";
  const title = typeof value.title === "string" && value.title.trim() ? value.title : "";
  return [title, date, time].filter(Boolean).join(" · ") || fallback;
}

function rowLabel(change: PlanChange, t: (key: string) => string): string {
  if (change.op === "insert") return t("piano.changePreview.newSlot");
  if (change.op === "delete") return t("piano.changePreview.removeSlot");
  return t("piano.changePreview.moveSlot");
}

export function ChangePreview({
  open,
  onOpenChange,
  changes,
  warnings,
  evaluations,
  isApplying = false,
  onApply,
  onModify,
  onLeave,
}: ChangePreviewProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(changes.map((_change, index) => index)));
  const locale = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? enUS : it;
  const orderedRows = useMemo(() => changeRows(changes), [changes]);
  const selectedChanges = useMemo(
    () => changes.filter((_change, index) => selected.has(index)),
    [changes, selected],
  );
  const groupedRows = useMemo(() => {
    const groups = new Map<string, ChangeRow[]>();
    for (const row of orderedRows) groups.set(row.day, [...(groups.get(row.day) ?? []), row]);
    return [...groups.entries()];
  }, [orderedRows]);
  const evaluationById = useMemo(() => new Map(evaluations.map((evaluation) => [evaluation.id, evaluation])), [evaluations]);

  useEffect(() => {
    if (open) {
      setSelected(new Set(changes.map((_change, index) => index)));
      titleRef.current?.focus({ preventScroll: true });
    }
  }, [changes, open]);

  const toggle = (index: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const formatDay = (day: string) => {
    if (!day || !isValid(parseISO(day))) return t("piano.changePreview.unknownDay");
    return format(parseISO(day), "EEEE d MMMM", { locale });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile
          ? "flex h-[90dvh] max-h-[90dvh] w-full max-w-none flex-col gap-0 overflow-hidden p-0"
          : "flex h-full w-[480px] max-w-[min(480px,100vw)] flex-col gap-0 overflow-hidden p-0"}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus({ preventScroll: true });
        }}
      >
        <SheetHeader className="shrink-0 border-b border-border p-5 pr-16 text-left">
          <SheetTitle ref={titleRef} tabIndex={-1} className="outline-none">
            {t("piano.changePreview.title")}
          </SheetTitle>
          <SheetDescription>
            {t("piano.changePreview.description")}
          </SheetDescription>
          <p className="sr-only" role="status" aria-live="polite">
            {t("piano.changePreview.ready", { count: changes.length })}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {groupedRows.length === 0 && warnings.length === 0 && (
            <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {t("piano.changePreview.empty")}
            </p>
          )}

          {groupedRows.map(([day, rows]) => (
            <section key={day || "unknown"} className="mb-5" aria-label={formatDay(day)}>
              <h3 className="mb-2 text-sm font-semibold capitalize">{formatDay(day)}</h3>
              <ul className="space-y-2">
                {rows.map((row) => {
                  const change = changes[row.index];
                  const checkboxId = `${id}-change-${row.index}`;
                  const detailId = `${checkboxId}-detail`;
                  return (
                    <li key={checkboxId} className="rounded-xl border border-border bg-background">
                      <label htmlFor={checkboxId} className="flex min-h-11 cursor-pointer items-center gap-3 p-2">
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={selected.has(row.index)}
                          onChange={() => toggle(row.index)}
                          disabled={isApplying}
                          aria-describedby={detailId}
                          className="h-11 w-11 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span className="min-w-0 flex-1 text-sm font-medium">
                          {rowLabel(change, (key) => t(key))}
                        </span>
                      </label>
                      <div id={detailId} className="space-y-1 border-t border-border px-3 py-3 text-sm">
                        <p><span className="font-medium">{t("piano.changePreview.before")}: </span>{slotText(row.before, t("piano.changePreview.noSlot"), i18n.language)}</p>
                        <p><span className="font-medium">{t("piano.changePreview.after")}: </span>{slotText(row.after, t("piano.changePreview.noSlot"), i18n.language)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {warnings.length > 0 && (
            <section className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4" aria-labelledby={`${id}-warnings`}>
              <h3 id={`${id}-warnings`} className="font-semibold">{t("piano.changePreview.warningsTitle")}</h3>
              <p className="mt-1 text-sm">{t("piano.changePreview.warningsSummary", { count: warnings.length })}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {warnings.map((warning) => {
                  const evaluation = evaluationById.get(warning.evaluationId);
                  return (
                    <li key={warning.evaluationId}>
                      {t("piano.changePreview.warningItem", {
                        subject: evaluation?.subject || evaluation?.title || t("piano.evaluation"),
                        minutes: warning.missingMinutes,
                      })}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-border bg-popover p-4 pb-safe sm:flex-col sm:items-stretch">
          <Button onClick={() => void onApply(selectedChanges)} disabled={isApplying || selectedChanges.length === 0} className="min-h-11 w-full">
            {t("piano.changePreview.apply", { count: selectedChanges.length })}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onModify} disabled={isApplying} className="min-h-11 flex-1">
              {t("piano.changePreview.modify")}
            </Button>
            <Button variant="ghost" onClick={onLeave} disabled={isApplying} className="min-h-11 flex-1">
              {t("piano.changePreview.leave")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
