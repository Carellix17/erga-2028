import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { normalizeAccentColor, useSubjectAccent, SUBJECT_ACCENT_FALLBACK } from "@/hooks/useSubjectAccent";

// 🌲 P24 — collaudo dell'accento dinamico per materia:
// l'hook imposta --subject-accent sul root e lo ripristina allo smontaggio.
function Probe({ color }: { color?: string | null }) {
  useSubjectAccent(color);
  return null;
}

const rootVar = () =>
  document.documentElement.style.getPropertyValue("--subject-accent");

describe("normalizeAccentColor", () => {
  it("accetta HEX, hsl() e tuple grezze; rifiuta vuoti", () => {
    expect(normalizeAccentColor("#f59e0b")).toBe("#f59e0b");
    expect(normalizeAccentColor("hsl(18 45% 45%)")).toBe("hsl(18 45% 45%)");
    expect(normalizeAccentColor("18 45% 45%")).toBe("hsl(18 45% 45%)");
    expect(normalizeAccentColor("  ")).toBeNull();
    expect(normalizeAccentColor(null)).toBeNull();
    expect(normalizeAccentColor(undefined)).toBeNull();
  });
});

describe("useSubjectAccent", () => {
  it("imposta la variabile sul root con il colore della materia", () => {
    render(<Probe color={"18 45% 45%"} />);
    expect(rootVar()).toBe("hsl(18 45% 45%)");
  });

  it("cambia all'istante quando la materia cambia", () => {
    const { rerender } = render(<Probe color={"210 36% 42%"} />);
    expect(rootVar()).toBe("hsl(210 36% 42%)");
    rerender(<Probe color={"38 55% 36%"} />);
    expect(rootVar()).toBe("hsl(38 55% 36%)");
  });

  it("ripristina il fallback neutro quando si esce dalla materia", () => {
    const { unmount } = render(<Probe color={"18 45% 45%"} />);
    expect(rootVar()).toBe("hsl(18 45% 45%)");
    unmount();
    expect(rootVar()).not.toBe("hsl(18 45% 45%)");
  });

  it("espone il fallback ambra", () => {
    expect(SUBJECT_ACCENT_FALLBACK).toBe("#f59e0b");
  });
});
