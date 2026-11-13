import { Link, useLocation } from "react-router-dom";
import { User, Palette, Accessibility, FileText, ChevronRight, Languages } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { SettingsPlanCard } from "@/components/settings/SettingsPlanCard";
import { useHaptics } from "@/hooks/useHaptics";
import { SeoHead } from "@/components/SeoHead";
import { RoomClarify } from "@/components/shared/RoomClarify";

const ITEMS = [
  { to: "/app/impostazioni/account", icon: User, title: "Generale", desc: "Dati personali e notifiche" },
  { to: "/app/impostazioni/lingua", icon: Languages, title: "Lingua", desc: "Scegli la lingua dell'app" },
  { to: "/app/impostazioni/aspetto", icon: Palette, title: "Aspetto", desc: "Tema, colori e visualizzazione" },
  { to: "/app/impostazioni/accessibilita", icon: Accessibility, title: "Accessibilità", desc: "Testo, contrasto e movimento" },
  { to: "/app/impostazioni/termini", icon: FileText, title: "Termini e condizioni", desc: "Termini di servizio e privacy" },
];

export default function SettingsIndex() {
  const { triggerLight } = useHaptics();
  const location = useLocation();

  return (
    <SettingsPage>
      <SeoHead
        title="Impostazioni — Erga"
        description="Gestisci account, aspetto, accessibilità, lingua e termini di Erga."
        path="/app/impostazioni"
        noindex
      />
      <SettingsHeader title="Impostazioni" subtitle="Gestisci il tuo account e l'app" />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 pb-32 sm:px-6 md:max-w-2xl lg:max-w-4xl">
        <RoomClarify screenKey="impostazioni" className="flex flex-col gap-6">
        {/* Il piano in grande, come le card dei corsi (decisione del
            proprietario: niente piano nella barra di stato). */}
        <SettingsPlanCard />
        {ITEMS.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={{ pathname: to, search: location.search }}
            onClick={() => triggerLight()}
            className="erga-list-item flex min-h-14 items-center gap-4 rounded-[24px] p-5 text-left active:scale-[0.98] motion-reduce:transform-none"
          >
            <div className="erga-list-item-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-button">
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="title-medium text-foreground">{title}</p>
              <p className="body-small text-muted-foreground truncate">{desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
        </RoomClarify>
      </main>
    </SettingsPage>
  );
}