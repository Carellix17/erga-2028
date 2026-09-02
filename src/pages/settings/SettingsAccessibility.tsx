import { Type, Contrast, Wind, Volume2 } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { Switch } from "@/components/ui/switch";
import { useAccessibility, type TextScale } from "@/contexts/AccessibilityContext";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";
import { SeoHead } from "@/components/SeoHead";

const SCALES: { value: TextScale; label: string }[] = [
  { value: "normal", label: "Normale" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Molto grande" },
];

function Row({
  icon: Icon, title, desc, children,
}: { icon: typeof Type; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="erga-settings-panel rounded-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="erga-list-item-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-button">
          <Icon className="h-5 w-5 text-foreground" />
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
  const { triggerLight } = useHaptics();

  return (
    <SettingsPage>
      <SeoHead
        title="Accessibilità — Erga"
        description="Regola testo, contrasto e movimento per un'esperienza Erga più accessibile."
        path="/app/impostazioni/accessibilita"
        noindex
      />
      <SettingsHeader title="Accessibilità" subtitle="Testo, contrasto e movimento" />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-4 animate-fade-up">
        <Row icon={Type} title="Dimensione testo" desc="Ingrandisci il testo di tutta l'app se fai fatica a leggere.">
          <div className="grid grid-cols-3 gap-2">
            {SCALES.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  triggerLight();
                  update({ textScale: s.value });
                }}
                aria-pressed={settings.textScale === s.value}
                className={cn(
                  "erga-list-item h-12 rounded-button transition-all duration-300 ease-m3-emphasized body-medium",
                  settings.textScale === s.value ? "text-foreground" : "text-muted-foreground"
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
            <Switch
              checked={settings.highContrast}
              onCheckedChange={(value) => {
                triggerLight();
                update({ highContrast: value });
              }}
              aria-label="Alto contrasto"
            />
          </div>
        </Row>

        <Row icon={Wind} title="Riduci le animazioni" desc="Disattiva transizioni e movimenti, anche se il tuo dispositivo non lo richiede.">
          <div className="flex items-center justify-between">
            <span className="body-medium text-muted-foreground">Riduci il movimento</span>
            <Switch
              checked={settings.reduceMotion}
              onCheckedChange={(value) => {
                triggerLight();
                update({ reduceMotion: value });
              }}
              aria-label="Riduci le animazioni"
            />
          </div>
        </Row>

        <Row icon={Volume2} title="Lettura vocale" desc="Attiva di default la voce nelle interrogazioni e nelle lezioni.">
          <div className="flex items-center justify-between">
            <span className="body-medium text-muted-foreground">Voce attiva all'avvio</span>
            <Switch
              checked={settings.ttsEnabled}
              onCheckedChange={(value) => {
                triggerLight();
                update({ ttsEnabled: value });
              }}
              aria-label="Lettura vocale"
            />
          </div>
        </Row>
      </main>
    </SettingsPage>
  );
}