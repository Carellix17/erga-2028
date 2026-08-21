import { Languages, Check } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { value: SupportedLanguage; labelKey: string }[] = [
  { value: "it", labelKey: "common.italian" },
  { value: "en", labelKey: "common.english" },
];

export default function SettingsLanguage() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "it").slice(0, 2) as SupportedLanguage;

  return (
    <SettingsPage>
      <SettingsHeader title={t("common.language")} subtitle={t("settings.languageSubtitle")} />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-6 animate-fade-up">
        <section className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Languages className="w-5 h-5 text-foreground" />
            <h2 className="title-medium font-display text-foreground">{t("common.language")}</h2>
          </div>
          <p className="body-small text-muted-foreground">{t("settings.languageDescription")}</p>

          <div role="radiogroup" aria-label={t("common.language")} className="space-y-2 pt-1">
            {OPTIONS.map((opt) => {
              const active = current === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => i18n.changeLanguage(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-button border transition-all duration-300 ease-m3-emphasized text-left",
                    active
                      ? "border-primary bg-surface-container-high"
                      : "border-outline-variant/60 hover:bg-foreground/[0.06]"
                  )}
                >
                  <span className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline-variant/60 flex items-center justify-center shrink-0 label-large font-bold uppercase tracking-wider text-foreground">
                    {opt.value}
                  </span>
                  <span className="min-w-0 flex-1 title-medium text-foreground">{t(opt.labelKey)}</span>
                  {active && <Check className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </SettingsPage>
  );
}
