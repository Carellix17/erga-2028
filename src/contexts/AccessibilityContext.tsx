import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type TextScale = "normal" | "lg" | "xl";

export interface A11ySettings {
  textScale: TextScale;
  highContrast: boolean;
  reduceMotion: boolean;
  ttsEnabled: boolean;
}

const STORAGE_KEY = "erga-a11y";

const DEFAULTS: A11ySettings = {
  textScale: "normal",
  highContrast: false,
  reduceMotion: false,
  ttsEnabled: true,
};

export function readA11ySettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11ySettings>) };
  } catch {
    return DEFAULTS;
  }
}

interface A11yContextValue {
  settings: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
}

const AccessibilityContext = createContext<A11yContextValue>({
  settings: DEFAULTS,
  update: () => {},
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(() => readA11ySettings());

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("text-scale-normal", "text-scale-lg", "text-scale-xl");
    root.classList.add(`text-scale-${settings.textScale}`);
    root.classList.toggle("high-contrast", settings.highContrast);
    root.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings]);

  const update = useCallback((patch: Partial<A11ySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage non disponibile */
      }
      return next;
    });
  }, []);

  return (
    <AccessibilityContext.Provider value={{ settings, update }}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}