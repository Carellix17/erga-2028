import { Sun, Moon, Monitor, Check } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { useHaptics } from "@/hooks/useHaptics";
import { SeoHead } from "@/components/SeoHead";

const OPTIONS: { value: Theme; label: string; desc: string; icon: typeof Sun; swatch: string }[] = [
  { value: "light", label: "Chiaro", desc: "Sfondo chiaro, testo scuro", icon: Sun, swatch: "bg-[#F2F0EF]" },
  { value: "dark", label: "Scuro", desc: "Sfondo scuro, testo chiaro", icon: Moon, swatch: "bg-[#0a0a0a]" },
  { value: "system", label: "Automatico", desc: "Segue il tuo dispositivo", icon: Monitor, swatch: "bg-gradient-to-r from-[#F2F0EF] to-[#0a0a0a]" },
];

export default function SettingsAppearance() {
  const { theme, setTheme } = useTheme();
  const { triggerLight } = useHaptics();

  return (
    <SettingsPage>
      <SeoHead
        title="Aspetto — Erga"
        description="Personalizza tema e visualizzazione dell'app Erga."
        path="/app/impostazioni/aspetto"
        noindex
      />
      <SettingsHeader title="Aspetto" subtitle="Tema e visualizzazione" />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-6 animate-fade-up">
        <section className="erga-settings-panel rounded-card p-5 space-y-3">
          <h2 className="title-medium font-display text-foreground">Tema</h2>
          <p className="body-small text-muted-foreground -mt-2">Scegli come vuoi vedere Erga.</p>

          <div role="radiogroup" aria-label="Tema" className="space-y-2 pt-1">
            {OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    triggerLight();
                    setTheme(opt.value);
                  }}
                  className="erga-list-item flex w-full items-center gap-4 rounded-button p-3 text-left transition-all duration-300 ease-m3-emphasized"
                >
                  <div className={`erga-list-item-icon h-11 w-11 shrink-0 rounded-button ${opt.swatch}`} />
                  <div className="min-w-0 flex-1">
                    <p className="title-medium text-foreground flex items-center gap-2">
                      <opt.icon className="w-4 h-4" /> {opt.label}
                    </p>
                    <p className="body-small text-muted-foreground">{opt.desc}</p>
                  </div>
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