import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangePreview } from "@/components/piano/ChangePreview";
import type { PlanChange } from "@/lib/planner/types";

function insert(index: number): PlanChange {
  return {
    op: "insert",
    after: {
      event_date: `2026-11-0${index + 3}`,
      event_time: "15:00",
      end_time: "15:45",
      context_id: null,
      lesson_from: null,
      lesson_to: null,
      evaluation_id: "evaluation-1",
      source: "auto",
      subject: "Fisica",
      title: `Ripasso ${index + 1}`,
    },
  };
}

afterEach(cleanup);

describe("ChangePreview", () => {
  it("shows before/after text, announces the proposal, and applies only the selected changes", async () => {
    const changes = [insert(0), insert(1), insert(2)];
    const onApply = vi.fn();
    render(
      <ChangePreview
        open
        onOpenChange={vi.fn()}
        changes={changes}
        warnings={[]}
        evaluations={[{ id: "evaluation-1", title: "Verifica di Fisica", subject: "Fisica" }]}
        onApply={onApply}
        onModify={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Anteprima delle modifiche" })).toBeVisible();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("Anteprima delle modifiche"));
    expect(screen.getByRole("status")).toHaveTextContent("Proposta pronta: 3 modifiche");
    expect(screen.getAllByText("Prima:")).toHaveLength(3);
    expect(screen.getAllByText(/Nessuno slot/)).toHaveLength(3);
    expect(screen.getByText(/Ripasso 1 · martedì 3 novembre · 15:00/)).toBeVisible();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0]).toHaveClass("h-11", "w-11");
    fireEvent.click(checkboxes[1]);

    const applyButton = screen.getByRole("button", { name: "Applica 2 modifiche" });
    expect(applyButton).toBeEnabled();
    fireEvent.click(applyButton);
    expect(onApply).toHaveBeenCalledWith([changes[0], changes[2]]);
  });

  it("explains warnings and passes the warning-ready proposal without injecting markup", () => {
    const htmlLikeTitle = "<img src=x onerror=alert(1)>";
    const unsafeChange = insert(0);
    if (unsafeChange.op === "insert") unsafeChange.after.title = htmlLikeTitle;
    render(
      <ChangePreview
        open
        onOpenChange={vi.fn()}
        changes={[unsafeChange]}
        warnings={[{ evaluationId: "evaluation-1", missingMinutes: 35 }]}
        evaluations={[{ id: "evaluation-1", title: htmlLikeTitle, subject: "Fisica" }]}
        onApply={vi.fn()}
        onModify={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Piano parziale" })).toBeVisible();
    expect(screen.getByText("Fisica: restano 35 minuti da pianificare.")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
  });
});
