import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AddToHomeSource = "timer" | "settings";

interface AddToHomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: AddToHomeSource;
  onUseInAppAlerts?: () => void;
}

function recordHomeGuideShown(userId: string | null, source: AddToHomeSource): void {
  if (!userId) return;
  void (async () => {
    try {
      const { error } = await supabase.from("planner_events").insert({
        user_id: userId,
        name: "ios_a2hs_shown",
        props: { surface: source },
      });
      if (error) console.warn("Could not record iOS install guide event:", error.message);
    } catch (error) {
      console.warn("Could not record iOS install guide event:", error);
    }
  })();
}

export function AddToHomeSheet({
  open,
  onOpenChange,
  source,
  onUseInAppAlerts,
}: AddToHomeSheetProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const loggedOpenFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      loggedOpenFor.current = null;
      return;
    }
    const key = `${currentUser ?? ""}:${source}`;
    if (!currentUser || loggedOpenFor.current === key) return;
    loggedOpenFor.current = key;
    recordHomeGuideShown(currentUser, source);
  }, [currentUser, open, source]);

  const useInAppAlerts = () => {
    onUseInAppAlerts?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(85dvh,44rem)] overflow-y-auto rounded-t-dialog px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <SheetHeader className="mb-5 pr-10 text-left">
          <SheetTitle>{t("pushNotifications.addToHomeTitle")}</SheetTitle>
          <SheetDescription className="text-base leading-relaxed">
            {t("pushNotifications.addToHomeDescription")}
          </SheetDescription>
        </SheetHeader>

        <ol className="space-y-3" aria-label={t("pushNotifications.installStepsLabel")}>
          {["shareStep", "homeStep", "openStep"].map((step, index) => (
            <li key={step} className="flex items-start gap-3 border-t border-border py-3">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center border border-control-line text-base font-semibold tabular-nums"
              >
                {index + 1}
              </span>
              <p className="pt-1 text-base leading-relaxed text-foreground">
                {t(`pushNotifications.${step}`)}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          {t("pushNotifications.iosRequirement")}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button type="button" className="min-h-11 text-base" onClick={useInAppAlerts}>
            {t("pushNotifications.useInAppAlerts")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 text-base"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
