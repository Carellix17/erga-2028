import { Info } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { SeoHead } from "@/components/SeoHead";
import { RoomClarify } from "@/components/shared/RoomClarify";

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
      <SeoHead
        title="Termini e condizioni — Erga"
        description="Termini di servizio e informativa privacy di Erga."
        path="/app/impostazioni/termini"
      />
      <SettingsHeader title="Termini e condizioni" subtitle="Termini di servizio e privacy" />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 pb-32 sm:px-6 md:max-w-2xl lg:max-w-4xl">
        <RoomClarify screenKey="impostazioni-termini" className="flex flex-col gap-6">
        <section className="erga-settings-panel flex items-start gap-3 rounded-[24px] p-6">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="body-medium text-foreground">
            Il testo completo dei Termini e Condizioni e dell'Informativa Privacy sarà disponibile a breve.
          </p>
        </section>

        <p className="body-small text-[#dadbdf]">Ultimo aggiornamento: in arrivo</p>

        <div className="flex flex-col gap-6">
          {SECTIONS.map((title) => (
            <section key={title} className="erga-settings-panel space-y-2 rounded-[24px] p-6">
              <h2 className="title-medium font-display text-foreground">{title}</h2>
              <p className="body-medium text-muted-foreground">
                Contenuto in arrivo.
              </p>
            </section>
          ))}
        </div>
        </RoomClarify>
      </main>
    </SettingsPage>
  );
}