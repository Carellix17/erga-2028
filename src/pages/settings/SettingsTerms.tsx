import { Info } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";

const SECTIONS = [
  "1. Oggetto del servizio",
  "2. Dati e privacy",
  "3. Abbonamenti e pagamenti",
  "4. Responsabilità",
  "5. Contatti",
];

export default function SettingsTerms() {
  return (
    <SettingsPage>
      <SettingsHeader title="Termini e condizioni" subtitle="Termini di servizio e privacy" />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-5 animate-fade-up">
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="body-medium text-foreground">
            Il testo completo dei Termini e Condizioni e dell'Informativa Privacy sarà disponibile a breve.
          </p>
        </div>

        <p className="body-small text-muted-foreground">Ultimo aggiornamento: —</p>

        <div className="space-y-3">
          {SECTIONS.map((title) => (
            <section key={title} className="rounded-2xl glass-1 p-5 space-y-2">
              <h2 className="title-medium font-display text-foreground">{title}</h2>
              <p className="body-medium text-muted-foreground">
                Contenuto in arrivo.
              </p>
            </section>
          ))}
        </div>
      </main>
    </SettingsPage>
  );
}