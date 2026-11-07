import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "erga-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: "light" | "dark";
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  resolved: "dark",
  isLoaded: true,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved] = useState<"light" | "dark">("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  const apply = useCallback(() => {
    document.documentElement.classList.add("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#0a0a0a");
  }, []);

  useEffect(() => {
    apply();
    setIsLoaded(true);
  }, [apply]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, "dark");
    } catch {
      /* storage non disponibile */
    }
    void t;
    setThemeState("dark");
    apply();
  }, [apply]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved, isLoaded }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}