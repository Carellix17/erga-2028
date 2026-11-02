import { format, isValid, parseISO } from "date-fns";
import { enUS, it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReplanPrompt } from "@/hooks/useAutoReplan";

interface NoSpaceDialogProps {
  prompt: ReplanPrompt | null;
  isApplying?: boolean;
  onDismiss: () => void;
  onKeep: () => void;
  onSplit: () => void;
  onChooseTime: () => void;
  onShortenSessions: () => void;
}

function weekday(value: string, language: string): string {
  const date = parseISO(value.slice(0, 10));
  if (!isValid(date)) return value;
  return format(date, "EEEE", { locale: language.startsWith("en") ? enUS : it });
}

export function NoSpaceDialog({
  prompt,
  isApplying = false,
  onDismiss,
  onKeep,
  onSplit,
  onChooseTime,
  onShortenSessions,
}: NoSpaceDialogProps) {
  const { t, i18n } = useTranslation();
  const day = prompt
    ? weekday(prompt.kind === "move_limit" ? prompt.suggestedDate : prompt.deadline, i18n.resolvedLanguage ?? i18n.language)
    : "";

  return (
    <AlertDialog open={!!prompt} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {prompt?.kind === "move_limit"
              ? t("piano.autoReplan.moveLimitTitle", {
                subject: prompt.slot.subject || prompt.slot.title || t("piano.type_study"),
                count: prompt.slot.move_count,
              })
              : t("piano.autoReplan.noSpaceTitle", { deadline: day })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {prompt?.kind === "move_limit"
              ? t("piano.autoReplan.moveLimitDescription", { day })
              : t("piano.autoReplan.noSpaceDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {prompt?.kind === "move_limit" ? (
            <>
              <Button onClick={onKeep} disabled={isApplying} className="min-h-11 w-full">
                {t("piano.autoReplan.keepDay", { day })}
              </Button>
              <Button variant="outline" onClick={onSplit} disabled={isApplying} className="min-h-11 w-full">
                {t("piano.autoReplan.splitInTwo")}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onChooseTime} disabled={isApplying} className="min-h-11 w-full">
                {t("piano.autoReplan.chooseYourTime")}
              </Button>
              <Button variant="outline" onClick={onShortenSessions} disabled={isApplying} className="min-h-11 w-full">
                {t("piano.autoReplan.shortenSessions")}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
