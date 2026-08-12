import { Brain, FileUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import { SaveStatusIndicator } from "./SaveStatusIndicator";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { FocusPill } from "@/components/focus/FocusPill";
import { useFocus } from "@/contexts/FocusContext";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

// Testata alleggerita: [logo pillola] · [stato quasi invisibile]
//                            [azione contestuale] · [profilo]
// Il badge abbonamento e le impostazioni vivono nel menu profilo (UserMenu).
// Regola P23a intonsa: sotto i 400px il bottone File resta icona (aria-label).
export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  const { t } = useTranslation();
  const { isActive: focusActive } = useFocus();

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border shadow-level-1 transition-all duration-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            to="/app"
            aria-label="Erga — home"
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-2.5 pr-4 h-10 shadow-level-1 shrink-0"
          >
            <span className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
            <span className="font-bold text-[15px] tracking-tight">Erga</span>
          </Link>
          <SaveStatusIndicator />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {focusActive ? <FocusPill /> : <LanguageSwitcher />}
          <Button
            variant="default"
            size="sm"
            onClick={onUploadClick}
            aria-label={hasFiles ? t("header.files") : t("header.upload")}
            className="gap-2"
          >
            <FileUp className="w-4 h-4" />
            <span className="hidden min-[400px]:inline">{hasFiles ? t("header.files") : t("header.upload")}</span>
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
