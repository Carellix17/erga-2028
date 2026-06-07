import React, { createContext, useContext, useEffect } from "react";
import { useUserData } from "@/hooks/useUserData";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (next: Theme | ((prev: Theme) => Theme)) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: theme, updateData: setTheme, isLoaded } = useUserData<Theme>(
    "theme",
    "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#15121E" : "#6D4FE8");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}