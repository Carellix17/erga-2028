import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, BookOpen, Clock, Loader2 } from "lucide-react";
import {
  useUserSubjects, useAddUserSubject, useDeleteUserSubject,
} from "@/hooks/useUserSubjects";
import {
  useUserRoutines, useAddUserRoutine, useDeleteUserRoutine, type RoutineKind,
} from "@/hooks/useUserRoutines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const KINDS: { value: RoutineKind; label: string }[] = [
  { value: "school", label: "Scuola" },
  { value: "sleep", label: "Sonno" },
  { value: "meal", label: "Pasti" },
  { value: "other", label: "Altro" },
];

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export function ScheduleConfigSheet({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const subjects = useUserSubjects();
  const addSubject = useAddUserSubject();
  const delSubject = useDeleteUserSubject();
  const routines = useUserRoutines();
  const addRoutine = useAddUserRoutine();
  const delRoutine = useDeleteUserRoutine();

  const [newSubject, setNewSubject] = useState("");
  const [rKind, setRKind] = useState<RoutineKind>("school");
  const [rLabel, setRLabel] = useState("");
  const [rStart, setRStart] = useState("08:00");
  const [rEnd, setREnd] = useState("13:00");

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

  const handleAddRoutine = async () => {
    if (!rStart || !rEnd) return;
    try {
      await addRoutine.mutateAsync({
        kind: rKind,
        label: rLabel.trim() || null,
        start_time: rStart,
        end_time: rEnd,
        days_of_week: [1, 2, 3, 4, 5],
      });
      setRLabel("");
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message ?? "Impossibile aggiungere", variant: "destructive" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2rem] pb-safe bg-[#FCFCFC] max-h-[92vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="title-large font-display">Orari e Materie</SheetTitle>
        </SheetHeader>

        {/* Materie */}
        <section className="space-y-3 mb-8">
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
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200/70 pl-3 pr-1 py-1 text-sm"
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

        {/* Routine */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="title-medium font-display">Routine giornaliera</h3>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200/70 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  onClick={() => setRKind(k.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition",
                    rKind === k.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-white text-foreground border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div>
              <Label className="label-medium text-muted-foreground">Etichetta (opzionale)</Label>
              <Input
                value={rLabel}
                onChange={(e) => setRLabel(e.target.value)}
                placeholder="Es. Scuola mattina"
                className="rounded-2xl h-11 mt-1 bg-white border border-slate-200/70"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="label-medium text-muted-foreground">Inizio</Label>
                <Input type="time" value={rStart} onChange={(e) => setRStart(e.target.value)}
                  className="rounded-2xl h-11 mt-1 bg-white border border-slate-200/70" />
              </div>
              <div>
                <Label className="label-medium text-muted-foreground">Fine</Label>
                <Input type="time" value={rEnd} onChange={(e) => setREnd(e.target.value)}
                  className="rounded-2xl h-11 mt-1 bg-white border border-slate-200/70" />
              </div>
            </div>
            <Button
              onClick={handleAddRoutine}
              disabled={addRoutine.isPending}
              className="w-full h-11 rounded-2xl"
            >
              {addRoutine.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Aggiungi blocco
            </Button>
          </div>

          <div className="space-y-2">
            {routines.data?.length ? routines.data.map((r) => {
              const kind = KINDS.find(k => k.value === r.kind)?.label ?? r.kind;
              return (
                <div key={r.id}
                  className="flex items-center justify-between rounded-2xl bg-white border border-slate-200/70 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {r.label || kind}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {kind} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                    </div>
                  </div>
                  <button
                    onClick={() => delRoutine.mutate(r.id)}
                    className="rounded-full p-2 hover:bg-slate-100 transition"
                    aria-label="Rimuovi routine"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              );
            }) : (
              <p className="body-small text-muted-foreground">Nessuna routine configurata.</p>
            )}
          </div>
        </section>

        <div className="h-6" />
      </SheetContent>
    </Sheet>
  );
}
