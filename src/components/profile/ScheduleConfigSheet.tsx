import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, BookOpen, CalendarClock, Loader2, Save } from "lucide-react";
import {
  useUserSubjects, useAddUserSubject, useDeleteUserSubject, useUpdateSubjectColor,
} from "@/hooks/useUserSubjects";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SUBJECT_PALETTE, resolveSubjectColor } from "@/lib/subjectColors";
import {
  useUserRoutines, useAddUserRoutine, useUpdateUserRoutine, useDeleteUserRoutine,
  type RoutineKind, type UserRoutine,
} from "@/hooks/useUserRoutines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const KINDS: { value: RoutineKind; label: string }[] = [
  { value: "school", label: "Scuola" },
  { value: "sleep", label: "Sonno" },
  { value: "meal",   label: "Pasti" },
  { value: "other",  label: "Altro" },
];

// 🎨 P9c: pastelli soft centralizzati nel kit (index.css .routine-*) — fuori i saturi blue/indigo/amber
const KIND_STYLES: Record<RoutineKind, { chip: string; dot: string }> = {
  school: { chip: "routine-school", dot: "routine-school-dot" },
  sleep:  { chip: "routine-sleep",  dot: "routine-sleep-dot" },
  meal:   { chip: "routine-meal",   dot: "routine-meal-dot" },
  other:  { chip: "bg-slate-100 border-slate-200/80 text-slate-900", dot: "bg-slate-400" },
};

// 1 = Mon ... 7 = Sun
const DAYS: { n: number; short: string; label: string }[] = [
  { n: 1, short: "L", label: "Lunedì" },
  { n: 2, short: "M", label: "Martedì" },
  { n: 3, short: "M", label: "Mercoledì" },
  { n: 4, short: "G", label: "Giovedì" },
  { n: 5, short: "V", label: "Venerdì" },
  { n: 6, short: "S", label: "Sabato" },
  { n: 7, short: "D", label: "Domenica" },
];

const HOUR_START = 0;
const HOUR_END = 24;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const ROW_H = 48; // px per hour → exact math (1h = 48px, 2h = 96px)
const GRID_HEIGHT = (HOUR_END - HOUR_START) * ROW_H;
// Visual minimum block height (px) — must match the min-height used in rendering.
const MIN_BLOCK_PX = 32;
// Convert that to "minutes" so short blocks reserve a matching slot for lane packing.
const MIN_BLOCK_MIN = Math.ceil((MIN_BLOCK_PX / ROW_H) * 60); // 40 min

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmt = (t: string) => t.slice(0, 5);
const pxFromMin = (m: number) => (m / 60) * ROW_H;

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

interface Segment {
  routine: UserRoutine;
  day: number;
  startMin: number; // minutes from 00:00 of that day
  endMin: number;   // minutes from 00:00 of that day
}

interface LaidOutSegment extends Segment {
  lane: number;
  laneCount: number;
  /** Actual rendered top (px), pushed down if a previous inflated block would overlap. */
  renderTopPx: number;
  /** Actual rendered height (px), respects MIN_BLOCK_PX. */
  renderHeightPx: number;
}

interface TimeWindow {
  day: number;
  startMin: number;
  endMin: number;
  routine?: UserRoutine;
}

const nextDay = (d: number) => (d === 7 ? 1 : d + 1);

const dayName = (n: number) => DAYS.find((d) => d.n === n)?.label ?? "giorno selezionato";
const minToTime = (m: number) => {
  if (m >= 24 * 60) return "24:00";
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const splitWindows = (
  startTime: string,
  endTime: string,
  days: number[],
  routine?: UserRoutine,
): TimeWindow[] => {
  const s = toMin(startTime);
  const e = toMin(endTime);
  const windows: TimeWindow[] = [];
  for (const d of days) {
    if (!DAYS.some((day) => day.n === d)) continue;
    if (e > s) {
      windows.push({ day: d, startMin: s, endMin: e, routine });
    } else {
      windows.push({ day: d, startMin: s, endMin: 24 * 60, routine });
      windows.push({ day: nextDay(d), startMin: 0, endMin: e, routine });
    }
  }
  return windows;
};

const windowsOverlap = (a: TimeWindow, b: TimeWindow) =>
  a.day === b.day && a.startMin < b.endMin && b.startMin < a.endMin;

const layoutSegments = (segments: Segment[]): LaidOutSegment[] => {
  // Strict time overlap only: two segments collide iff (startA < endB) AND (startB < endA).
  // Consecutive segments (endA === startB) do NOT collide and must span full width.
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const laidOut: LaidOutSegment[] = [];

  let group: Segment[] = [];
  let groupEnd = 0;

  const flushGroup = () => {
    if (!group.length) return;
    const lanes: number[] = [];
    const groupLayout: LaidOutSegment[] = [];

    for (const seg of group) {
      const lane = lanes.findIndex((end) => end <= seg.startMin);
      const assignedLane = lane === -1 ? lanes.length : lane;
      lanes[assignedLane] = seg.endMin;
      groupLayout.push({
        ...seg,
        lane: assignedLane,
        laneCount: 1,
        renderTopPx: 0,
        renderHeightPx: 0,
      });
    }

    const laneCount = Math.max(1, lanes.length);
    laidOut.push(...groupLayout.map((seg) => ({ ...seg, laneCount })));
    group = [];
    groupEnd = 0;
  };

  for (const seg of sorted) {
    if (!group.length) {
      group = [seg];
      groupEnd = seg.endMin;
      continue;
    }

    if (seg.startMin < groupEnd) {
      group.push(seg);
      groupEnd = Math.max(groupEnd, seg.endMin);
    } else {
      flushGroup();
      group = [seg];
      groupEnd = seg.endMin;
    }
  }

  flushGroup();

  // Compute rendered top/height per lane. Each block honors MIN_BLOCK_PX and is
  // pushed down so it never visually overlaps the previous block in its lane.
  const byLane = new Map<number, LaidOutSegment[]>();
  for (const seg of laidOut) {
    const arr = byLane.get(seg.lane) ?? [];
    arr.push(seg);
    byLane.set(seg.lane, arr);
  }
  for (const arr of byLane.values()) {
    arr.sort((a, b) => a.startMin - b.startMin);
    let prevBottom = 0;
    for (const seg of arr) {
      const chronologicalTop = pxFromMin(seg.startMin);
      const rawHeight = pxFromMin(seg.endMin - seg.startMin);
      const top = Math.max(chronologicalTop, prevBottom);
      const height = Math.max(MIN_BLOCK_PX, rawHeight);
      seg.renderTopPx = top;
      seg.renderHeightPx = height;
      prevBottom = top + height;
    }
  }

  return laidOut;
};

export function ScheduleConfigSheet({ open, onOpenChange }: Props) {
  const { toast } = useToast();

  const subjects = useUserSubjects();
  const addSubject = useAddUserSubject();
  const delSubject = useDeleteUserSubject();
  const updateColor = useUpdateSubjectColor();
  const [newSubject, setNewSubject] = useState("");

  const routines = useUserRoutines();
  const addRoutine = useAddUserRoutine();
  const updateRoutine = useUpdateUserRoutine();
  const delRoutine = useDeleteUserRoutine();

  // Modal state (create + edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rKind, setRKind] = useState<RoutineKind>("school");
  const [rLabel, setRLabel] = useState("");
  const [rStart, setRStart] = useState("08:00");
  const [rEnd, setREnd] = useState("13:00");
  const [rDays, setRDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Mobile single-day view: which day is active
  const [mobileDay, setMobileDay] = useState<number>(() => {
    const js = new Date().getDay(); // 0=Sun..6=Sat
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
    setRStart(fmt(r.start_time));
    setREnd(fmt(r.end_time));
    setRDays([...(r.days_of_week ?? [])].sort());
    setModalOpen(true);
  };

  const toggleDay = (n: number) =>
    setRDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));

  const handleAddSubject = async () => {
    const n = newSubject.trim();
    if (!n) return;
    try {
      await addSubject.mutateAsync(n);
      setNewSubject("");
    } catch (e) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile aggiungere", variant: "destructive" });
    }
  };

  const handleSaveRoutine = async () => {
    if (rDays.length === 0) {
      toast({ title: "Seleziona almeno un giorno", variant: "destructive" });
      return;
    }
    if (!rStart || !rEnd) {
      toast({ title: "Orario non valido", description: "Inserisci un orario di inizio e fine.", variant: "destructive" });
      return;
    }
    if (toMin(rStart) === toMin(rEnd)) {
      toast({ title: "Orario non valido", description: "Inizio e fine coincidono.", variant: "destructive" });
      return;
    }

    const candidateWindows = splitWindows(rStart, rEnd, rDays);
    const existingWindows = (routines.data ?? [])
      .filter((r) => r.id !== editingId)
      .flatMap((r) => splitWindows(r.start_time, r.end_time, r.days_of_week ?? [], r));
    const conflict = candidateWindows
      .map((candidate) => ({
        candidate,
        existing: existingWindows.find((existing) => windowsOverlap(candidate, existing)),
      }))
      .find(({ existing }) => existing);

    if (conflict?.existing) {
      const routineName = conflict.existing.routine?.label
        || KINDS.find((k) => k.value === conflict.existing?.routine?.kind)?.label
        || "un altro blocco";
      toast({
        title: "Routine sovrapposta",
        description: `${dayName(conflict.candidate.day)}, ${minToTime(conflict.candidate.startMin)}–${minToTime(conflict.candidate.endMin)} si sovrappone a ${routineName} (${minToTime(conflict.existing.startMin)}–${minToTime(conflict.existing.endMin)}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        kind: rKind,
        label: rLabel.trim() || null,
        start_time: rStart,
        end_time: rEnd,
        days_of_week: rDays,
      };
      if (editingId) {
        await updateRoutine.mutateAsync({ id: editingId, ...payload });
      } else {
        await addRoutine.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    }
  };

  const handleDeleteRoutine = async () => {
    if (!editingId) return;
    try {
      await delRoutine.mutateAsync(editingId);
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile eliminare", variant: "destructive" });
    }
  };

  // Compute segments per day, splitting overnight blocks (end <= start).
  const segmentsByDay = useMemo(() => {
    const map: Record<number, Segment[]> = {};
    for (const d of DAYS) map[d.n] = [];
    for (const r of routines.data ?? []) {
      for (const w of splitWindows(r.start_time, r.end_time, r.days_of_week ?? [], r)) {
        if (map[w.day]) map[w.day].push({ routine: r, day: w.day, startMin: w.startMin, endMin: w.endMin });
      }
    }
    // sort for stability
    for (const d of DAYS) map[d.n].sort((a, b) => a.startMin - b.startMin);
    return map;
  }, [routines.data]);

  const laidOutSegmentsByDay = useMemo(() => {
    const map: Record<number, LaidOutSegment[]> = {};
    for (const d of DAYS) map[d.n] = layoutSegments(segmentsByDay[d.n] ?? []);
    return map;
  }, [segmentsByDay]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2rem] pb-safe bg-[#FCFCFC] max-h-[94vh] overflow-y-auto p-4"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="title-large font-display">Orari e Materie</SheetTitle>
        </SheetHeader>

        {/* Materie */}
        <section className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="title-medium font-display">Materie predefinite</h3>
          </div>
          <div className="flex gap-2">
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSubject(); } }}
              placeholder="Es. Matematica"
              className="rounded-2xl h-11 bg-white border border-slate-200/70"
            />
            <Button
              onClick={handleAddSubject}
              disabled={addSubject.isPending || !newSubject.trim()}
              size="icon"
              className="h-11 w-11 rounded-2xl shrink-0"
            >
              {addSubject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.data?.length ? subjects.data.map((s) => {
              const col = resolveSubjectColor(s.name, s.color);
              return (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200/70 pl-2.5 pr-1 py-1 text-sm animate-scale-in"
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 rounded-full pr-1 hover:opacity-80 transition"
                        aria-label={`Cambia colore di ${s.name}`}
                        title="Cambia colore"
                      >
                        <span className={cn("w-3 h-3 rounded-full ring-2 ring-offset-1", col.solid, s.color ? "ring-slate-300" : "ring-transparent")} />
                        {s.name}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="start">
                      <p className="text-xs font-semibold mb-2">Colore di {s.name}</p>
                      <div className="grid grid-cols-7 gap-1.5 mb-2">
                        {SUBJECT_PALETTE.map((c) => (
                          <button
                            key={c.key}
                            onClick={() => updateColor.mutate({ id: s.id, color: c.key })}
                            aria-label={c.label}
                            className={cn(
                              "w-6 h-6 rounded-full transition-transform hover:scale-110",
                              c.solid,
                              (s.color === c.key || (!s.color && col.key === c.key)) && "ring-2 ring-offset-2 ring-slate-800",
                            )}
                          />
                        ))}
                      </div>
                      {s.color && (
                        <button
                          onClick={() => updateColor.mutate({ id: s.id, color: null })}
                          className="text-xs text-muted-foreground hover:text-foreground transition"
                        >
                          ↺ Torna al colore automatico
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => delSubject.mutate(s.id)}
                    className="rounded-full p-1 hover:bg-slate-100 transition"
                    aria-label={`Rimuovi ${s.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </span>
              );
            }) : (
              <p className="body-small text-muted-foreground">Nessuna materia aggiunta.</p>
            )}
          </div>
        </section>

        {/* Griglia settimanale */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              <h3 className="title-medium font-display">Settimana</h3>
            </div>
            <Button
              onClick={() => openCreate()}
              size="sm"
              className="h-9 rounded-full px-3"
            >
              <Plus className="w-4 h-4 mr-1" /> Aggiungi blocco
            </Button>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
            {/* Mobile: day selector pills */}
            <div className="md:hidden flex items-center justify-between gap-1 px-3 pt-3 pb-2 border-b border-slate-100">
              {DAYS.map((d) => {
                const active = mobileDay === d.n;
                return (
                  <button
                    key={d.n}
                    onClick={() => setMobileDay(d.n)}
                    aria-label={d.label}
                    aria-pressed={active}
                    className={cn(
                      "flex-1 h-9 rounded-full text-xs font-semibold transition-all duration-300",
                      active
                        ? "bg-foreground text-background scale-[1.04] shadow-sm"
                        : "text-muted-foreground hover:bg-slate-50"
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>

            {/* Desktop/Tablet: full 7-column grid */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid" style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}>
                  <div className="border-b border-slate-100" />
                  {DAYS.map((d) => (
                    <div
                      key={d.n}
                      className="text-center py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-slate-100"
                    >
                      {d.short}
                    </div>
                  ))}
                </div>

                {/* Griglia oraria */}
                <div
                  className="grid relative"
                  style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}
                >
                  {/* Colonna ore */}
                  <div className="relative" style={{ height: GRID_HEIGHT }}>
                    {HOURS.map((h, i) => (
                      i === 0 ? null : (
                        <div
                          key={h}
                          className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums pr-1 text-right"
                          style={{ top: i * ROW_H - 6 }}
                        >
                          {String(h).padStart(2, "0")}:00
                        </div>
                      )
                    ))}
                  </div>

                  {/* Colonne giorni */}
                  {DAYS.map((d) => (
                    <div
                      key={d.n}
                      className="relative border-l border-slate-100"
                      style={{ height: GRID_HEIGHT }}
                    >
                      {/* Righe orarie cliccabili */}
                      {HOURS.map((h, i) => (
                        <button
                          key={h}
                          onClick={() => openCreate({ day: d.n, hour: h })}
                          className="absolute left-0 right-0 border-b border-slate-100/80 hover:bg-slate-50/70 transition-colors"
                          style={{ top: i * ROW_H, height: ROW_H }}
                          aria-label={`Aggiungi blocco ${d.label} ${h}:00`}
                        />
                      ))}

                      {/* Segmenti routine: splittati per overnight e disposti in corsie per evitare sovrapposizioni visive */}
                      {laidOutSegmentsByDay[d.n].map((seg, idx) => {
                        const r = seg.routine;
                        const top = seg.renderTopPx;
                        const height = seg.renderHeightPx;
                        const style = KIND_STYLES[r.kind];
                        const kindLabel = KINDS.find(k => k.value === r.kind)?.label ?? r.kind;
                        const laneWidth = 100 / seg.laneCount;
                        return (
                          <button
                            key={`${r.id}-${d.n}-${idx}`}
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                            className={cn(
                              "absolute rounded-xl border px-1.5 py-1 text-[10px] leading-tight overflow-hidden shadow-sm text-left animate-scale-in",
                              "hover:shadow-md hover:-translate-y-[1px]",
                              style.chip,
                            )}
                            style={{
                              top,
                              height,
                              left: `calc(${seg.lane * laneWidth}% + 4px)`,
                              width: `calc(${laneWidth}% - 8px)`,
                              boxSizing: "border-box",
                              transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms, height 300ms ease, top 300ms ease",
                            }}
                          >
                            <div className="font-semibold truncate">{r.label || kindLabel}</div>
                            {height >= 40 && (
                              <div className="opacity-70 tabular-nums">
                                {minToTime(seg.startMin)}–{minToTime(seg.endMin)}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: single-day agenda column */}
            <div className="md:hidden">
              <div className="grid relative" style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}>
                {/* Colonna ore */}
                <div className="relative" style={{ height: GRID_HEIGHT }}>
                  {HOURS.map((h, i) => (
                    i === 0 ? null : (
                      <div
                        key={h}
                        className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums pr-1 text-right"
                        style={{ top: i * ROW_H - 6 }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    )
                  ))}
                </div>

                {/* Colonna giorno attivo */}
                <div className="relative border-l border-slate-100" style={{ height: GRID_HEIGHT }}>
                  {HOURS.map((h, i) => (
                    <button
                      key={h}
                      onClick={() => openCreate({ day: mobileDay, hour: h })}
                      className="absolute left-0 right-0 border-b border-slate-100/80 hover:bg-slate-50/70 transition-colors"
                      style={{ top: i * ROW_H, height: ROW_H }}
                      aria-label={`Aggiungi blocco ${dayName(mobileDay)} ${h}:00`}
                    />
                  ))}

                  {laidOutSegmentsByDay[mobileDay].map((seg, idx) => {
                    const r = seg.routine;
                    const top = seg.renderTopPx;
                    const height = seg.renderHeightPx;
                    const style = KIND_STYLES[r.kind];
                    const kindLabel = KINDS.find(k => k.value === r.kind)?.label ?? r.kind;
                    const laneWidth = 100 / seg.laneCount;
                    return (
                      <button
                        key={`m-${r.id}-${mobileDay}-${idx}`}
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        className={cn(
                          "absolute rounded-xl border px-2.5 py-1.5 text-xs leading-tight overflow-hidden shadow-sm text-left animate-scale-in",
                          "hover:shadow-md hover:-translate-y-[1px]",
                          style.chip,
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${seg.lane * laneWidth}% + 6px)`,
                          width: `calc(${laneWidth}% - 12px)`,
                          boxSizing: "border-box",
                          transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms, height 300ms ease, top 300ms ease",
                        }}
                      >
                        <div className="font-semibold truncate">{r.label || kindLabel}</div>
                        {height >= 40 && (
                          <div className="opacity-70 tabular-nums text-[11px]">
                            {minToTime(seg.startMin)}–{minToTime(seg.endMin)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {routines.isLoading && (
            <p className="body-small text-muted-foreground text-center">Caricamento…</p>
          )}
        </section>

        <div className="h-6" />
      </SheetContent>

      {/* Modale creazione / modifica routine */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="title-medium font-display">
              {editingId ? "Modifica blocco" : "Nuovo blocco"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="label-medium text-muted-foreground">Tipo</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {KINDS.map((k) => {
                  const active = rKind === k.value;
                  const st = KIND_STYLES[k.value];
                  return (
                    <button
                      key={k.value}
                      onClick={() => setRKind(k.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm border transition-all duration-300",
                        active
                          ? `${st.chip} shadow-sm scale-105`
                          : "bg-white text-foreground border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5 align-middle", st.dot)} />
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="label-medium text-muted-foreground">Nome attività (opzionale)</Label>
              <Input
                value={rLabel}
                onChange={(e) => setRLabel(e.target.value)}
                placeholder="Es. Scuola mattina"
                className="rounded-2xl h-11 mt-1.5 bg-white border border-slate-200/70"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-medium text-muted-foreground">Inizio</Label>
                <Input type="time" value={rStart} onChange={(e) => setRStart(e.target.value)}
                  className="rounded-2xl h-11 mt-1.5 bg-white border border-slate-200/70" />
              </div>
              <div>
                <Label className="label-medium text-muted-foreground">Fine</Label>
                <Input type="time" value={rEnd} onChange={(e) => setREnd(e.target.value)}
                  className="rounded-2xl h-11 mt-1.5 bg-white border border-slate-200/70" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Se la fine è prima dell'inizio (es. 22:00 → 06:00), il blocco attraversa la mezzanotte.
            </p>

            <div>
              <Label className="label-medium text-muted-foreground">Ripeti nei giorni</Label>
              <div className="flex gap-1.5 mt-1.5">
                {DAYS.map((d) => {
                  const active = rDays.includes(d.n);
                  return (
                    <button
                      key={d.n}
                      onClick={() => toggleDay(d.n)}
                      aria-pressed={active}
                      aria-label={d.label}
                      className={cn(
                        "flex-1 h-10 rounded-xl text-sm font-semibold border transition-all duration-300",
                        active
                          ? "bg-foreground text-background border-foreground scale-[1.03]"
                          : "bg-white text-muted-foreground border-slate-200 hover:bg-slate-50"
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
                className="w-full h-11 rounded-2xl bg-white border-red-200/80 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {delRoutine.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Elimina blocco
              </Button>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 h-11 rounded-2xl bg-white border-slate-200/70"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveRoutine}
                disabled={addRoutine.isPending || updateRoutine.isPending}
                className="flex-1 h-11 rounded-2xl"
              >
                {(addRoutine.isPending || updateRoutine.isPending)
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Save className="w-4 h-4 mr-2" />}
                {editingId ? "Aggiorna" : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
