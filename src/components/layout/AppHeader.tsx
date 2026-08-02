import { FileUp } from"lucide-react";
import { useState } from"react";
import { Button } from"@/components/ui/button";
import { UserMenu } from"./UserMenu";
import { SubscriptionBadge } from"@/components/subscription/SubscriptionBadge";
import { SubscriptionSheet } from"@/components/subscription/SubscriptionSheet";
import { useSubscription } from"@/hooks/useSubscription";
import { SaveStatusIndicator, SaveStatusDot } from"./SaveStatusIndicator";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { FocusPill } from "@/components/focus/FocusPill";
import { useFocus } from "@/contexts/FocusContext";

interface AppHeaderProps {
 onUploadClick: () => void;
 hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
 const [showSubscription, setShowSubscription] = useState(false);
 const { tier } = useSubscription();
 const { t } = useTranslation();
  const { isActive: focusActive } = useFocus();

 return (
 <>
 <header className="sticky top-0 z-40 bg-background border-b border-outline-variant/60 transition-all duration-300 ease-in-out">
 <div className="flex items-center justify-between h-16 px-4 sm:px-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
 <div className="flex items-center gap-3 animate-fade-up">
 <SubscriptionBadge tier={tier} onClick={() => setShowSubscription(true)} />
 <div>
 <span className="font-display font-bold text-xl text-foreground tracking-tight">
 Erga
 </span>
 </div>
 <SaveStatusIndicator />
 <SaveStatusDot />
 </div>
 
 <div className="flex items-center gap-2.5">
      {focusActive ? <FocusPill /> : <LanguageSwitcher variant="dark" />}
 <Button
 variant={hasFiles ?"tonal" :"default"}
 size="sm"
 onClick={onUploadClick}
 className="gap-2"
 >
 <FileUp className="w-4 h-4" />
 {hasFiles ? t("header.files") : t("header.upload")}
 </Button>
 <UserMenu />
 </div>
 </div>
 </header>

 <SubscriptionSheet
 open={showSubscription}
 onOpenChange={setShowSubscription}
 currentTier={tier}
 />
 </>
 );
}
