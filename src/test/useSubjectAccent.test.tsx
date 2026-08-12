import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { normalizeAccentColor, useSubjectAccent, SUBJECT_ACCENT_FALLBACK } from "@/hooks/useSubjectAccent";

// P24 — collaudo dell'accento dinamico per materia:
// l'hook imposta accento e contrasto sul root e li ripristina allo smontaggio.
function Probe({ color }: { color?: string | null }) {
  useSubjectAccent(color);
  return null;
}

const rootVar = () =>
  document.documentElement.style.getPropertyValue("--subject-accent");
const rootForegroundVar = () =>
  document.documentElement.style.getPropertyValue("--subject-accent-foreground");

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
  it("imposta accento e primo piano leggibile sul root", () => {
    render(<Probe color="#2563eb" />);
    expect(rootVar()).toBe("#2563eb");
    expect(rootForegroundVar()).toBe("#ffffff");
  });

  it("cambia all'istante quando la materia cambia", () => {
    const { rerender } = render(<Probe color={"210 36% 42%"} />);
    expect(rootVar()).toBe("hsl(210 36% 42%)");
    rerender(<Probe color={"38 55% 36%"} />);
    expect(rootVar()).toBe("hsl(38 55% 36%)");
  });

  it("ripristina accento e primo piano precedenti quando si esce dalla materia", () => {
    const root = document.documentElement;
    root.style.setProperty("--subject-accent", "#f59e0b");
    root.style.setProperty("--subject-accent-foreground", "#111111");

    const { unmount } = render(<Probe color="#2563eb" />);
    expect(rootVar()).toBe("#2563eb");
    expect(rootForegroundVar()).toBe("#ffffff");
    unmount();
    expect(rootVar()).toBe("#f59e0b");
    expect(rootForegroundVar()).toBe("#111111");

    root.style.removeProperty("--subject-accent");
    root.style.removeProperty("--subject-accent-foreground");
  });

  it("espone il fallback ambra", () => {
    expect(SUBJECT_ACCENT_FALLBACK).toBe("#f59e0b");
  });
});
