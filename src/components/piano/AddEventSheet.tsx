import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import { useIsMobile } from "@/hooks/use-mobile";
import { PillToggle } from "@/components/ui/pill-toggle";
import { addOneHour } from "@/lib/plannerEntries";
import { resolveSubjectColor } from "@/lib/subjectColors";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import { cn } from "@/lib/utils";

/**
 * 🎨 P46 — "Aggiungi evento" con TRE tab: Verifica, Compito, Altro.
 * Lo stato dei campi è unico e sopravvive al cambio tab (niente perdite).
 * "Altro" = impegno non scolastico che blocca lo studio: viene salvato come
 * evento di tipo "assignment" con materia "Altro" (compatibile con le
 * colonne study_events esistenti, nessuna migrazione richiesta).
 */

type Category = "verifica" | "compito" | "altro";
type VerificaMode = Exclude<EvaluationType, "compito">;

/** Ordine delle modalità di verifica mostrate nella tendina della barra Titolo. */
const VERIFICA_MODES: VerificaMode[] = ["orale", "scritta", "pratica", "interrogazione"];
/** Chiave i18n dell'etichetta per ogni modalità (pill e voci di tendina). */
const VERIFICA_MODE_LABEL: Record<VerificaMode, string> = {
  orale: "piano.sheet.modeOrale",
  scritta: "piano.sheet.modeScritta",
  pratica: "piano.sheet.modePratica",
  interrogazione: "piano.sheet.modePresentazione",
};

const NONE = "__none__";
type FormField = "title" | "date" | "description" | "endTime";
type FormFieldErrors = Partial<Record<FormField, string>>;

function extractEndTimeFromDescription(description: string, untilLabel: string) {
  const markers = Array.from(new Set([untilLabel.trim(), "fino alle", "until"]))
    .filter(Boolean)
    .join("|");
  const pattern = new RegExp(
    String.raw`(?:\s*·\s*)?(?:${markers})\s+((?:[01]\d|2[0-3]):[0-5]\d)\s*$`,
    "i",
  );
  const match = pattern.exec(description);
  if (!match || match.index === undefined) return { description, endTime: "" };
  return { description: description.slice(0, match.index).trim(), endTime: match[1] };
}

export interface EvalFormInput {
  type: EvaluationType;
  title: string;
  description?: string;
  date: string;
  subject_id: string | null;
  topic_type: "linked" | "free";
  topic_id?: string | null;
  free_topic_title?: string | null;
  goal?: number | null;
  /** P46: "altro" = impegno extra-scolastico (salvato come study_event). */
  category?: Category;
  /** "HH:MM" di inizio/fine; per Altro l'ora di fine si salva come campo separato. */
  startTime?: string | null;
  endTime?: string | null;
}

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Evaluation | null;
  /**
   * 📔 P49 — il foglio si può aprire già "puntato": la vista Diario lo apre
   * sulla scheda Compito (o Verifica) e con il giorno che si sta guardando,
   * così aggiungere non costa mai un campo in più del necessario.
   */
  presetCategory?: Category;
  /** "yyyy-MM-dd" del giorno scelto nel Diario. */
  presetDate?: string;
  onSubmit: (input: EvalFormInput, editingId: string | null) => Promise<void> | void;
}

export function AddEventSheet({
  open,
  onOpenChange,
  initial,
  presetCategory,
  presetDate,
  onSubmit,
}: AddEventSheetProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const editingId = initial?.id ?? null;
  const formId = useId();
  const ids = {
    title: `${formId}-title`,
    modeButton: `${formId}-mode-button`,
    subjectLabel: `${formId}-subject-label`,
    subject: `${formId}-subject`,
    date: `${formId}-date`,
    startTime: `${formId}-start-time`,
    endTime: `${formId}-end-time`,
    endTimeError: `${formId}-end-time-error`,
    endTimeDefaultHint: `${formId}-end-time-default-hint`,
    titleError: `${formId}-title-error`,
    dateError: `${formId}-date-error`,
    descriptionError: `${formId}-description-error`,
    topicLabel: `${formId}-topic-label`,
    course: `${formId}-course`,
    freeTopic: `${formId}-free-topic`,
    notesLabel: `${formId}-notes-label`,
    notes: `${formId}-notes`,
    goalLabel: `${formId}-goal-label`,
    goalSlider: `${formId}-goal-slider`,
    goalThumb: `${formId}-goal-thumb`,
    compito: `${formId}-compito`,
    altroTitle: `${formId}-altro-title`,
    altroNotes: `${formId}-altro-notes`,
  };

  const [category, setCategory] = useState<Category>("verifica");
  const [mode, setMode] = useState<VerificaMode>("scritta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endTouched, setEndTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [subjectId, setSubjectId] = useState<string>(NONE);
  const [topicMode, setTopicMode] = useState<"linked" | "free">("free");
  const [courseId, setCourseId] = useState<string>("");
  const [freeTopic, setFreeTopic] = useState("");
  const [goal, setGoal] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Errore dell'intervallo orario, mostrato sotto il campo Ora fine. */
  const [endError, setEndError] = useState<string | null>(null);

  const { data: subjects = [] } = useUserSubjects();
  const { data: courses = [] } = useFileContextsQuery();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const isCompito = initial.type === "compito";
      const originalDescription = initial.description ?? "";
      const extracted = isCompito
        ? { description: originalDescription, endTime: "" }
        : extractEndTimeFromDescription(originalDescription, t("piano.sheet.until"));
      setCategory(isCompito ? "compito" : "verifica");
      setMode(isCompito ? "scritta" : (initial.type as VerificaMode));
      setTitle(initial.title);
      setDescription(extracted.description);
      setDate(initial.date ? initial.date.slice(0, 10) : "");
      if (initial.date) {
        const d = new Date(initial.date);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setTime(hh === "12" && mm === "00" ? "" : `${hh}:${mm}`);
      } else {
        setTime("");
      }
      setEndTime(extracted.endTime);
      setEndTouched(!!extracted.endTime);
      setSubjectId(initial.subject_id ?? NONE);
      setTopicMode(initial.topic_type);
      setCourseId(initial.topic_type === "linked" ? (initial.topic_id ?? "") : "");
      setFreeTopic(initial.free_topic_title ?? "");
      setGoal(initial.goal ?? null);
      setShowNotes(!!originalDescription || initial.goal != null);
    } else {
      // Nuovo evento: la categoria e il giorno possono arrivare dalla vista
      // Diario (presetCategory / presetDate), altrimenti i valori di sempre.
      setCategory(presetCategory ?? "verifica");
      setMode("scritta"); setTitle(""); setDescription("");
      setDate(presetDate ?? ""); setTime(""); setEndTime(""); setSubjectId(NONE);
      setEndTouched(false);
      setTopicMode("free"); setCourseId(""); setFreeTopic("");
      setGoal(null); setShowNotes(false);
      // Un compito nasce con la descrizione aperta: è lì che si scrive cosa c'è da fare.
      if (presetCategory === "compito") setShowNotes(true);
    }
    setFieldErrors({});
    setEndError(null);
  }, [open, initial, presetCategory, presetDate, t]);

  /** Per le verifiche, preserva l'ora di fine nella descrizione: evaluations ha un solo campo orario. */
  const descriptionWithEnd = () => {
    const base = description.trim();
    if (!endTime || endTime === time || category === "compito") return base || undefined;
    return `${base ? `${base} · ` : ""}${t("piano.sheet.until")} ${endTime}`;
  };

  /**
   * P47 — Validazione orari della verifica. Ritorna il messaggio d'errore da
   * mostrare sotto "Ora fine", oppure null se va tutto bene.
   * L'ora di fine è OBBLIGATORIA quando si crea una verifica nuova; in
   * modifica i dati esistenti non conservano un'ora di fine separata, quindi
   * non blocchiamo chi non la tocca — ma se viene inserita deve seguire
   * l'ora di inizio.
   */
  const validateVerificaTimes = (): string | null => {
    if (!endTime && !editingId) return t("piano.sheet.endTimeRequired");
    if (time && endTime && endTime <= time) return t("piano.sheet.endTimeAfterStart");
    return null;
  };

  const validateAltroTimes = (): string | null => {
    if (time && endTime && endTime <= time) return t("piano.sheet.endTimeAfterStart");
    return null;
  };

  const clearFieldError = (field: Exclude<FormField, "endTime">) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormFieldErrors = {};
    if (category === "compito") {
      // Conserva la compatibilità con i compiti preesistenti salvabili tramite il titolo.
      if (!description.trim() && !(editingId && title.trim())) {
        nextErrors.description = t("piano.sheet.compitoRequired");
      }
    } else if (!title.trim()) {
      nextErrors.title = t("piano.sheet.titleRequired");
    }
    if (!date) nextErrors.date = t("piano.sheet.dateRequired");

    // P47 — una verifica senza ora di fine (o con fine prima dell'inizio) non parte.
    const timeError = category === "verifica"
      ? validateVerificaTimes()
      : category === "altro"
        ? validateAltroTimes()
        : null;
    setFieldErrors(nextErrors);
    setEndError(timeError);

    const errorOrder: FormField[] = category === "compito"
      ? ["date", "description"]
      : ["title", "date", "endTime"];
    const firstInvalidField = errorOrder.find((field) =>
      field === "endTime" ? !!timeError : !!nextErrors[field]
    );
    if (firstInvalidField) {
      if (firstInvalidField === "title") titleRef.current?.focus();
      else if (firstInvalidField === "date") dateRef.current?.focus();
      else if (firstInvalidField === "description") descriptionRef.current?.focus();
      else endTimeRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      if (category === "altro") {
        await onSubmit({
          type: "compito", // mai usato: il campo category="altro" instrada su study_events
          category: "altro",
          title: title.trim(),
          description: description.trim() || undefined,
          date: new Date(`${date}T${time ? `${time}:00` : "12:00:00"}`).toISOString(),
          subject_id: null,
          topic_type: "free",
          startTime: time || null,
          endTime: endTime || null,
        }, editingId);
      } else if (category === "compito") {
        const text = description.trim();
        if (!text && editingId) {
          // Compito preesistente senza descrizione: conserva titolo e note.
          await onSubmit({
            type: "compito",
            title: title.trim(),
            description: initial?.description ?? undefined,
            date: new Date(`${date}T12:00:00`).toISOString(),
            subject_id: subjectId === NONE ? null : subjectId,
            topic_type: "free",
          }, editingId);
          onOpenChange(false);
          return;
        }
        // Titolo DERIVATO dalla descrizione (il DB richiede title NOT NULL)
        const derivedTitle = text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text;
        await onSubmit({
          type: "compito",
          title: derivedTitle,
          description: text,
          date: new Date(`${date}T12:00:00`).toISOString(),
          subject_id: subjectId === NONE ? null : subjectId,
          topic_type: "free",
        }, editingId);
      } else {
        await onSubmit({
          type: mode,
          title: title.trim(),
          description: descriptionWithEnd(),
          date: new Date(`${date}T${time ? `${time}:00` : "12:00:00"}`).toISOString(),
          subject_id: subjectId === NONE ? null : subjectId,
          topic_type: topicMode,
          topic_id: topicMode === "linked" ? (courseId || null) : null,
          free_topic_title: topicMode === "free" ? (freeTopic.trim() || null) : null,
          goal,
          startTime: time || null,
          endTime: endTime || null,
        }, editingId);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const errorOrder: FormField[] = category === "compito"
    ? ["date", "description"]
    : ["title", "date", "endTime"];
  const firstErrorField = errorOrder.find((field) =>
    field === "endTime" ? !!endError : !!fieldErrors[field]
  );
  const requiredSuffix = (
    <span className="ml-1 text-xs font-normal text-muted-foreground">{" "}({t("piano.sheet.required")})</span>
  );
  const renderFieldError = (field: FormField, id: string, message: string | null | undefined, className = "text-xs font-medium text-destructive") => {
    if (!message) return null;
    return firstErrorField === field
      ? <p id={id} role="alert" className={className}>{message}</p>
      : <p id={id} className={className}>{message}</p>;
  };

  const subjectSelect = (
    <div className="min-w-0 space-y-2">
      <Label id={ids.subjectLabel} htmlFor={ids.subject} className="label-large">
        {t("piano.sheet.subject")}
      </Label>
      <Select value={subjectId} onValueChange={setSubjectId}>
        <SelectTrigger
          id={ids.subject}
          aria-labelledby={`${ids.subjectLabel} ${ids.subject}`}
          className="w-full h-11 rounded-control border border-input bg-sheet px-4 py-2.5 text-base text-foreground"
        >
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
    </div>
  );

  const dateField = (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={ids.date} className="label-large">
        {t("piano.sheet.date")}{requiredSuffix}
      </Label>
      <Input
        id={ids.date}
        ref={dateRef}
        type="date"
        value={date}
        onChange={(e) => { setDate(e.target.value); clearFieldError("date"); }}
        aria-label={t("piano.sheet.date")}
        aria-required="true"
        aria-invalid={!!fieldErrors.date}
        aria-describedby={fieldErrors.date ? ids.dateError : undefined}
      />
      {renderFieldError("date", ids.dateError, fieldErrors.date)}
    </div>
  );

  /** Intervallo orario su una riga a 2 colonne; per Altro l'ora di fine resta facoltativa. */
  const timeRange = (requireEnd: boolean) => {
    const endIsRequired = requireEnd && !editingId;
    const showDefaultHint = endIsRequired;
    const endTimeDescribedBy = [
      showDefaultHint ? ids.endTimeDefaultHint : undefined,
      endError ? ids.endTimeError : undefined,
    ].filter(Boolean).join(" ") || undefined;

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={ids.startTime} className="label-large">{t("piano.sheet.startTime")}</Label>
          <Input
            id={ids.startTime}
            type="time"
            value={time}
            onChange={(e) => {
              const nextTime = e.target.value;
              setTime(nextTime);
              if (category === "verifica" && !endTouched) {
                setEndTime(nextTime ? addOneHour(nextTime) ?? "" : "");
              }
              setEndError(null);
            }}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor={ids.endTime} className="label-large">
            {t("piano.sheet.endTime")}
            {endIsRequired
              ? requiredSuffix
              : (
                <span className="text-muted-foreground font-normal">
                  {" "}({t("piano.sheet.optional").replace(/[()]/g, "")})
                </span>
              )}
          </Label>
          <Input
            id={ids.endTime}
            ref={endTimeRef}
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setEndTouched(true);
              setEndError(null);
            }}
            aria-required={endIsRequired}
            aria-invalid={!!endError}
            aria-describedby={endTimeDescribedBy}
          />
          {showDefaultHint && (
            <p id={ids.endTimeDefaultHint} className="text-xs text-muted-foreground">
              {t("piano.sheet.endTimeDefaultHint")}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn("pb-safe max-h-[92vh] overflow-y-auto", !isMobile && "w-full sm:max-w-md")}
      >
        <SheetHeader className="mb-4">
          <SheetTitle className="title-large font-display">
            {editingId ? t("piano.sheet.editTitle") : t("piano.sheet.addTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-muted-foreground">{t("piano.sheet.requiredFieldsHint")}</p>
          {/* 🎛️ P46 — TRE tab primari, iniziale maiuscola */}
          <PillToggle<Category>
            aria-label={t("piano.sheet.type")}
            options={[
              { value: "verifica", label: t("piano.sheet.verifica") },
              { value: "compito", label: t("piano.sheet.compito") },
              { value: "altro", label: t("piano.sheet.altro") },
            ]}
            value={category}
            onChange={(nextCategory) => {
              if (nextCategory === "altro" && category === "verifica" && !endTouched) setEndTime("");
              setCategory(nextCategory);
              setFieldErrors({});
              setEndError(null);
            }}
            variant="track"
          />

          {category === "verifica" && (
            <>
              {/* P47 — Barra unica Titolo + Modalità: un solo blocco visivo.
                  L'input del titolo si espande a sinistra; a destra il pill
                  compatto apre la tendina delle modalità. Nessuna riga "Modalità" separata. */}
              <div className="space-y-2">
                <Label htmlFor={ids.title} className="label-large">
                  {t("piano.sheet.title")}{requiredSuffix}
                </Label>
                <div className="flex h-11 items-center rounded-control border border-input bg-sheet px-3 transition-colors focus-within:border-control-line">
                  <input
                    id={ids.title}
                    ref={titleRef}
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); clearFieldError("title"); }}
                    placeholder={t("piano.sheet.titlePlaceholder")}
                    aria-label={t("piano.sheet.title")}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.title}
                    aria-describedby={fieldErrors.title ? ids.titleError : undefined}
                    className="h-10 min-w-0 flex-1 bg-transparent px-1 text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        id={ids.modeButton}
                        type="button"
                        className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <span className="sr-only">{t("piano.sheet.mode")}:</span>
                        {t(VERIFICA_MODE_LABEL[mode])}
                        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[10rem]">
                      <DropdownMenuRadioGroup
                        value={mode}
                        onValueChange={(value) => setMode(value as VerificaMode)}
                      >
                        {VERIFICA_MODES.map((value) => (
                          <DropdownMenuRadioItem key={value} value={value}>
                            {t(VERIFICA_MODE_LABEL[value])}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {renderFieldError("title", ids.titleError, fieldErrors.title)}
              </div>

              {/* P47 — Data + Materia affiancate (griglia fissa a 2 colonne anche su mobile) */}
              <div className="grid grid-cols-2 gap-3">
                {dateField}
                {subjectSelect}
              </div>

              {/* Riga 3 — Intervallo orario: per la verifica l'ora di fine è obbligatoria */}
              {timeRange(true)}
              {renderFieldError("endTime", ids.endTimeError, endError, "-mt-2 text-xs font-medium text-destructive")}

              {/* Riga 4 — Argomento: Da corso | Libero */}
              <div className="space-y-2">
                <Label
                  id={ids.topicLabel}
                  htmlFor={topicMode === "free" ? ids.freeTopic : undefined}
                  className="label-large"
                >
                  {t("piano.sheet.topic")}
                </Label>
                <PillToggle<"linked" | "free">
                  aria-label={t("piano.sheet.topic")}
                  options={[
                    { value: "linked", label: t("piano.sheet.topicLinked") },
                    { value: "free", label: t("piano.sheet.topicFree") },
                  ]}
                  value={topicMode}
                  onChange={setTopicMode}
                  size="md"
                  grow
                  className="[&>button]:h-11 [&>button]:text-sm [&>button[aria-checked=true]]:!border-input [&>button[aria-checked=true]]:!bg-secondary [&>button[aria-checked=true]]:!text-foreground [&>button[aria-checked=true]]:!shadow-none"
                />
                {topicMode === "linked" ? (
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger
                      id={ids.course}
                      aria-labelledby={`${ids.topicLabel} ${ids.course}`}
                      className="w-full h-11 rounded-control border border-input bg-sheet px-4 py-2.5 text-base text-foreground"
                    >
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
                    id={ids.freeTopic}
                    aria-labelledby={ids.topicLabel}
                    placeholder={t("piano.sheet.topicPlaceholder")}
                    value={freeTopic}
                    onChange={(e) => setFreeTopic(e.target.value)}
                  />
                )}
              </div>

              {/* Riga 5 — Note & Obiettivo voto (richimabili a richiesta) */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNotes(!showNotes)}
                  className="min-h-11 h-auto justify-start px-3 text-sm font-semibold text-brand-deep hover:underline"
                >
                  {showNotes ? t("piano.sheet.hideNotes") : t("piano.sheet.addNotes")}
                </Button>
                {showNotes && (
                  <>
                    <Label htmlFor={ids.notes} className="sr-only" id={ids.notesLabel}>
                      {t("piano.sheet.notes")}
                    </Label>
                    <Textarea id={ids.notes} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("piano.sheet.notesPlaceholder")} />
                    <div className="space-y-2 rounded-2xl border border-outline-variant/60 p-4">
                      {goal == null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-11 h-auto justify-start px-3 text-sm"
                          onClick={() => setGoal(6)}
                        >
                          {t("piano.sheet.goalSet")}
                        </Button>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <Label id={ids.goalLabel} className="label-large">{t("piano.sheet.goalLabel")}</Label>
                            <span className="label-large font-semibold text-brand-deep">{goal.toFixed(goal % 1 ? 1 : 0)}</span>
                          </div>
                          {/* Il DB salva goal come smallint: step intero 6-10 */}
                          <Slider
                            id={ids.goalSlider}
                            value={[goal]}
                            min={6}
                            max={10}
                            step={1}
                            onValueChange={(v) => setGoal(v[0])}
                            aria-labelledby={ids.goalLabel}
                            thumbProps={{ id: ids.goalThumb, "aria-labelledby": ids.goalLabel }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-11 h-auto justify-start px-3 text-sm text-muted-foreground hover:text-foreground"
                            onClick={() => setGoal(null)}
                          >
                            {t("piano.sheet.goalClear")}
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {category === "compito" && (
            <>
              {/* P47 — Materia + Data affiancate (speculare al tab Verifica) */}
              <div className="grid grid-cols-2 gap-3">
                {subjectSelect}
                {dateField}
              </div>
              {/* Riga 2 — Descrizione ampia (il titolo si ricava da qui) */}
              <div className="space-y-2">
                <Label htmlFor={ids.compito} className="label-large">
                  {t("piano.sheet.compitoLabel")}{!(editingId && title.trim()) && requiredSuffix}
                </Label>
                <Textarea
                  id={ids.compito}
                  ref={descriptionRef}
                  rows={5}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearFieldError("description"); }}
                  placeholder={t("piano.sheet.compitoPlaceholder")}
                  aria-label={t("piano.sheet.compitoLabel")}
                  aria-required={!(editingId && !!title.trim())}
                  aria-invalid={!!fieldErrors.description}
                  aria-describedby={fieldErrors.description ? ids.descriptionError : undefined}
                />
                {renderFieldError("description", ids.descriptionError, fieldErrors.description)}
              </div>
            </>
          )}

          {category === "altro" && (
            <>
              <p className="body-small text-muted-foreground leading-relaxed">
                {t("piano.sheet.altroHint")}
              </p>
              <div className="space-y-2">
                <Label htmlFor={ids.altroTitle} className="label-large">
                  {t("piano.sheet.title")}{requiredSuffix}
                </Label>
                <Input
                  id={ids.altroTitle}
                  ref={titleRef}
                  placeholder={t("piano.sheet.altroPlaceholder")}
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearFieldError("title"); }}
                  aria-label={t("piano.sheet.title")}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby={fieldErrors.title ? ids.titleError : undefined}
                />
                {renderFieldError("title", ids.titleError, fieldErrors.title)}
              </div>
              <div className="space-y-2">
                <Label htmlFor={ids.altroNotes} className="label-large">
                  {t("piano.sheet.notes")}
                </Label>
                <Textarea id={ids.altroNotes} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("piano.sheet.notesPlaceholder")} />
              </div>
              {dateField}
              {timeRange(false)}
              {renderFieldError("endTime", ids.endTimeError, endError, "-mt-2 text-xs font-medium text-destructive")}
            </>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting
              ? t("piano.sheet.saving")
              : category === "compito"
                ? t("piano.sheet.saveCompito")
                : editingId
                  ? t("piano.sheet.saveChanges")
                  : t("piano.sheet.saveEvent")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
