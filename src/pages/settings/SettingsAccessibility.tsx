import { Type, Contrast, Wind, Volume2 } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { Switch } from "@/components/ui/switch";
import { useAccessibility, type TextScale } from "@/contexts/AccessibilityContext";
import { cn } from "@/lib/utils";

const SCALES: { value: TextScale; label: string }[] = [
  { value: "normal", label: "Normale" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Molto grande" },
];

function Row({
  icon: Icon, title, desc, children,
}: { icon: typeof Type; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-button bg-surface-container-high flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="title-medium font-display text-foreground">{title}</h2>
          <p className="body-small text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="pt-1">{children}</div>
    </section>
  );
}

export default function SettingsAccessibility() {
  const { settings, update } = useAccessibility();

  return (
    <SettingsPage>
      <SettingsHeader title="Accessibilità" subtitle="Testo, contrasto e movimento" />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-4 animate-fade-up">
        <Row icon={Type} title="Dimensione testo" desc="Ingrandisci il testo di tutta l'app se fai fatica a leggere.">
          <div className="grid grid-cols-3 gap-2">
            {SCALES.map((s) => (
              <button
                key={s.value}
                onClick={() => update({ textScale: s.value })}
                aria-pressed={settings.textScale === s.value}
                className={cn(
                  "h-12 rounded-button border transition-all duration-300 ease-m3-emphasized body-medium",
                  settings.textScale === s.value
                    ? "border-primary bg-surface-container-high text-foreground"
                    : "border-outline-variant/60 text-muted-foreground hover:bg-foreground/[0.06]"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Row>

        <Row icon={Contrast} title="Alto contrasto" desc="Bordi e testi più marcati per una lettura più netta.">
          <div className="flex items-center justify-between">
            <span className="body-medium text-muted-foreground">Attiva alto contrasto</span>
            <Switch checked={settings.highContrast} onCheckedChange={(v) => update({ highContrast: v })} aria-label="Alto contrasto" />
          </div>
        </Row>

        <Row icon={Wind} title="Riduci le animazioni" desc="Disattiva transizioni e movimenti, anche se il tuo dispositivo non lo richiede.">
          <div className="flex items-center justify-between">
            <span className="body-medium text-muted-foreground">Riduci il movimento</span>
            <Switch checked={settings.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} aria-label="Riduci le animazioni" />
          </div>
        </Row>

        <Row icon={Volume2} title="Lettura vocale" desc="Attiva di default la voce nelle interrogazioni e nelle lezioni.">
          <div className="flex items-center justify-between">
            <span className="body-medium text-muted-foreground">Voce attiva all'avvio</span>
            <Switch checked={settings.ttsEnabled} onCheckedChange={(v) => update({ ttsEnabled: v })} aria-label="Lettura vocale" />
          </div>
        </Row>
      </main>
    </SettingsPage>
  );
}