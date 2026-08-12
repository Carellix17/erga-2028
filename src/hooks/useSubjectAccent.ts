import { useEffect, useRef } from "react";
import { getAccentForeground } from "@/lib/subjectColors";

/**
 * P24 × ACCENTO MATERIA — hook che collega il colore della materia
 * corrente alla variabile CSS `--subject-accent` (e derivata `-light`).
 *
 * - Accetta HEX (#f59e0b), HSL "hsl(18 45% 45%)" o tuple grezze "18 45% 45%".
 * - Imposta le variabili sul nodo radice (document.documentElement): tutta
 *   l'interfaccia che usa `--subject-accent` (badge, barre di progresso,
 *   nodi del percorso e callout) si ricolora all'istante.
 * - Al cambio materia l'accento segue; allo smontaggio (o con color null)
 *   ripristina i valori precedenti → le schermate generali (Home/Profilo)
 *   tornano al fallback ambra ad alto contrasto.
 * - Nessuna classe dinamica concatenata: solo CSS custom properties.
 */

const FALLBACK = "#f59e0b";

/** Normalizza un colore in una stringa CSS valida (HEX o hsl()). */
export function normalizeAccentColor(color?: string | null): string | null {
  if (!color) return null;
  const c = color.trim();
  if (!c) return null;
  // già in formato CSS (hex o hsl(...))
  if (c.startsWith("#") || c.toLowerCase().startsWith("hsl")) return c;
  // tupla HSL grezza "18 45% 45%" → hsl(18 45% 45%)
  if (/^\d/.test(c)) {
    return `hsl(${c})`;
  }
  return null;
}

export function useSubjectAccent(color?: string | null) {
  const previous = useRef<{
    accent: string | null;
    light: string | null;
    foreground: string | null;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;

    if (previous.current === null) {
      // salva i valori correnti (fallback CSS o accento di un padre)
      previous.current = {
        accent: root.style.getPropertyValue("--subject-accent") || null,
        light: root.style.getPropertyValue("--subject-accent-light") || null,
        foreground: root.style.getPropertyValue("--subject-accent-foreground") || null,
      };
    }

    const normalized = normalizeAccentColor(color);
    if (normalized) {
      root.style.setProperty("--subject-accent", normalized);
      root.style.setProperty("--subject-accent-foreground", getAccentForeground(normalized));
      // variabile derivata per le tinte morbide (bg/10, border/30…)
      root.style.setProperty(
        "--subject-accent-light",
        `color-mix(in srgb, ${normalized} 28%, white)`
      );
    } else {
      // nessuna materia: ripristina i valori precedenti (o fallback CSS)
      const prev = previous.current;
      if (prev?.accent) root.style.setProperty("--subject-accent", prev.accent);
      else root.style.removeProperty("--subject-accent");
      if (prev?.light) root.style.setProperty("--subject-accent-light", prev.light);
      else root.style.removeProperty("--subject-accent-light");
      if (prev?.foreground) root.style.setProperty("--subject-accent-foreground", prev.foreground);
      else root.style.removeProperty("--subject-accent-foreground");
    }
  }, [color]);

  // al montaggio del componente, se il colore è assente imposta il fallback
  useEffect(() => {
    if (!color) {
      document.documentElement.style.setProperty("--subject-accent", FALLBACK);
      document.documentElement.style.setProperty(
        "--subject-accent-foreground",
        getAccentForeground(FALLBACK)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // allo smontaggio: ripristina sempre i valori precedenti
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      const prev = previous.current;
      if (prev?.accent) root.style.setProperty("--subject-accent", prev.accent);
      else root.style.removeProperty("--subject-accent");
      if (prev?.light) root.style.setProperty("--subject-accent-light", prev.light);
      else root.style.removeProperty("--subject-accent-light");
      if (prev?.foreground) root.style.setProperty("--subject-accent-foreground", prev.foreground);
      else root.style.removeProperty("--subject-accent-foreground");
    };
  }, []);
}

export { FALLBACK as SUBJECT_ACCENT_FALLBACK };
