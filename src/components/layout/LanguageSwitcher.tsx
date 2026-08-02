import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ className, variant = "light" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "it").slice(0, 2) as SupportedLanguage;

  const next: SupportedLanguage = current === "it" ? "en" : "it";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      aria-label={`Switch language to ${next.toUpperCase()}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors",
        variant === "light"
          ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          : "text-muted-foreground hover:text-foreground hover:bg-surface-container-high",
        className,
      )}
    >
      <Languages className="w-3.5 h-3.5" />
      <span className="uppercase tracking-wider">{current}</span>
    </button>
  );
}

// Silence unused import warning when SUPPORTED_LANGUAGES not used elsewhere
void SUPPORTED_LANGUAGES;