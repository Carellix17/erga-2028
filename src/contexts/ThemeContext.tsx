import React, { useEffect } from "react";

// L'app è light-only. Il provider si limita a garantire che la classe .dark
// non venga mai applicata e imposta il meta theme-color sul bianco della landing.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#FCFCFC");
  }, []);

  return <>{children}</>;
}

// Compat shim per eventuali consumer residui.
export function useTheme() {
  return { theme: "light" as const, setTheme: () => {}, isLoaded: true };
}