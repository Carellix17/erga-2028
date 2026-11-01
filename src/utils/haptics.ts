export type HapticType = "light" | "medium" | "success" | "warning" | "error";
export type HapticPattern = number | number[];
export type HapticPreference = "off" | "subtle" | "standard" | "strong";

const STORAGE_KEY = "erga-haptics";
const PATTERNS: Record<Exclude<HapticPreference, "off">, Record<HapticType, HapticPattern>> = {
  subtle: { light: 10, medium: 20, success: [16, 45, 24], warning: [24, 55, 24], error: [32, 55, 32] },
  standard: { light: 20, medium: 36, success: [24, 50, 40], warning: [36, 65, 36], error: [48, 65, 48] },
  strong: { light: 30, medium: 50, success: [36, 55, 55], warning: [50, 70, 50], error: [65, 70, 65] },
};
const PRIORITY: Record<HapticType, number> = { light: 0, medium: 1, success: 2, warning: 2, error: 3 };
let fallbackPreference: HapticPreference = "standard";
let lastPulse = -Infinity;
let lastPriority = -1;

export function supportsHaptics(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function readHapticPreference(): HapticPreference {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "off" || value === "subtle" || value === "standard" || value === "strong") return value;
    return "standard";
  } catch { return fallbackPreference; }
}

export function setHapticPreference(value: HapticPreference): void {
  fallbackPreference = value;
  try { window.localStorage.setItem(STORAGE_KEY, value); } catch { /* Keep UI working. */ }
}

/** Web vibration controls timing, not the motor's physical amplitude. */
export function getHapticPattern(type: HapticType, preference = readHapticPreference()): HapticPattern {
  const pattern = PATTERNS[preference === "off" ? "standard" : preference][type];
  return Array.isArray(pattern) ? [...pattern] : pattern;
}

export function triggerHaptic(type: HapticType = "light"): boolean {
  if (!supportsHaptics() || readHapticPreference() === "off") return false;
  // A component's semantic feedback runs before the delegated click feedback.
  // Keep the meaningful pulse and avoid buzzing twice for the same gesture.
  const now = performance.now();
  if (now - lastPulse < 80 && PRIORITY[type] <= lastPriority) return false;
  try {
    const accepted = navigator.vibrate(getHapticPattern(type));
    if (accepted) { lastPulse = now; lastPriority = PRIORITY[type]; }
    return accepted;
  } catch { return false; }
}
