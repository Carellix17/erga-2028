import { useEffect } from "react";
import { triggerHaptic, type HapticType } from "@/utils/haptics";

/** One shared listener also covers custom controls and portalled Radix panels. */
export function InteractionFeedback() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest<HTMLElement>(
        'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], input[type="checkbox"], input[type="radio"]',
      );
      if (!control || control.closest('[data-haptic="off"], [aria-disabled="true"], :disabled')) return;
      const intent = control.dataset.haptic;
      const kind: HapticType = intent === "medium" || intent === "success" || intent === "warning" || intent === "error" ? intent : "light";
      triggerHaptic(kind);
    };
    const handleChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement && !event.target.disabled) triggerHaptic("light");
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("change", handleChange);
    };
  }, []);
  return null;
}
