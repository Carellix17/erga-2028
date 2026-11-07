import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProLabel } from "@/components/piano/ProLabel";

export interface ProExplainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProExplainer({ open, onOpenChange }: ProExplainerProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto pb-safe">
        <SheetHeader className="mb-5 pr-10 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>{t("piano.pro.explainer.title")}</SheetTitle>
            <ProLabel />
          </div>
          <SheetDescription>{t("piano.pro.explainer.description")}</SheetDescription>
        </SheetHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="space-y-2 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("piano.pro.explainer.speedTitle")}</h3>
              <ProLabel />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("piano.pro.explainer.speedDescription")}
            </p>
          </section>

          <section className="space-y-2 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("piano.pro.explainer.pomodoroTitle")}</h3>
              <ProLabel />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("piano.pro.explainer.pomodoroDescription")}
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
