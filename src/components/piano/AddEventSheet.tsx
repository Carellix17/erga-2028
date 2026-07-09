import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import type { EvaluationType } from "@/hooks/useEvaluations";

type Category = "verifica" | "compito";

const VERIFICA_MODES: { value: Exclude<EvaluationType, "compito">; label: string }[] = [
  { value: "orale", label: "Orale" },
  { value: "scritta", label: "Scritta" },
  { value: "pratica", label: "Pratica" },
  { value: "interrogazione", label: "Interrogazione" },
];

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: {
    type: EvaluationType;
    title: string;
    description?: string;
    date: string;
    subject_id: string | null;
    topic_type: "linked" | "free";
    topic_id?: string | null;
    free_topic_title?: string | null;
  }) => Promise<void> | void;
}

export function AddEventSheet({ open, onOpenChange, onAdd }: AddEventSheetProps) {
  const [category, setCategory] = useState<Category>("verifica");
  const [mode, setMode] = useState<Exclude<EvaluationType, "compito">>("scritta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicMode, setTopicMode] = useState<"linked" | "free">("free");
  const [courseId, setCourseId] = useState<string>("");
  const [freeTopic, setFreeTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: subjects = [] } = useUserSubjects();
  const { data: courses = [] } = useFileContextsQuery();

  const reset = () => {
    setCategory("verifica"); setMode("scritta"); setTitle(""); setDescription("");
    setDate(""); setSubjectId(""); setTopicMode("free"); setCourseId(""); setFreeTopic("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    const resolvedType: EvaluationType = category === "compito" ? "compito" : mode;
    setSubmitting(true);
    try {
      await onAdd({
        type: resolvedType,
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        subject_id: subjectId || null,
        topic_type: topicMode,
        topic_id: topicMode === "linked" ? (courseId || null) : null,
        free_topic_title: topicMode === "free" ? (freeTopic.trim() || null) : null,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe bg-[#FCFCFC] max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="title-large font-display">Aggiungi evento</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Macro category */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-surface-container">
            <button
              type="button"
              onClick={() => setCategory("verifica")}
              className={`h-10 rounded-full text-sm font-medium transition-all ${
                category === "verifica" ? "bg-black text-white shadow-level-1" : "text-slate-700"
              }`}
            >
              Verifica / Interrogazione
            </button>
            <button
              type="button"
              onClick={() => setCategory("compito")}
              className={`h-10 rounded-full text-sm font-medium transition-all ${
                category === "compito" ? "bg-black text-white shadow-level-1" : "text-slate-700"
              }`}
            >
              Compito
            </button>
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
                    className={`px-3 h-9 rounded-full border text-sm transition-all ${
                      mode === m.value
                        ? "bg-black text-white border-black"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
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
              <Label htmlFor="ev-subject" className="label-large">Materia</Label>
              <select
                id="ev-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium outline-none"
              >
                <option value="">— Nessuna —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="label-large">Argomento</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTopicMode("linked")}
                className={`flex-1 h-9 rounded-full border text-sm ${
                  topicMode === "linked" ? "bg-black text-white border-black" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                Da corso
              </button>
              <button
                type="button"
                onClick={() => setTopicMode("free")}
                className={`flex-1 h-9 rounded-full border text-sm ${
                  topicMode === "free" ? "bg-black text-white border-black" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                Libero
              </button>
            </div>
            {topicMode === "linked" ? (
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium outline-none"
              >
                <option value="">Seleziona un corso…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.file_name}</option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="Scrivi l'argomento (es. Capitolo 5 - Derivate)"
                value={freeTopic}
                onChange={(e) => setFreeTopic(e.target.value)}
              />
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !title || !date}>
            {submitting ? "Salvataggio…" : "Salva evento"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
