import { describe, it, expect } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { LessonWidget } from "../components/studio/widgets/LessonWidget";
import { LessonMarkdown } from "../components/studio/LessonMarkdown";
import { sanitizeWidgetSpec } from "../lib/widgets";

// 🎛️ PERCORSI 2.0 — collaudo dei widget: ognuno monta, mostra i cursori
// previsti e risponde. Nessun widget può crashare la slide.

const spec = (raw: Record<string, unknown>) =>
  sanitizeWidgetSpec(raw) ?? { type: "parabola" as const, params: {} };

describe("🎛️ ogni widget monta coi suoi cursori", () => {
  it("parabola: 3 cursori + vertice e delta", () => {
    const { container, getAllByRole } = render(<LessonWidget spec={spec({ type: "parabola", a: 1, b: 0, c: -3 })} />);
    expect(getAllByRole("slider")).toHaveLength(3);
    expect(container.textContent).toContain("vertice");
    expect(container.textContent).toContain("Δ");
  });

  it("retta: 2 cursori + intercetta", () => {
    const { getAllByRole, container } = render(<LessonWidget spec={spec({ type: "retta", m: 2, q: 1 })} />);
    expect(getAllByRole("slider")).toHaveLength(2);
    expect(container.textContent).toContain("intercetta");
  });

  it("proiettile: gittata, altezza e tempo", () => {
    const { container } = render(<LessonWidget spec={spec({ type: "proiettile", v0: 20, angolo: 45 })} />);
    expect(container.textContent).toContain("gittata");
    expect(container.textContent).toContain("tempo");
  });

  it("piano inclinato: peso, attrito, accelerazione", () => {
    const { container } = render(<LessonWidget spec={spec({ type: "piano-inclinato", angolo: 30, massa: 5, attrito: 0.2 })} />);
    expect(container.textContent).toContain("peso");
    expect(container.textContent).toContain("attrito");
    expect(container.textContent).toContain("accelerazione");
  });

  it("pH: concentrazione e classificazione", () => {
    const { container } = render(<LessonWidget spec={spec({ type: "ph", ph: 4.5 })} />);
    expect(container.textContent).toContain("[H⁺]");
    expect(container.textContent).toContain("acido");
  });

  it("gas: pressione e formula", () => {
    const { container } = render(<LessonWidget spec={spec({ type: "gas", n: 1, T: 300, V: 10 })} />);
    expect(container.textContent).toContain("pressione");
    expect(container.textContent).toContain("nRT");
  });

  it("mercato: prezzo e quantità di equilibrio", () => {
    const { container } = render(<LessonWidget spec={spec({ type: "mercato", domanda: 12, offerta: 4 })} />);
    expect(container.textContent).toContain("prezzo eq");
    expect(container.textContent).toContain("quantità eq");
  });
});

describe("🎛️ i widget rispondono ai comandi", () => {
  it("parabola: muovere il cursore 'a' cambia i dati in diretta", () => {
    const { container, getByLabelText } = render(
      <LessonWidget spec={spec({ type: "parabola", a: 1, b: 0, c: -3 })} />,
    );
    const prima = container.textContent ?? "";
    expect(prima).toContain("12"); // Δ = b² − 4ac = 12, radici presenti
    fireEvent.change(getByLabelText(/a \(apertura\)/i), { target: { value: "-2" } });
    const dopo = container.textContent ?? "";
    expect(dopo).not.toEqual(prima);
    expect(dopo).toContain("-24"); // Δ = −4·(−2)·(−3) = −24
    expect(dopo).not.toContain("radici"); // Δ negativo: niente radici reali
  });

  it("esecutore di codice: 'Esegui' produce l'output del programma", async () => {
    const { getByRole, getByLabelText } = render(
      <LessonWidget spec={spec({ type: "codice", code: 'console.log("Ciao da Erga!");' })} />,
    );
    fireEvent.click(getByRole("button", { name: /esegui/i }));
    await waitFor(() => {
      expect(getByLabelText(/codice da eseguire/i)).toBeTruthy();
    });
    const out = document.body.textContent ?? "";
    await waitFor(() => expect(out).toContain("Ciao da Erga!"));
  });
});

describe("🎛️ l'innesto nel Markdown delle slide", () => {
  const widgetBlock = [
    "Prima del widget.",
    "",
    "```widget",
    '{"type": "parabola", "a": 2, "b": 0, "c": -1, "caption": "Prova tu"}',
    "```",
    "",
    "Dopo il widget.",
  ].join("\n");

  it("il blocco ```widget diventa la simulazione (cursori presenti)", () => {
    const { container, getByLabelText, getByText } = render(<LessonMarkdown>{widgetBlock}</LessonMarkdown>);
    expect(getByText("Prima del widget.")).toBeTruthy();
    expect(getByText("Dopo il widget.")).toBeTruthy();
    expect(getByLabelText(/a \(apertura\)/i)).toBeTruthy();
    expect(container.querySelector("pre")).toBeNull();
  });

  it("JSON rotto nel blocco widget → il blocco sparisce, il testo resta", () => {
    const rotto = ["Testo che resta.", "", "```widget", "{type: parabola ROTTO", "```"].join("\n");
    const { container, getByText } = render(<LessonMarkdown>{rotto}</LessonMarkdown>);
    expect(getByText("Testo che resta.")).toBeTruthy();
    expect(container.querySelectorAll("input[type='range']")).toHaveLength(0);
  });

  it("tipo sconosciuto → niente widget, nessun crash", () => {
    const ignoto = ["```widget", '{"type": "macchina del tempo"}', "```"].join("\n");
    const { container } = render(<LessonMarkdown>{ignoto}</LessonMarkdown>);
    expect(container.querySelectorAll("input[type='range']")).toHaveLength(0);
  });

  it("i normali blocchi di codice restano codice", () => {
    const codice = ["```js", "console.log(1);", "```"].join("\n");
    const { container } = render(<LessonMarkdown>{codice}</LessonMarkdown>);
    expect(container.querySelector("code.language-js")).not.toBeNull();
  });
});
