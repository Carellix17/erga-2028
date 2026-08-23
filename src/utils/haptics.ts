export type HapticType = "light" | "medium" | "success" | "warning" | "error";

export type HapticPattern = number | number[];

const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
  light: 10,
  medium: 25,
  success: [10, 40, 10],
  warning: [30, 50, 30],
  error: [30, 50, 30],
};

export function supportsHaptics(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

export function getHapticPattern(type: HapticType): HapticPattern {
  return HAPTIC_PATTERNS[type];
}

export function triggerHaptic(type: HapticType = "light"): boolean {
  if (!supportsHaptics()) return false;

  try {
    return navigator.vibrate(getHapticPattern(type));
  } catch {
    return false;
  }
}
