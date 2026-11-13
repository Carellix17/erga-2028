import { useEffect } from "react";
import { useOptionalFocus } from "@/contexts/FocusContext";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { DeviationPromptView } from "@/hooks/useDeviationPrompt";
import { wasDeviationPromptSignalShown } from "@/lib/focus/deviationPrompt";

interface ReplanBannerProps {
  prompt: DeviationPromptView | null;
  notice: string;
  isBuilding: boolean;
  onShown: (prompt: DeviationPromptView) => void;
  onReorganize: () => void;
  onLater: () => void;
}

function formatDuration(minutes: number, language: string): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (language.startsWith("en")) {
    if (hours && rest) return `${hours} hr ${rest} min`;
    if (hours) return `${hours} hr`;
    return `${rest} min`;
  }
  if (hours && rest) return `${hours} h ${rest}`;
  if (hours) return `${hours} h`;
  return `${rest} min`;
}

export function ReplanBanner({ prompt, notice, isBuilding, onShown, onReorganize, onLater }: ReplanBannerProps) {
  const focus = useOptionalFocus();
  const { t, i18n } = useTranslation();
  const isInFocusBlock = !!focus?.isActive && focus.phase === "focus";
  useEffect(() => {
    if (prompt && !isInFocusBlock) onShown(prompt);
  }, [isInFocusBlock, onShown, prompt]);
  if (isInFocusBlock || (!prompt && !notice)) return null;

  const language = i18n.resolvedLanguage ?? i18n.language;
  const planned = prompt ? formatDuration(prompt.plannedMin, language) : "";
  const actual = prompt ? formatDuration(prompt.actualMin, language) : "";

  return (
    <aside
      role="status"
      aria-live={prompt && wasDeviationPromptSignalShown(prompt.signalId) ? "off" : "polite"}
      aria-atomic="true"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/30 bg-white/5 p-4"
      data-testid="replan-banner"
    >
      <p className="min-w-0 flex-1 text-base font-medium">
        {prompt
          ? t(`piano.replanPrompt.${prompt.reason}`, { subject: prompt.subject, planned, actual })
          : notice}
      </p>
      {prompt && (
        <div className="flex shrink-0 gap-2">
          <Button onClick={onReorganize} disabled={isBuilding} className="min-h-11">
            {t("piano.replanPrompt.reorganize")}
          </Button>
          <Button variant="ghost" onClick={onLater} disabled={isBuilding} className="min-h-11">
            {t("piano.replanPrompt.later")}
          </Button>
        </div>
      )}
    </aside>
  );
}
