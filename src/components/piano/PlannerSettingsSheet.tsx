import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePlannerSettings, type PlannerSettings, type PlannerSettingsPatch } from "@/hooks/usePlannerSettings";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import type { SubjectType } from "@/lib/planner/subjectType";

const SUBJECT_TYPE_OPTIONS: { value: Exclude<SubjectType, "generale">; labelKey: string }[] = [
  { value: "scientifico", labelKey: "piano.settings.subjectTypeScientific" },
  { value: "lingue", labelKey: "piano.settings.subjectTypeLanguages" },
  { value: "umanistico", labelKey: "piano.settings.subjectTypeHumanities" },
];

function displaySubjectType(value: SubjectType | undefined): string | undefined {
  return SUBJECT_TYPE_OPTIONS.some((option) => option.value === value) ? value : undefined;
}

function NumberSetting({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => setInputValue(String(value)), [value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={step}
          required
          value={inputValue}
          disabled={disabled}
          onChange={(event) => {
            const raw = event.target.value;
            setInputValue(raw);
            if (raw === "") return;
            const next = Number(raw);
            if (Number.isFinite(next) && next >= min && next <= max) onChange(next);
          }}
          onBlur={() => {
            const next = Number(inputValue);
            if (!inputValue || !Number.isFinite(next) || next < min || next > max) {
              setInputValue(String(value));
            }
          }}
          className="min-h-11"
        />
        <span className="shrink-0 text-sm text-muted-foreground">{t("piano.settings.minutes")}</span>
      </div>
      <p className="text-xs text-muted-foreground">{t("piano.settings.range", { min, max })}</p>
    </div>
  );
}

export function PlannerSettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    settings,
    isLoading,
    isError,
    refetch,
    isPro,
    saveSettings,
    isSaving,
  } = usePlannerSettings();
  const subjectsQuery = useUserSubjects();
  const [draft, setDraft] = useState<PlannerSettings | null>(null);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (open && !isLoading) setDraft(settings);
  }, [isLoading, open, settings]);

  const updateDraft = <K extends keyof PlannerSettings>(key: K, value: PlannerSettings[K]) => {
    setDraft((previous) => previous ? { ...previous, [key]: value } : previous);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || isSaving) return;

    const patch: PlannerSettingsPatch = {
      daily_limit_school_min: draft.daily_limit_school_min,
      daily_limit_free_min: draft.daily_limit_free_min,
      ask_before_move: draft.ask_before_move,
      sound_enabled: draft.sound_enabled,
      subject_types: draft.subject_types,
    };
    if (isPro) {
      patch.lessons_per_block = draft.lessons_per_block;
      patch.short_break_min = draft.short_break_min;
      patch.medium_break_min = draft.medium_break_min;
      patch.long_break_min = draft.long_break_min;
    }

    setSaveError(false);
    try {
      await saveSettings(patch);
      toast({ title: t("piano.settings.saved") });
      onOpenChange(false);
    } catch {
      setSaveError(true);
      toast({
        title: t("piano.settings.saveFailed"),
        description: t("piano.settings.saveRetry"),
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-5 pr-10 text-left">
          <SheetTitle>{t("piano.settings.title")}</SheetTitle>
          <SheetDescription>{t("piano.settings.description")}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("piano.settings.loading")}
          </div>
        ) : isError ? (
          <div className="space-y-3 rounded-lg border border-destructive/40 p-4" role="alert">
            <p className="text-sm text-destructive">{t("piano.settings.loadFailed")}</p>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void refetch()}>
              {t("piano.settings.retry")}
            </Button>
          </div>
        ) : draft ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <section className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <h3 className="font-semibold">{t("piano.settings.dailyLimitsTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("piano.settings.dailyLimitsDescription")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberSetting
                  id="planner-daily-limit-school"
                  label={t("piano.settings.schoolDayLimit")}
                  value={draft.daily_limit_school_min}
                  min={30}
                  max={480}
                  onChange={(value) => updateDraft("daily_limit_school_min", value)}
                />
                <NumberSetting
                  id="planner-daily-limit-free"
                  label={t("piano.settings.freeDayLimit")}
                  value={draft.daily_limit_free_min}
                  min={30}
                  max={600}
                  onChange={(value) => updateDraft("daily_limit_free_min", value)}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="font-semibold">{t("piano.settings.behaviorTitle")}</h3>
              <div className="flex min-h-11 items-center justify-between gap-4">
                <Label htmlFor="planner-ask-before-move" className="leading-relaxed">
                  {t("piano.settings.askBeforeMove")}
                </Label>
                <Switch
                  id="planner-ask-before-move"
                  checked={draft.ask_before_move}
                  onCheckedChange={(checked) => updateDraft("ask_before_move", checked)}
                />
              </div>
              <div className="flex min-h-11 items-center justify-between gap-4">
                <Label htmlFor="planner-sound-enabled" className="leading-relaxed">
                  {t("piano.settings.soundEnabled")}
                </Label>
                <Switch
                  id="planner-sound-enabled"
                  checked={draft.sound_enabled}
                  onCheckedChange={(checked) => updateDraft("sound_enabled", checked)}
                />
              </div>
            </section>

            <section className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <h3 className="font-semibold">{t("piano.settings.subjectTypesTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("piano.settings.subjectTypesDescription")}</p>
              </div>
              {subjectsQuery.data?.length ? (
                <div className="space-y-3">
                  {subjectsQuery.data.map((subject) => {
                    const selectedType = displaySubjectType(draft.subject_types[subject.name]);
                    const selectId = `planner-subject-type-${subject.id}`;
                    return (
                      <div key={subject.id} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.8fr)]">
                        <Label htmlFor={selectId} className="break-words">{subject.name}</Label>
                        <Select
                          value={selectedType}
                          onValueChange={(value) => updateDraft("subject_types", {
                            ...draft.subject_types,
                            [subject.name]: value as SubjectType,
                          })}
                        >
                          <SelectTrigger id={selectId} className="min-h-11">
                            <SelectValue placeholder={t("piano.settings.subjectTypePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBJECT_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{t(option.labelKey)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" role={subjectsQuery.isError ? "alert" : undefined}>
                  {subjectsQuery.isError
                    ? t("piano.settings.subjectsLoadFailed")
                    : subjectsQuery.isLoading
                      ? t("piano.settings.subjectsLoading")
                      : t("piano.settings.noSubjects")}
                </p>
              )}
            </section>

            <section className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{t("piano.settings.blockSettingsTitle")}</h3>
                <Badge variant="secondary">{t("piano.settings.proLabel")}</Badge>
              </div>
              {!isPro && <p className="text-sm text-muted-foreground">{t("piano.settings.proReadOnlyDescription")}</p>}
              <fieldset disabled={!isPro} className="grid gap-4 sm:grid-cols-2">
                <NumberSetting
                  id="planner-lessons-per-block"
                  label={t("piano.settings.lessonsPerBlock")}
                  value={draft.lessons_per_block}
                  min={1}
                  max={6}
                  onChange={(value) => updateDraft("lessons_per_block", value)}
                />
                <NumberSetting
                  id="planner-short-break"
                  label={t("piano.settings.shortBreak")}
                  value={draft.short_break_min}
                  min={3}
                  max={15}
                  onChange={(value) => updateDraft("short_break_min", value)}
                />
                <NumberSetting
                  id="planner-medium-break"
                  label={t("piano.settings.mediumBreak")}
                  value={draft.medium_break_min}
                  min={5}
                  max={20}
                  onChange={(value) => updateDraft("medium_break_min", value)}
                />
                <NumberSetting
                  id="planner-long-break"
                  label={t("piano.settings.longBreak")}
                  value={draft.long_break_min}
                  min={10}
                  max={40}
                  onChange={(value) => updateDraft("long_break_min", value)}
                />
              </fieldset>
            </section>

            {saveError && <p className="text-sm text-destructive" role="alert">{t("piano.settings.saveRetry")}</p>}

            <div className="sticky bottom-0 flex gap-2 border-t border-border bg-background/95 py-3 backdrop-blur">
              <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="min-h-11 flex-1" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
                {isSaving ? t("piano.settings.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
