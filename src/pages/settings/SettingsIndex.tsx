import { Link } from "react-router-dom";
import { User, Palette, Accessibility, FileText, ChevronRight } from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";

const ITEMS = [
  { to: "/app/impostazioni/account", icon: User, title: "Account", desc: "Modifica i tuoi dati personali" },
  { to: "/app/impostazioni/aspetto", icon: Palette, title: "Aspetto", desc: "Tema, colori e visualizzazione" },
  { to: "/app/impostazioni/accessibilita", icon: Accessibility, title: "Accessibilità", desc: "Testo, contrasto e movimento" },
  { to: "/app/impostazioni/termini", icon: FileText, title: "Termini e condizioni", desc: "Termini di servizio e privacy" },
];

export default function SettingsIndex() {
  return (
    <SettingsPage>
      <SettingsHeader title="Impostazioni" subtitle="Gestisci il tuo account e l'app" />
      <main className="px-4 sm:px-6 py-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-3 animate-fade-up">
        {ITEMS.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-2xl glass-1 p-4 transition-all duration-300 ease-m3-emphasized glass-hover active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="title-medium text-foreground">{title}</p>
              <p className="body-small text-muted-foreground truncate">{desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </main>
    </SettingsPage>
  );
}