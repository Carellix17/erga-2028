import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UpdateStudyEventInput } from "@/hooks/useStudyEvents";
import { cn } from "@/lib/utils";

interface EditStudyEventSheetProps {
  event: StudyEvent | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateStudyEventInput) => Promise<void> | void;
}

const TYPES = [
  { value: "study", label: "Studio" },
  { value: "test", label: "Verifica" },
  { value: "assignment", label: "Compito" },
] as const;

export function EditStudyEventSheet({ event, onOpenChange, onSave }: EditStudyEventSheetProps) {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<StudyEvent["event_type"]>("study");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!event) return;
    setSubject(event.subject);
    setTitle(event.title);
    setDate(event.event_date ? event.event_date.slice(0, 10) : "");
    setTime(event.event_time ?? "");
    setType(event.event_type);
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !title.trim() || !date) return;
    setSubmitting(true);
    try {
      await onSave({
        id: event.id,
        subject: subject.trim() || event.subject,
        title: title.trim(),
        date,
        time: time || null,
        type,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={!!event} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe bg-[#FCFCFC] max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="title-large font-display">Modifica sessione</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label className="label-large">Tipo</Label>
            <div className="grid grid-cols-3 gap-2 p-1 rounded-full bg-surface-container">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "h-10 rounded-full text-sm font-medium transition-all",
                    type === t.value ? "bg-black text-white shadow-level-1" : "text-slate-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="se-title" className="label-large">Titolo</Label>
            <Input id="se-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="se-subject" className="label-large">Materia</Label>
            <Input id="se-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Es. Matematica" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="se-date" className="label-large">Data</Label>
              <Input id="se-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-time" className="label-large">Ora (opzionale)</Label>
              <Select value={time || "__none__"} onValueChange={(v) => setTime(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__none__">— Nessuna —</SelectItem>
                  {Array.from({ length: 33 }, (_, i) => {
                    const h = 6 + Math.floor(i / 2);
                    const m = i % 2 === 0 ? "00" : "30";
                    const v = `${String(h).padStart(2, "0")}:${m}`;
                    return <SelectItem key={v} value={v}>{v}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !title.trim() || !date}>
            {submitting ? "Salvataggio…" : "Salva modifiche"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
