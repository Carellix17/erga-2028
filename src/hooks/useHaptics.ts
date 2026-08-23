import { useCallback, useMemo } from "react";

import { triggerHaptic, type HapticType } from "@/utils/haptics";

export function useHaptics() {
  const trigger = useCallback((type: HapticType) => triggerHaptic(type), []);
  const triggerLight = useCallback(() => triggerHaptic("light"), []);
  const triggerMedium = useCallback(() => triggerHaptic("medium"), []);
  const triggerSuccess = useCallback(() => triggerHaptic("success"), []);
  const triggerWarning = useCallback(() => triggerHaptic("warning"), []);
  const triggerError = useCallback(() => triggerHaptic("error"), []);

  return useMemo(
    () => ({
      trigger,
      triggerLight,
      triggerMedium,
      triggerSuccess,
      triggerWarning,
      triggerError,
    }),
    [trigger, triggerError, triggerLight, triggerMedium, triggerSuccess, triggerWarning],
  );
}
