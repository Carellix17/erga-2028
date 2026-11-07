import { Moon } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { SeoHead } from "@/components/SeoHead";

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
        <section className="erga-settings-panel space-y-3 rounded-card p-5">
          <h2 className="title-medium font-display text-foreground">Tema</h2>
          <p className="body-small -mt-2 text-muted-foreground">
            Erga resta su un'unica superficie scura, così lezioni, piano e pratica hanno lo stesso fondo.
          </p>
          <div className="flex min-h-11 items-center gap-4 rounded-card border border-border bg-nest p-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-button border border-foreground/40 bg-canvas text-sand" aria-hidden="true">
              <Moon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-sand">Scuro</p>
              <p className="body-small text-muted-foreground">Canvas nero, testo bianco, controlli a pillola.</p>
            </div>
          </div>
        </section>
      </main>
    </SettingsPage>
  );
}
