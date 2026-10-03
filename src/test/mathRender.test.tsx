import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText } from "../components/studio/MathText";
import { LessonMarkdown } from "../components/studio/LessonMarkdown";

// 🧭 PERCORSI 2.0 — le formule impaginate come sul libro (KaTeX).
// Regola d'oro: chi non ha formule non cambia di una virgola.

describe("🧭 MathText — righe di testo (domande, opzioni)", () => {
  it("testo senza $ resta testo semplice, niente KaTeX", () => {
    const { container, getByText } = render(<MathText text="La parabola ha un vertice" />);
    expect(getByText("La parabola ha un vertice")).toBeTruthy();
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("testo nullo o vuoto non rompe", () => {
    const { container } = render(<MathText text={null} />);
    expect(container.textContent).toBe("");
  });

  it("la formula inline $…$ viene impaginata da KaTeX", () => {
    const { container } = render(<MathText text={String.raw`Il vertice di $y = x^2$ è nell'origine`} />);
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("la formula display ($$ su righe proprie) viene impaginata in blocco", () => {
    const { container } = render(
      <MathText text={String.raw`$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$`} />,
    );
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });
});

describe("🧭 LessonMarkdown — il motore unico delle lezioni", () => {
  it("Markdown classico: grassetti, elenchi e tabelle restano intatti", () => {
    const { container, getByText } = render(
      <LessonMarkdown>{"Un **termine chiave** e un elenco:\n\n- primo\n- secondo"}</LessonMarkdown>,
    );
    expect(getByText("termine chiave").tagName).toBe("STRONG");
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("formula display ($$ su righe proprie) dentro una slide", () => {
    const { container } = render(
      <LessonMarkdown>{String.raw`La formula chiave:

$$
E_k = \frac{1}{2}mv^2
$$

e il testo continua.`}</LessonMarkdown>,
    );
    expect(container.querySelector(".katex-display")).not.toBeNull();
    expect(container.textContent).toContain("e il testo continua");
  });

  it("LaTeX imperfetto NON rompe la pagina: il testo dopo resta leggibile", () => {
    const { container } = render(
      <LessonMarkdown>{String.raw`Formula rotta: $$\frac{$$ …e il resto della lezione continua.`}</LessonMarkdown>,
    );
    expect(container.textContent).toContain("e il resto della lezione continua");
  });

  it("chi non ha formule non cambia: nessun elemento KaTeX", () => {
    const { container } = render(<LessonMarkdown>{"Solo prosa, come sempre."}</LessonMarkdown>);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("Solo prosa");
  });
});
