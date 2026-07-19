import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import { resolveSubjectColor } from "@/lib/subjectColors";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import { cn } from "@/lib/utils";

type Category = "verifica" | "compito";
type VerificaMode = Exclude<EvaluationType, "compito">;

const VERIFICA_MODES: { value: VerificaMode; label: string }[] = [
  { value: "orale", label: "Orale" },
  { value: "scritta", label: "Scritta" },
  { value: "pratica", label: "Pratica" },
  { value: "interrogazione", label: "Presentazione" },
];

// Valore sentinella: Radix Select non accetta stringhe vuote come valore degli item
const NONE = "__none__";

// Le pillole dell'obiettivo di voto (il voto che lo studente vuole ottenere)
const GOAL_CHOICES = [6, 7, 8, 9, 10];

export interface EvalFormInput {
  type: EvaluationType;
  title: string;
  description?: string;
  date: string;
  subject_id: string | null;
  topic_type: "linked" | "free";
  topic_id?: string | null;
  free_topic_title?: string | null;
  /** Voto che lo studente vuole ottenere (opzionale, 6-10). */
  goal?: number | null;
}

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se presente, il foglio si apre in modalita' "Modifica" con i campi precompilati. */
  initial?: Evaluation | null;
  /** onSubmit(input, editingId): editingId e' null quando si crea un nuovo evento. */
  onSubmit: (input: EvalFormInput, editingId: string | null) => Promise<void> | void;
}

export function AddEventSheet({ open, onOpenChange, initial, onSubmit }: AddEventSheetProps) {
  const editingId = initial?.id ?? null;

  const [category, setCategory] = useState<Category>("verifica");
  const [mode, setMode] = useState<VerificaMode>("scritta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [subjectId, setSubjectId] = useState<string>(NONE);
  const [topicMode, setTopicMode] = useState<"linked" | "free">("free");
  const [courseId, setCourseId] = useState<string>("");
  const [freeTopic, setFreeTopic] = useState("");
  const [goal, setGoal] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: subjects = [] } = useUserSubjects();
  const { data: courses = [] } = useFileContextsQuery();

  // Precompila i campi quando si apre in modalita' modifica (o reset per il nuovo)
  useEffect(() => {
    if (!open) return;
    if (initial) {
      const isCompito = initial.type === "compito";
      setCategory(isCompito ? "compito" : "verifica");
      setMode(isCompito ? "scritta" : (initial.type as VerificaMode));
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setDate(initial.date ? initial.date.slice(0, 10) : "");
      setSubjectId(initial.subject_id ?? NONE);
      setTopicMode(initial.topic_type);
      setCourseId(initial.topic_type === "linked" ? (initial.topic_id ?? "") : "");
      setFreeTopic(initial.free_topic_title ?? "");
      setGoal(initial.goal ?? null);
    } else {
      setCategory("verifica"); setMode("scritta"); setTitle(""); setDescription("");
      setDate(""); setSubjectId(NONE); setTopicMode("free"); setCourseId(""); setFreeTopic("");
      setGoal(null);
    }
  }, [open, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    const resolvedType: EvaluationType = category === "compito" ? "compito" : mode;
    setSubmitting(true);
    try {
      await onSubmit({
        type: resolvedType,
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date + "T12:00:00").toISOString(),
        subject_id: subjectId === NONE ? null : subjectId,
        topic_type: topicMode,
        topic_id: topicMode === "linked" ? (courseId || null) : null,
        free_topic_title: topicMode === "free" ? (freeTopic.trim() || null) : null,
        goal,
      }, editingId);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe bg-[#FCFCFC] max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="title-large font-display">
            {editingId ? "Modifica evento" : "Aggiungi evento"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Macro category */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-surface-container">
            {(["verifica", "compito"] as Category[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "h-10 rounded-full text-sm font-medium transition-all capitalize",
                  category === c ? "bg-black text-white shadow-level-1" : "text-slate-700"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {category === "verifica" && (
            <div className="space-y-2">
              <Label className="label-large">Modalità</Label>
              <div className="flex flex-wrap gap-2">
                {VERIFICA_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "px-3 h-9 rounded-full border text-sm transition-all",
                      mode === m.value
                        ? "bg-black text-white border-black"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ev-title" className="label-large">Titolo</Label>
            <Input id="ev-title" placeholder="Es. Verifica sui Promessi Sposi" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc" className="label-large">Note (opzionale)</Label>
            <Textarea id="ev-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dettagli, capitoli, appunti…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev-date" className="label-large">Data</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="label-large">Materia</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium">
                  <SelectValue placeholder="— Nessuna —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Nessuna —</SelectItem>
                  {subjects.map((s) => {
                    const col = resolveSubjectColor(s.name, s.color);
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", col.solid)} />
                          {s.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="label-large">Obiettivo di voto <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
            <div className="flex gap-2">
              {GOAL_CHOICES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(goal === g ? null : g)}
                  aria-pressed={goal === g}
                  className={cn(
                    "flex-1 h-10 rounded-full border text-sm font-semibold transition-all",
                    goal === g
                      ? "bg-black text-white border-black"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="label-large">Argomento</Label>
            <div className="flex gap-2">
              {(["linked", "free"] as const).map((tm) => (
                <button
                  key={tm}
                  type="button"
                  onClick={() => setTopicMode(tm)}
                  className={cn(
                    "flex-1 h-9 rounded-full border text-sm transition-all",
                    topicMode === tm ? "bg-black text-white border-black" : "bg-white border-slate-200 text-slate-700"
                  )}
                >
                  {tm === "linked" ? "Da corso" : "Libero"}
                </button>
              ))}
            </div>
            {topicMode === "linked" ? (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium">
                  <SelectValue placeholder="Seleziona un corso…" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.file_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Scrivi l'argomento (es. Capitolo 5 - Derivate)"
                value={freeTopic}
                onChange={(e) => setFreeTopic(e.target.value)}
              />
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !title || !date}>
            {submitting ? "Salvataggio…" : editingId ? "Salva modifiche" : "Salva evento"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
