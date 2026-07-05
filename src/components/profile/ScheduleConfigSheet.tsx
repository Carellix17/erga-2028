import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, BookOpen, CalendarClock, Loader2 } from "lucide-react";
import {
  useUserSubjects, useAddUserSubject, useDeleteUserSubject,
} from "@/hooks/useUserSubjects";
import {
  useUserRoutines, useAddUserRoutine, useDeleteUserRoutine, type RoutineKind, type UserRoutine,
} from "@/hooks/useUserRoutines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const KINDS: { value: RoutineKind; label: string }[] = [
  { value: "school", label: "Scuola" },
  { value: "sleep", label: "Sonno" },
  { value: "meal",   label: "Pasti" },
  { value: "other",  label: "Altro" },
];

// Minimal palette (soft, editorial)
const KIND_STYLES: Record<RoutineKind, { bg: string; border: string; text: string; dot: string }> = {
  school: { bg: "bg-blue-50",    border: "border-blue-200/80",    text: "text-blue-900",    dot: "bg-blue-400" },
  sleep:  { bg: "bg-indigo-50",  border: "border-indigo-200/80",  text: "text-indigo-900",  dot: "bg-indigo-400" },
  meal:   { bg: "bg-amber-50",   border: "border-amber-200/80",   text: "text-amber-900",   dot: "bg-amber-400" },
  other:  { bg: "bg-slate-100",  border: "border-slate-200/80",   text: "text-slate-900",   dot: "bg-slate-400" },
};

// 1 = Monday ... 7 = Sunday (matches existing default ARRAY[1..5])
const DAYS: { n: number; short: string; label: string }[] = [
  { n: 1, short: "L", label: "Lunedì" },
  { n: 2, short: "M", label: "Martedì" },
  { n: 3, short: "M", label: "Mercoledì" },
  { n: 4, short: "G", label: "Giovedì" },
  { n: 5, short: "V", label: "Venerdì" },
  { n: 6, short: "S", label: "Sabato" },
  { n: 7, short: "D", label: "Domenica" },
];

const HOUR_START = 6;
const HOUR_END = 24;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const ROW_H = 44; // px per hour

// "HH:MM(:SS)" -> minutes from 00:00
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmt = (t: string) => t.slice(0, 5);

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export function ScheduleConfigSheet({ open, onOpenChange }: Props) {
  const { toast } = useToast();

  // Subjects
  const subjects = useUserSubjects();
  const addSubject = useAddUserSubject();
  const delSubject = useDeleteUserSubject();
  const [newSubject, setNewSubject] = useState("");

  // Routines
  const routines = useUserRoutines();
  const addRoutine = useAddUserRoutine();
  const delRoutine = useDeleteUserRoutine();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [rKind, setRKind] = useState<RoutineKind>("school");
  const [rLabel, setRLabel] = useState("");
  const [rStart, setRStart] = useState("08:00");
  const [rEnd, setREnd] = useState("13:00");
  const [rDays, setRDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const openNewRoutine = (prefill?: { day?: number; hour?: number }) => {
    setRKind("school");
    setRLabel("");
    const startHour = prefill?.hour ?? 8;
    setRStart(`${String(startHour).padStart(2, "0")}:00`);
    setREnd(`${String(Math.min(startHour + 1, HOUR_END)).padStart(2, "0")}:00`);
    setRDays(prefill?.day ? [prefill.day] : [1, 2, 3, 4, 5]);
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
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile aggiungere", variant: "destructive" });
    }
  };

  const handleSaveRoutine = async () => {
    if (toMin(rEnd) <= toMin(rStart)) {
      toast({ title: "Orario non valido", description: "La fine deve essere dopo l'inizio.", variant: "destructive" });
      return;
    }
    if (rDays.length === 0) {
      toast({ title: "Seleziona almeno un giorno", variant: "destructive" });
      return;
    }
    try {
      await addRoutine.mutateAsync({
        kind: rKind,
        label: rLabel.trim() || null,
        start_time: rStart,
        end_time: rEnd,
        days_of_week: rDays,
      });
      setModalOpen(false);
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile salvare", variant: "destructive" });
    }
  };

  // Group routines by day for grid rendering
  const byDay = useMemo(() => {
    const map: Record<number, UserRoutine[]> = {};
    for (const d of DAYS) map[d.n] = [];
    for (const r of routines.data ?? []) {
      for (const d of r.days_of_week ?? []) if (map[d]) map[d].push(r);
    }
    return map;
  }, [routines.data]);

  const gridHeight = HOURS.length * ROW_H;
  const minutesFromStart = (t: string) => toMin(t) - HOUR_START * 60;
  const pxFromMin = (m: number) => (m / 60) * ROW_H;

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
            {subjects.data?.length ? subjects.data.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200/70 pl-3 pr-1 py-1 text-sm animate-scale-in"
              >
                {s.name}
                <button
                  onClick={() => delSubject.mutate(s.id)}
                  className="rounded-full p-1 hover:bg-slate-100 transition"
                  aria-label={`Rimuovi ${s.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </span>
            )) : (
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
              onClick={() => openNewRoutine()}
              size="sm"
              className="h-9 rounded-full px-3"
            >
              <Plus className="w-4 h-4 mr-1" /> Aggiungi blocco
            </Button>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200/70 overflow-hidden">
            {/* Header giorni */}
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
            <div className="overflow-x-auto">
              <div
                className="grid relative"
                style={{
                  gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))",
                  minWidth: 560,
                }}
              >
                {/* Colonna ore */}
                <div className="relative" style={{ height: gridHeight }}>
                  {HOURS.slice(0, -1).map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums pr-1 text-right"
                      style={{ top: i * ROW_H - 6 }}
                    >
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>

                {/* Colonne giorni */}
                {DAYS.map((d) => (
                  <div
                    key={d.n}
                    className="relative border-l border-slate-100"
                    style={{ height: gridHeight }}
                  >
                    {/* Righe orarie cliccabili */}
                    {HOURS.slice(0, -1).map((h, i) => (
                      <button
                        key={h}
                        onClick={() => openNewRoutine({ day: d.n, hour: h })}
                        className="absolute left-0 right-0 border-b border-slate-100/80 hover:bg-slate-50/70 transition-colors"
                        style={{ top: i * ROW_H, height: ROW_H }}
                        aria-label={`Aggiungi blocco ${d.label} ${h}:00`}
                      />
                    ))}

                    {/* Blocchi routine */}
                    {byDay[d.n].map((r) => {
                      const top = pxFromMin(minutesFromStart(r.start_time));
                      const height = Math.max(24, pxFromMin(toMin(r.end_time) - toMin(r.start_time)));
                      const style = KIND_STYLES[r.kind];
                      const kindLabel = KINDS.find(k => k.value === r.kind)?.label ?? r.kind;
                      return (
                        <div
                          key={`${r.id}-${d.n}`}
                          className={cn(
                            "absolute left-1 right-1 rounded-xl border px-1.5 py-1 text-[10px] leading-tight overflow-hidden shadow-sm animate-scale-in group",
                            style.bg, style.border, style.text,
                          )}
                          style={{
                            top: top + 1,
                            height: height - 2,
                            transition: "transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 200ms",
                          }}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{r.label || kindLabel}</div>
                              <div className="opacity-70 tabular-nums">{fmt(r.start_time)}–{fmt(r.end_time)}</div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); delRoutine.mutate(r.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-0.5 hover:bg-white/60"
                              aria-label="Rimuovi routine"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {routines.isLoading && (
            <p className="body-small text-muted-foreground text-center">Caricamento…</p>
          )}
        </section>

        <div className="h-6" />
      </SheetContent>

      {/* Modale creazione routine */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="rounded-3xl bg-[#FCFCFC] border border-slate-200/70 max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="title-medium font-display">Nuovo blocco</DialogTitle>
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
                          ? `${st.bg} ${st.border} ${st.text} shadow-sm scale-105`
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
              <Label className="label-medium text-muted-foreground">Nome routine (opzionale)</Label>
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

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 h-11 rounded-2xl bg-white border-slate-200/70"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveRoutine}
                disabled={addRoutine.isPending}
                className="flex-1 h-11 rounded-2xl"
              >
                {addRoutine.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Salva
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
