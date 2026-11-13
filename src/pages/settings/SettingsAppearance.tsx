import { Moon } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { SeoHead } from "@/components/SeoHead";
import { RoomClarify } from "@/components/shared/RoomClarify";

export default function SettingsAppearance() {
  return (
    <SettingsPage>
      <SeoHead
        title="Aspetto — Erga"
        description="Erga usa un'unica interfaccia scura."
        path="/app/impostazioni/aspetto"
        noindex
      />
      <SettingsHeader title="Aspetto" subtitle="Tema e visualizzazione" />
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-32 sm:px-6 md:max-w-2xl lg:max-w-4xl">
        <RoomClarify screenKey="impostazioni-aspetto" className="flex flex-col gap-6">
        <section className="erga-settings-panel space-y-4 rounded-[24px] p-6">
          <h2 className="title-medium font-display text-foreground">Tema</h2>
          <p className="body-small text-muted-foreground">
            Erga resta su un'unica superficie scura, così lezioni, piano e pratica hanno lo stesso fondo.
          </p>
          <div className="flex min-h-12 items-center gap-4">
            <Moon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-[#0a0a0a]">Scuro</p>
              <p className="body-small text-muted-foreground">Canvas nero, card avorio, angoli da 24px.</p>
            </div>
          </div>
        </section>
        </RoomClarify>
      </main>
    </SettingsPage>
  );
}
