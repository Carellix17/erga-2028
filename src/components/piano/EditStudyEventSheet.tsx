import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { UpdateStudyEventInput } from "@/hooks/useStudyEvents";
import { useUserSubjects } from "@/hooks/useUserSubjects";

const OTHER_SUBJECT_VALUE = "__piano_other_subject__";
const SUBJECT_OPTION_PREFIX = "subject:";
const SAVED_SUBJECT_OPTION_PREFIX = "saved:";

function normalizeTime(value?: string | null): string {
  const match = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.exec(value ?? "");
  return match ? `${match[1]}:${match[0].slice(3, 5)}` : "";
}

interface EditStudyEventSheetProps {
  event: StudyEvent | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateStudyEventInput) => Promise<void> | void;
}

export function EditStudyEventSheet({ event, onOpenChange, onSave }: EditStudyEventSheetProps) {
  const { t } = useTranslation();
  const { data: userSubjects = [] } = useUserSubjects();
  const [subject, setSubject] = useState("");
  const [otherSubjectSelected, setOtherSubjectSelected] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<StudyEvent["event_type"]>("study");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!event) return;
    setSubject(event.subject);
    setOtherSubjectSelected(false);
    setTitle(event.title);
    setDate(event.event_date ? event.event_date.slice(0, 10) : "");
    setTime(normalizeTime(event.event_time));
    setEndTime(event.end_time ?? "");
    setNotes(event.notes ?? "");
    setType(event.event_type);
  }, [event]);

  const registeredSubject = userSubjects.find((item) => item.name === subject);
  const selectedSubjectValue = otherSubjectSelected
    ? OTHER_SUBJECT_VALUE
    : registeredSubject
      ? `${SUBJECT_OPTION_PREFIX}${registeredSubject.id}`
      : subject
        ? `${SAVED_SUBJECT_OPTION_PREFIX}${subject}`
        : "";
  const needsSavedSubjectOption = !!subject && !otherSubjectSelected && !registeredSubject;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !title.trim() || !date) return;
    setSubmitting(true);
    try {
      await onSave({
        id: event.id,
        subject: otherSubjectSelected ? "Altro" : subject.trim() || event.subject,
        title: title.trim(),
        date,
        time: normalizeTime(time) || null,
        type,
        ...(endTime.trim() ? { endTime: endTime.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={!!event} onOpenChange={onOpenChange}>
      {/* 🎨 P9a — sfondo avorio e angoli ora li mette il foglio stesso */}
      <SheetContent side="bottom" className="pb-safe max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="title-large font-display">{t("piano.sheet.editTitle")}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🧹 P8 — niente piu' selettore "tipo" (Studio/Verifica/Compito):
              gli eventi di studio restano di studio; verifiche e compiti
              vivono nel cassetto ricco (evaluations) e si modificano da li'.
              Qui dentro le pillole erano un relitto che non cambiava nulla
              (segnalato dal capocantiere). Il type resta quello originale. */}
          <div className="space-y-2">
            <Label htmlFor="se-title" className="label-large">{t("piano.sheet.title")}</Label>
            <Input id="se-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label id="se-subject-label" htmlFor="se-subject" className="label-large">{t("piano.sheet.subject")}</Label>
            <Select
              value={selectedSubjectValue}
              onValueChange={(value) => {
                if (value === OTHER_SUBJECT_VALUE) {
                  setOtherSubjectSelected(true);
                  setSubject("Altro");
                  return;
                }
                setOtherSubjectSelected(false);
                if (value.startsWith(SUBJECT_OPTION_PREFIX)) {
                  const selected = userSubjects.find((item) => `${SUBJECT_OPTION_PREFIX}${item.id}` === value);
                  if (selected) setSubject(selected.name);
                } else if (value.startsWith(SAVED_SUBJECT_OPTION_PREFIX)) {
                  setSubject(value.slice(SAVED_SUBJECT_OPTION_PREFIX.length));
                }
              }}
            >
              <SelectTrigger
                id="se-subject"
                aria-labelledby="se-subject-label"
                className="w-full h-11 rounded-control border border-input bg-sheet px-4 py-2.5 text-base text-foreground"
              >
                <SelectValue placeholder={t("piano.sheet.subjectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {userSubjects.map((item) => (
                  <SelectItem key={item.id} value={`${SUBJECT_OPTION_PREFIX}${item.id}`}>
                    {item.name}
                  </SelectItem>
                ))}
                {needsSavedSubjectOption && (
                  <SelectItem value={`${SAVED_SUBJECT_OPTION_PREFIX}${subject}`}>{subject}</SelectItem>
                )}
                <SelectItem value={OTHER_SUBJECT_VALUE}>{t("piano.sheet.altro")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="se-date" className="label-large">{t("piano.sheet.date")}</Label>
              <Input id="se-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="se-time" className="label-large">{t("piano.sheet.time")} {t("piano.sheet.optional")}</Label>
              <Input id="se-time" type="time" value={time} onChange={(e) => setTime(normalizeTime(e.target.value))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="se-end-time" className="label-large">{t("piano.sheet.endTime")} {t("piano.sheet.optional")}</Label>
            <Input id="se-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="se-notes" className="label-large">{t("piano.sheet.notes")}</Label>
            <Textarea id="se-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("piano.sheet.notesPlaceholder")} />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !title.trim() || !date}>
            {submitting ? t("piano.sheet.saving") : t("piano.sheet.saveChanges")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
