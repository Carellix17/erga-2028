import { Sun, Moon, Monitor, Check } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; desc: string; icon: typeof Sun; swatch: string }[] = [
  { value: "light", label: "Chiaro", desc: "Sfondo chiaro, testo scuro", icon: Sun, swatch: "bg-[#F2F0EF]" },
  { value: "dark", label: "Scuro", desc: "Sfondo scuro, testo chiaro", icon: Moon, swatch: "bg-[#0a0a0a]" },
  { value: "system", label: "Automatico", desc: "Segue il tuo dispositivo", icon: Monitor, swatch: "bg-gradient-to-r from-[#F2F0EF] to-[#0a0a0a]" },
];

export default function SettingsAppearance() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsPage>
      <SettingsHeader title="Aspetto" subtitle="Tema e visualizzazione" />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-6 animate-fade-up">
        <section className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-3">
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
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-button border transition-all duration-300 ease-m3-emphasized text-left",
                    active
                      ? "border-primary bg-surface-container-high"
                      : "border-outline-variant/60 hover:bg-foreground/[0.06]"
                  )}
                >
                  <div className={cn("w-11 h-11 rounded-button border border-outline-variant/60 shrink-0", opt.swatch)} />
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