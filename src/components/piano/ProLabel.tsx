import type { HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function ProLabel({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  const { t } = useTranslation();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-cognitive px-2 py-0.5 text-sm font-medium leading-5 text-cognitive",
        className,
      )}
      {...props}
    >
      {t("piano.pro.label")}
    </span>
  );
}
