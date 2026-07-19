import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PlanItem } from "@/components/piano/PlanItem";
import { resolveSubjectColor } from "@/lib/subjectColors";

const item = {
  id: "1",
  subject: "Matematica",
  title: "Ripassa le derivate",
  date: "20 lug",
  time: "15:00",
  type: "study" as const,
};

describe("PlanItem", () => {
  it("mostra il tipo e il colore della materia", () => {
    const col = resolveSubjectColor("Matematica");
    const { container } = render(<PlanItem item={item} subjectColor={col} />);
    expect(screen.getByText("Studio")).toBeTruthy();
    const subjBadge = screen.getByText("Matematica");
    expect(subjBadge.className).toContain(col.badge);
    // bordo sinistro colorato
    expect(container.firstElementChild?.className).toContain(col.border);
  });

  it("senza colore usa il fallback neutro ma non si rompe", () => {
    render(<PlanItem item={item} />);
    expect(screen.getByText("Matematica")).toBeTruthy();
    expect(screen.getByText("Ripassa le derivate")).toBeTruthy();
  });

  it("l'etichetta del tipo non si confonde con la materia", () => {
    render(<PlanItem item={{ ...item, type: "test", subject: "Storia" }} />);
    expect(screen.getByText("Verifica")).toBeTruthy();
    expect(screen.getByText("Storia")).toBeTruthy();
  });

  it("il click richiama onClick", () => {
    const onClick = vi.fn();
    render(<PlanItem item={item} onClick={onClick} />);
    fireEvent.click(screen.getByText("Ripassa le derivate"));
    expect(onClick).toHaveBeenCalled();
  });
});
