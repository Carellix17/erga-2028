import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bus, CalendarClock, CalendarX, Loader2, Moon, Plus, Save, School, Settings2, Trash2, Utensils } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlannerSettingsSheet } from "@/components/piano/PlannerSettingsSheet";
import {
  useUserRoutines, useAddUserRoutine, useUpdateUserRoutine, useDeleteUserRoutine,
  type RoutineKind, type UserRoutine,
} from "@/hooks/useUserRoutines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CoreCard } from "./CoreCard";
import { RoutineSkeleton } from "./RoutineSkeleton";
import {
  ROUTINE_DAYS, ROUTINE_GRID_HEIGHT, ROUTINE_HOURS, ROUTINE_KINDS, ROUTINE_ROW_H,
  findRoutineConflict, fmtTime, layoutRoutineSegments, minToTime, routineDayLabel,
  routineLayoutByDay, routineSegmentsByDay, routineTimesForSave, toMin,
} from "@/lib/routineLayout";

// 🎨 P9c: pastelli soft centralizzati nel kit (index.css .routine-*) — fuori i saturi blue/indigo/amber
const KIND_STYLES: Record<RoutineKind, { chip: string }> = {
  school: { chip: "routine-school" },
  sleep: { chip: "routine-sleep" },
  meal: { chip: "routine-meal" },
  other: { chip: "routine-other" },
  transport: { chip: "border-white/40 bg-white/10 text-white" },
  no_study: { chip: "border-[#D8CFBC] text-[#D8CFBC]" },
};

const KIND_ICONS: Record<RoutineKind, LucideIcon> = {
  school: School,
  sleep: Moon,
  meal: Utensils,
  other: CalendarClock,
  transport: Bus,
  no_study: CalendarX,
};

const routineKindTranslationKey = (kind: RoutineKind) =>
  ROUTINE_KINDS.find((routineKind) => routineKind.value === kind)?.labelKey ?? "piano.routine_other";

const DAY_ABBR: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Gio",
  5: "Ven",
  6: "Sab",
  7: "Dom",
};

const majorHour = (hour: number) => hour % 6 === 0;

export function WeeklyRoutineEditor() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const routines = useUserRoutines();
  const addRoutine = useAddUserRoutine();
  const updateRoutine = useUpdateUserRoutine();
  const delRoutine = useDeleteUserRoutine();

  // Modal state (creazione + modifica)
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSheetMounted, setSettingsSheetMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rKind, setRKind] = useState<RoutineKind>("school");
  const [rLabel, setRLabel] = useState("");
  const [rStart, setRStart] = useState("08:00");
  const [rEnd, setREnd] = useState("13:00");
  const [rDays, setRDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Vista mobile: giorno attivo nella colonna agenda
  const [mobileDay, setMobileDay] = useState<number>(() => {
    const js = new Date().getDay(); // 0=Dom..6=Sab
    return js === 0 ? 7 : js;
  });

  const openCreate = (prefill?: { day?: number; hour?: number }) => {
    setEditingId(null);
    setRKind("school");
    setRLabel("");
    const startHour = prefill?.hour ?? 8;
    setRStart(`${String(startHour).padStart(2, "0")}:00`);
    setREnd(`${String(Math.min(startHour + 1, 23)).padStart(2, "0")}:00`);
    setRDays(prefill?.day ? [prefill.day] : [1, 2, 3, 4, 5]);
    setModalOpen(true);
  };

  const openEdit = (r: UserRoutine) => {
    setEditingId(r.id);
    setRKind(r.kind);
    setRLabel(r.label ?? "");
    setRStart(r.kind === "no_study" ? "00:00" : fmtTime(r.start_time));
    setREnd(r.kind === "no_study" ? "23:59" : fmtTime(r.end_time));
    setRDays([...(r.days_of_week ?? [])].sort());
    setModalOpen(true);
  };

  const changeRoutineKind = (kind: RoutineKind) => {
    if (kind === "no_study") {
      setRStart("00:00");
      setREnd("23:59");
    } else if (rKind === "no_study") {
      setRStart("08:00");
      setREnd("13:00");
    }
    setRKind(kind);
  };

  const toggleDay = (n: number) =>
    setRDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));

  const handleSaveRoutine = async () => {
    if (rDays.length === 0) {
      toast({ title: "Seleziona almeno un giorno", variant: "destructive" });
      return;
    }
    if (rKind !== "no_study" && (!rStart || !rEnd)) {
      toast({ title: "Orario non valido", description: "Inserisci un orario di inizio e fine.", variant: "destructive" });
      return;
    }
    if (rKind !== "no_study" && toMin(rStart) === toMin(rEnd)) {
      toast({ title: "Orario non valido", description: "Inizio e fine coincidono.", variant: "destructive" });
      return;
    }

    // I giorni senza studio sono un indicatore all-day, non un appuntamento in conflitto.
    const conflict = findRoutineConflict(
      { kind: rKind, startTime: rStart, endTime: rEnd, days: rDays },
      routines.data ?? [],
      editingId,
    );
    if (conflict) {
      const routineName =
        conflict.existing.routine?.label ??
        t(routineKindTranslationKey(conflict.existing.routine?.kind ?? "other"));
      toast({
        title: "Routine sovrapposta",
        description: `${routineDayLabel(conflict.candidate.day)}, ${minToTime(conflict.candidate.startMin)}–${minToTime(conflict.candidate.endMin)} si sovrappone a ${routineName} (${minToTime(conflict.existing.startMin)}–${minToTime(conflict.existing.endMin)}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        kind: rKind,
        label: rLabel.trim() || null,
        ...routineTimesForSave(rKind, rStart, rEnd),
        days_of_week: rDays,
      };
      if (editingId) {
        await updateRoutine.mutateAsync({ id: editingId, ...payload });
      } else {
        await addRoutine.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Errore", description: (e as Error)?.message ?? "Impossibile salvare", variant: "destructive" });
    }
  };

  const handleDeleteRoutine = async () => {
    if (!editingId) return;
    try {
      await delRoutine.mutateAsync(editingId);
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Errore", description: (e as Error)?.message ?? "Impossibile eliminare", variant: "destructive" });
    }
  };

  const laidOutByDay = useMemo(() => routineLayoutByDay(routines.data ?? []), [routines.data]);
  const segmentsByDay = useMemo(() => routineSegmentsByDay(routines.data ?? []), [routines.data]);
  const isEmpty = !routines.isLoading && (routines.data?.length ?? 0) === 0;
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();

  const showRoutineSkeleton = useDelayedLoading(routines.isLoading, 100);
  if (showRoutineSkeleton) {
    return <RoutineSkeleton />;
  }
  if (routines.isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <CoreCard
        id="routine"
        icon={CalendarClock}
        title={t("piano.routineWeekTitle")}
        action={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSettingsSheetMounted(true);
                setSettingsOpen(true);
              }}
              className="core-ivory core-radius h-11 w-full px-4 font-semibold sm:w-auto"
            >
              <Settings2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {t("piano.settings.open")}
            </Button>
            <Button
              type="button"
              onClick={() => openCreate()}
              size="sm"
              className="core-ivory core-radius h-11 w-full px-4 font-semibold sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
              {t("piano.routineAddBlock")}
            </Button>
          </div>
        }
      >
        {isEmpty ? (
          <div className="space-y-2 py-8 text-center">
            <CalendarClock className="mx-auto h-8 w-8 text-[#dadbdf]" aria-hidden="true" />
            <p className="body-medium text-[#dadbdf]">
              Nessuna attività programmata.
            </p>
            <p className="body-small text-[#dadbdf]">
              Aggiungi i tuoi orari di sport o pasti per ottimizzare lo studio.
            </p>
          </div>
        ) : (
          <div className="core-surface core-radius overflow-hidden border">
            <div className="flex gap-1 border-b border-[#6a6e74] p-2 md:hidden">
              {ROUTINE_DAYS.map((d) => {
                const active = mobileDay === d.n;
                const hasBlocks = (segmentsByDay[d.n]?.length ?? 0) > 0;
                return (
                  <button
                    key={d.n}
                    type="button"
                    onClick={() => setMobileDay(d.n)}
                    aria-label={d.label}
                    aria-pressed={active}
                    className={cn(
                      "core-radius relative h-11 flex-1 text-xs font-semibold",
                      active
                        ? "border border-[#FFFBF4] text-white"
                        : "border border-transparent text-[#dadbdf] hover:border-[#6a6e74]",
                    )}
                  >
                    {DAY_ABBR[d.n]}
                    {hasBlocks && (
                      <span className="absolute bottom-1.5 left-1/2 h-0.5 w-3 -translate-x-1/2 bg-[#D8CFBC]" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[44rem]">
                <div className="grid border-b border-[#6a6e74]" style={{ gridTemplateColumns: "4rem repeat(7, minmax(0, 1fr))" }}>
                  <div />
                  {ROUTINE_DAYS.map((d) => (
                    <div
                      key={d.n}
                      className={cn(
                        "border-l border-[#6a6e74]/50 py-3 text-center font-mono text-[12px] font-semibold uppercase tracking-[0.08em]",
                        d.n === today ? "text-white" : "text-[#D8CFBC]",
                      )}
                    >
                      {DAY_ABBR[d.n]}
                    </div>
                  ))}
                </div>
                <div className="grid" style={{ gridTemplateColumns: "4rem repeat(7, minmax(0, 1fr))" }}>
                  <HourGutter />
                  {ROUTINE_DAYS.map((d) => (
                    <DayColumn
                      key={d.n}
                      day={d.n}
                      segments={laidOutByDay[d.n]}
                      onAdd={(hour) => openCreate({ day: d.n, hour })}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <div className="grid" style={{ gridTemplateColumns: "4rem minmax(0, 1fr)" }}>
                <HourGutter />
                <DayColumn
                  day={mobileDay}
                  segments={laidOutByDay[mobileDay] ?? []}
                  onAdd={(hour) => openCreate({ day: mobileDay, hour })}
                  onEdit={openEdit}
                  mobile
                />
              </div>
            </div>
          </div>
        )}
      </CoreCard>

      {settingsSheetMounted && (
        <PlannerSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      )}

      {/* Modale creazione / modifica routine */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="core-surface core-radius max-w-md border text-white shadow-none">
          <DialogHeader>
            <DialogTitle className="title-medium font-display font-semibold text-white">
              {editingId ? "Modifica blocco" : "Nuovo blocco"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="label-medium text-[#dadbdf]">Tipo</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {ROUTINE_KINDS.map((k) => {
                  const active = rKind === k.value;
                  const st = KIND_STYLES[k.value];
                  const Icon = KIND_ICONS[k.value];
                  return (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => changeRoutineKind(k.value)}
                      aria-pressed={active}
                      className={cn(
                        "core-radius inline-flex min-h-11 items-center gap-1.5 border px-3 text-sm font-semibold",
                        active ? st.chip : "core-surface text-white hover:bg-white/[0.04]",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {t(k.labelKey)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-[#dadbdf]">
                {rKind === "transport"
                  ? t("piano.routineTransportHelp")
                  : rKind === "no_study"
                    ? t("piano.routineNoStudyHelp")
                    : "Sport, hobby e altri impegni fissi → “Altro”."}
              </p>
            </div>

            <div>
              <Label htmlFor="routine-label" className="label-medium text-[#dadbdf]">
                Nome attività (opzionale)
              </Label>
              <Input
                id="routine-label"
                value={rLabel}
                onChange={(e) => setRLabel(e.target.value)}
                placeholder="Es. Palestra, Nuoto, Scuola mattina"
                className="core-surface core-radius mt-2 h-11 border text-white placeholder:text-[#c8cdd4]"
              />
            </div>

            {rKind === "no_study" ? (
              <div className="core-radius flex min-h-11 items-center gap-2 border border-[#6a6e74] px-3 text-sm text-[#dadbdf]" role="status">
                <CalendarX className="h-4 w-4" aria-hidden="true" />
                {t("piano.routine_all_day")}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="routine-start" className="label-medium text-[#dadbdf]">Inizio</Label>
                    <Input
                      id="routine-start"
                      type="time"
                      value={rStart}
                      onChange={(e) => setRStart(e.target.value)}
                      className="core-surface core-radius mt-2 h-11 border text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="routine-end" className="label-medium text-[#dadbdf]">Fine</Label>
                    <Input
                      id="routine-end"
                      type="time"
                      value={rEnd}
                      onChange={(e) => setREnd(e.target.value)}
                      className="core-surface core-radius mt-2 h-11 border text-white"
                    />
                  </div>
                </div>
                <p className="text-sm text-[#dadbdf]">
                  Se la fine è prima dell'inizio (es. 22:00 → 06:00), il blocco attraversa la mezzanotte.
                </p>
              </>
            )}

            <div>
              <Label className="label-medium text-[#dadbdf]">Ripeti nei giorni</Label>
              <div className="flex gap-1.5 mt-1.5">
                {ROUTINE_DAYS.map((d) => {
                  const active = rDays.includes(d.n);
                  return (
                    <button
                      key={d.n}
                      onClick={() => toggleDay(d.n)}
                      aria-pressed={active}
                      aria-label={d.label}
                      className={cn(
                        "core-radius h-11 flex-1 border text-sm font-semibold",
                        active
                          ? "border-[#FFFBF4] bg-[#FFFBF4] text-[#0a0a0a]"
                          : "core-surface text-[#dadbdf] hover:text-white",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {editingId && (
              <Button
                variant="outline"
                onClick={handleDeleteRoutine}
                disabled={delRoutine.isPending}
                className="core-radius h-11 w-full border border-destructive/40 bg-transparent text-destructive shadow-none hover:bg-destructive/10"
              >
                {delRoutine.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                Elimina blocco
              </Button>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="core-radius h-11 flex-1 border-[#6a6e74] bg-transparent font-semibold text-white shadow-none hover:bg-white/[0.04]"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveRoutine}
                disabled={addRoutine.isPending || updateRoutine.isPending}
                className="core-ivory core-radius h-11 flex-1 font-semibold"
              >
                {addRoutine.isPending || updateRoutine.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                ) : (
                  <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                {editingId ? "Aggiorna" : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HourGutter() {
  return (
    <div className="relative" style={{ height: ROUTINE_GRID_HEIGHT }}>
      {ROUTINE_HOURS.map((hour) => (
        <div
          key={hour}
          className={cn(
            "absolute right-2 font-mono tabular-nums leading-none",
            majorHour(hour) ? "text-[13px] font-semibold text-white" : "text-[12px] text-[#dadbdf]",
          )}
          style={{ top: hour * ROUTINE_ROW_H + 8 }}
        >
          {majorHour(hour) ? `${String(hour).padStart(2, "0")}:00` : String(hour).padStart(2, "0")}
        </div>
      ))}
    </div>
  );
}

function DayColumn({
  day,
  segments,
  onAdd,
  onEdit,
  mobile = false,
}: {
  day: number;
  segments: ReturnType<typeof layoutRoutineSegments>;
  onAdd: (hour: number) => void;
  onEdit: (routine: UserRoutine) => void;
  mobile?: boolean;
}) {
  return (
    <div className="relative border-l border-[#6a6e74]/50" style={{ height: ROUTINE_GRID_HEIGHT }}>
      {ROUTINE_HOURS.map((hour) => (
        <button
          key={hour}
          type="button"
          onClick={() => onAdd(hour)}
          className={cn(
            "absolute inset-x-0 hover:bg-white/[0.04] focus-visible:bg-white/[0.06] focus-visible:outline-none",
            majorHour(hour) ? "border-t border-[#6a6e74]" : "border-t border-[#6a6e74]/35",
          )}
          style={{ top: hour * ROUTINE_ROW_H, height: ROUTINE_ROW_H }}
          aria-label={`Aggiungi blocco ${routineDayLabel(day)} ${hour}:00`}
        />
      ))}
      {segments.map((seg, index) => (
        <RoutineBlockButton
          key={`${seg.routine.id}-${day}-${index}`}
          seg={seg}
          onEdit={() => onEdit(seg.routine)}
          mobile={mobile}
        />
      ))}
    </div>
  );
}

interface BlockProps {
  seg: ReturnType<typeof layoutRoutineSegments>[number];
  onEdit: () => void;
  mobile?: boolean;
}

/** Blocco routine sulla griglia (bottone: apre la modifica). */
function RoutineBlockButton({ seg, onEdit, mobile }: BlockProps) {
  const { t } = useTranslation();
  const r = seg.routine;
  const st = KIND_STYLES[r.kind];
  const Icon = KIND_ICONS[r.kind];
  const displayName = r.label || t(routineKindTranslationKey(r.kind));
  const laneWidth = 100 / seg.laneCount;
  const timeLabel = r.kind === "no_study"
    ? t("piano.routine_all_day")
    : `${minToTime(seg.startMin)}–${minToTime(seg.endMin)}`;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      className={cn(
        "core-radius absolute overflow-hidden border border-[#6a6e74] text-left shadow-none",
        "active:scale-[0.98] motion-reduce:transform-none",
        mobile ? "px-3 py-1.5 text-[13px]" : "px-2 py-1 text-[12px] leading-snug",
        st.chip,
      )}
      style={{
        top: seg.renderTopPx,
        height: seg.renderHeightPx,
        left: `calc(${seg.lane * laneWidth}% + ${mobile ? 6 : 4}px)`,
        width: `calc(${laneWidth}% - ${mobile ? 12 : 8}px)`,
        boxSizing: "border-box",
      }}
      aria-label={`${displayName}, ${routineDayLabel(seg.day)} ${timeLabel}. ${t("piano.routineTapToEdit")}`}
    >
      <div className="flex min-w-0 items-center gap-1 font-semibold">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{displayName}</span>
      </div>
      {seg.renderHeightPx >= 40 && (
        <div className="font-mono text-[12px] tabular-nums text-[#dadbdf]">{timeLabel}</div>
      )}
    </button>
  );
}


