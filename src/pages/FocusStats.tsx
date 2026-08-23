import { useTranslation } from "react-i18next";
import { FocusStatsDashboard } from "@/components/focus/FocusStatsDashboard";
import { AppHeader } from "@/components/layout/AppHeader";

/**
 * THESIS: il ritmo di studio si legge come un registro personale, non come un gioco.
 * OWN-WORLD: superfici opache monocrome Erga, filetti leggeri e numeri tabulari.
 * STORY: dalla serie centrale ai minuti reali, lo studente capisce continuità e andamento.
 * FIRST VIEWPORT: la fiamma lineare contiene il dato di serie al centro; sotto, il registro di oggi.
 * FORM: estensione mirata della Home esistente, con dashboard dati al posto dei vecchi blocchi.
 */
export default function FocusStats() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background bg-dot-grid">
      <AppHeader title={t("focusStats.title")} subtitle={t("focusStats.subtitle")} showBack />
      <FocusStatsDashboard />
    </div>
  );
}
