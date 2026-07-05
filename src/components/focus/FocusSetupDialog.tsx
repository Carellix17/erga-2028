import { useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { format, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useStudyEventsQuery } from "@/hooks/useStudyEvents";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import type { FocusTask } from "@/contexts/FocusContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (task: FocusTask) => void;
}

export function FocusSetupDialog({ open, onOpenChange, onStart }: Props) {
  const eventsQuery = useStudyEventsQuery(open);
  const subjectsQuery = useUserSubjects();
  const [selection, setSelection] = useState<string>("");

  const todayEvents = useMemo(() => {
    const today = new Date();
    return (eventsQuery.data ?? []).filter((e) =>
      isSameDay(new Date(e.event_date), today),
    );
  }, [eventsQuery.data]);

  const subjects = subjectsQuery.data ?? [];

  const handleStart = () => {
    if (!selection) return;
    if (selection.startsWith("event:")) {
      const id = selection.slice("event:".length);
      const ev = todayEvents.find((e) => e.id === id);
      if (ev) onStart({ label: ev.title, subject: ev.subject, eventId: ev.id });
    } else if (selection.startsWith("subject:")) {
      const name = selection.slice("subject:".length);
      onStart({ label: name, subject: name });
    } else if (selection === "free") {
      onStart({ label: "Studio libero" });
    }
    setSelection("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Timer className="w-5 h-5 text-primary" />
            Cosa vuoi studiare?
          </DialogTitle>
          <DialogDescription>
            Scegli un compito di oggi o una materia libera per iniziare una sessione di focus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label className="text-sm font-medium">Attività</Label>
          <Select value={selection} onValueChange={setSelection}>
            <SelectTrigger className="rounded-2xl h-12">
              <SelectValue placeholder="Seleziona un compito o una materia" />
            </SelectTrigger>
            <SelectContent>
              {todayEvents.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Oggi
                  </div>
                  {todayEvents.map((ev) => (
                    <SelectItem key={ev.id} value={`event:${ev.id}`}>
                      {ev.title} · {ev.subject}
                    </SelectItem>
                  ))}
                </>
              )}
              {subjects.length > 0 && (
                <>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                    Materie
                  </div>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={`subject:${s.name}`}>
                      {s.name}
                    </SelectItem>
                  ))}
                </>
              )}
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">
                Altro
              </div>
              <SelectItem value="free">Studio libero</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl">
            Annulla
          </Button>
          <Button onClick={handleStart} disabled={!selection} className="rounded-2xl">
            Avvia sessione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// silence
void format;