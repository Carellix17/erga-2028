import { FileUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import { SubscriptionBadge } from "@/components/subscription/SubscriptionBadge";
import { SubscriptionSheet } from "@/components/subscription/SubscriptionSheet";
import { useSubscription } from "@/hooks/useSubscription";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  const [showSubscription, setShowSubscription] = useState(false);
  const { tier } = useSubscription();

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-[56px] px-4 sm:px-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5">
            <SubscriptionBadge tier={tier} onClick={() => setShowSubscription(true)} />
            <span className="font-display font-extrabold text-[20px] text-foreground tracking-tight">
              Erga
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={hasFiles ? "tonal" : "default"}
              size="sm"
              onClick={onUploadClick}
              className="gap-1.5 h-9 px-4"
            >
              <FileUp className="w-4 h-4" />
              {hasFiles ? "File" : "Carica"}
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
