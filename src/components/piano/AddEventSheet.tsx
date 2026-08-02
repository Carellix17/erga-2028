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
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import { PillToggle } from "@/components/ui/pill-toggle";
import { resolveSubjectColor } from "@/lib/subjectColors";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import { cn } from "@/lib/utils";

type Category = "verifica" | "compito";
type VerificaMode = Exclude<EvaluationType, "compito">;

const VERIFICA_MODES: { value: VerificaMode; i18nKey: string }[] = [
  { value: "orale", i18nKey: "modeOrale" },
  { value: "scritta", i18nKey: "modeScritta" },
  { value: "pratica", i18nKey: "modePratica" },
  { value: "interrogazione", i18nKey: "modePresentazione" },
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
  const { t } = useTranslation();
  const editingId = initial?.id ?? null;

  const [category, setCategory] = useState<Category>("verifica");
  const [mode, setMode] = useState<VerificaMode>("scritta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
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
      if (initial.date) {
        const d = new Date(initial.date);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        // Se l'orario e' 12:00 (default legacy) mostralo vuoto per non forzare un valore
        setTime(hh === "12" && mm === "00" ? "" : `${hh}:${mm}`);
      } else {
        setTime("");
      }
      setSubjectId(initial.subject_id ?? NONE);
      setTopicMode(initial.topic_type);
      setCourseId(initial.topic_type === "linked" ? (initial.topic_id ?? "") : "");
      setFreeTopic(initial.free_topic_title ?? "");
      setGoal(initial.goal ?? null);
    } else {
      setCategory("verifica"); setMode("scritta"); setTitle(""); setDescription("");
      setDate(""); setTime(""); setSubjectId(NONE); setTopicMode("free"); setCourseId(""); setFreeTopic("");
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
        date: new Date(`${date}T${time ? `${time}:00` : "12:00:00"}`).toISOString(),
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
      {/* 🎨 P9a — sfondo avorio e angoli ora li mette il foglio stesso */}
      <SheetContent side="bottom" className="pb-safe max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="title-large font-display">
            {editingId ? t("piano.sheet.editTitle") : t("piano.sheet.addTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🎛️ P9a — le scelte a pillola ora usano l'interruttore di casa */}
          <PillToggle<Category>
            aria-label={t("piano.sheet.type")}
            options={(["verifica", "compito"] as Category[]).map((c) => ({ value: c, label: t(`piano.sheet.${c}`) }))}
            value={category}
            onChange={setCategory}
            variant="track"
          />

          {category === "verifica" && (
            <div className="space-y-2">
              <Label className="label-large">{t("piano.sheet.mode")}</Label>
              <PillToggle<VerificaMode>
                aria-label={t("piano.sheet.mode")}
                options={VERIFICA_MODES.map((m) => ({ value: m.value, label: t(`piano.sheet.${m.i18nKey}`) }))}
                value={mode}
                onChange={setMode}
                size="sm"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ev-title" className="label-large">{t("piano.sheet.title")}</Label>
            <Input id="ev-title" placeholder={t("piano.sheet.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-desc" className="label-large">{t("piano.sheet.notes")}</Label>
            <Textarea id="ev-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("piano.sheet.notesPlaceholder")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev-date" className="label-large">{t("piano.sheet.date")}</Label>
              <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-time" className="label-large">
                {t("piano.sheet.time")} <span className="text-muted-foreground font-normal">{t("piano.sheet.optional")}</span>
              </Label>
              <Input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="label-large">{t("piano.sheet.subject")}</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium">
                  <SelectValue placeholder={t("piano.sheet.none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("piano.sheet.none")}</SelectItem>
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
              {subjects.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {t("piano.sheet.noSubjectsHint")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="label-large">{t("piano.sheet.goalLabel")} <span className="text-muted-foreground font-normal">{t("piano.sheet.optional")}</span></Label>
            <PillToggle<number>
              aria-label={t("piano.sheet.goalLabel")}
              options={GOAL_CHOICES.map((g) => ({ value: g, label: String(g) }))}
              value={goal ?? 0}
              onChange={(g) => setGoal(goal === g ? null : g)}
              grow
            />
          </div>

          <div className="space-y-2">
            <Label className="label-large">{t("piano.sheet.topic")}</Label>
            <PillToggle<"linked" | "free">
              aria-label={t("piano.sheet.topic")}
              options={[
                { value: "linked", label: t("piano.sheet.topicLinked") },
                { value: "free", label: t("piano.sheet.topicFree") },
              ]}
              value={topicMode}
              onChange={setTopicMode}
              size="sm"
              grow
            />
            {topicMode === "linked" ? (
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-full h-11 rounded-2xl bg-white border border-slate-200/70 px-3 body-medium">
                  <SelectValue placeholder={t("piano.sheet.coursePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.file_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={t("piano.sheet.topicPlaceholder")}
                value={freeTopic}
                onChange={(e) => setFreeTopic(e.target.value)}
              />
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !title || !date}>
            {submitting ? t("piano.sheet.saving") : editingId ? t("piano.sheet.saveChanges") : t("piano.sheet.saveEvent")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
