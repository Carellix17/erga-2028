import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanSlot, type PlanSlotData } from "@/components/piano/PlanSlot";

const slot = (overrides: Partial<PlanSlotData> = {}): PlanSlotData => ({
  id: "slot",
  kind: "study",
  title: "Da Minilezione 1 a 7",
  subject: "Biologia",
  startTime: "15:00",
  endTime: "16:58",
  durationMinutes: 98,
  lessonFrom: 0,
  lessonTo: 6,
  status: "planned",
  ...overrides,
});

afterEach(cleanup);

function renderSlots(slots: PlanSlotData[]) {
  return render(<ol aria-label="Timeline" role="list">{slots.map((item) => <PlanSlot key={item.id} slot={item} />)}</ol>);
}

describe("PlanSlot: identità, nome accessibile e stati", () => {
  it("distingue i sei tipi con icona, parola, forma e nome accessibile completo", () => {
    renderSlots([
      slot(),
      slot({ id: "test", kind: "evaluation", title: "Verifica di storia", subject: "Storia", startTime: "09:00", endTime: "10:00", durationMinutes: 60, lessonFrom: null, lessonTo: null }),
      slot({ id: "assignment", kind: "assignment", title: "Esercizi sui limiti", subject: "Matematica", startTime: "10:00", endTime: "10:30", durationMinutes: 30, lessonFrom: null, lessonTo: null }),
      slot({ id: "busy", kind: "busy", title: "Allenamento", subject: null, startTime: "18:00", endTime: "19:00", durationMinutes: 60, lessonFrom: null, lessonTo: null }),
      slot({ id: "pause", kind: "pause", title: null, subject: null, startTime: "15:42", endTime: "15:52", durationMinutes: 10, lessonFrom: null, lessonTo: null, pauseNumber: 1 }),
      slot({ id: "routine", kind: "routine", title: "Scuola", subject: null, startTime: "08:00", endTime: "13:30", durationMinutes: 330, lessonFrom: null, lessonTo: null, routineKind: "school", routineLabel: "Scuola" }),
    ]);

    const expected = [
      { name: /Studio, Biologia.*Minilezione 1 a 7.*15:00.*16:58.*stima 1 ora e 38.*Non iniziato/i, kind: "study", shape: "planner-slot--study" },
      { name: /Verifica, Storia, Verifica di storia.*09:00.*10:00/i, kind: "evaluation", shape: "planner-slot--evaluation" },
      { name: /Compito, Matematica, Esercizi sui limiti/i, kind: "assignment", shape: "planner-slot--assignment" },
      { name: /Altro, Allenamento.*18:00.*19:00/i, kind: "busy", shape: "planner-slot--busy" },
      { name: /Pausa 1.*15:42.*15:52.*10 minuti/i, kind: "pause", shape: "planner-slot--pause" },
      { name: /Routine, Scuola.*08:00.*13:30.*sola lettura/i, kind: "routine", shape: "planner-slot--routine" },
    ];

    for (const item of expected) {
      const listItem = screen.getByRole("listitem", { name: item.name });
      expect(listItem).toHaveAttribute("data-slot-kind", item.kind);
      expect(listItem).toHaveClass(item.shape);
      expect(listItem.querySelector(`[data-slot-icon="${item.kind}"] svg`)).not.toBeNull();
    }
    const routine = screen.getByRole("listitem", { name: /Routine, Scuola/ });
    expect(routine.querySelectorAll("[data-slot-icon='routine'] svg")).toHaveLength(2);
    expect(screen.getByText("Studio")).toBeVisible();
    expect(screen.getByText("Verifica")).toBeVisible();
    expect(screen.getByText("Compito")).toBeVisible();
    expect(screen.getByText("Altro")).toBeVisible();
    expect(screen.getByText("Pausa 1")).toBeVisible();
    expect(screen.getByText("Routine")).toBeVisible();
  });

  it("mantiene almeno 44px anche per un evento di cinque minuti", () => {
    render(<ol role="list"><PlanSlot slot={slot({
      id: "tiny", title: "Ripasso flash", startTime: "15:00", endTime: "15:05", durationMinutes: 5,
      lessonFrom: null, lessonTo: null,
    })} style={{ top: 0, height: 8, left: "0%", width: "100%" }} /></ol>);

    expect(screen.getByRole("listitem")).toHaveStyle({ height: "44px" });
  });

  it("mostra Fatto senza barrrare il titolo e usa icona più parola per gli altri stati", () => {
    renderSlots([
      slot({ id: "done", status: "done", title: "Da Minilezione 1 a 7" }),
      slot({ id: "skipped", status: "skipped", title: "Recupero" }),
      slot({ id: "partial", status: "partial", title: "Da Minilezione 1 a 7" }),
    ]);

    const done = screen.getByRole("listitem", { name: /Studio.*Fatto/i });
    expect(done).toHaveAttribute("data-slot-state", "done");
    expect(done.querySelector(".planner-slot-title")).not.toHaveClass("line-through");
    expect(done.querySelector('[data-status="done"] svg')).not.toBeNull();
    expect(screen.getByRole("listitem", { name: /Saltato/i }).querySelector('[data-status="skipped"] svg')).not.toBeNull();
    expect(screen.getByRole("listitem", { name: /Parziale/i }).querySelector('[data-status="partial"] svg')).not.toBeNull();
  });

  it("include il conteggio parziale e l'origine di uno slot spostato", () => {
    render(<ol role="list"><PlanSlot slot={slot({
      id: "moved-partial", status: "partial", moveCount: 1,
      originalDate: "2026-11-01", originalTime: "14:00",
    })} partialProgress={{ done: 3, total: 7 }} /></ol>);

    const item = screen.getByRole("listitem", { name: /Parziale.*3 di 7 fatte.*Spostata da 1 nov 14:00/i });
    expect(within(item).getByText("3 di 7 fatte")).toBeVisible();
    expect(within(item).getByText("Spostata da 1 nov 14:00")).toBeVisible();
  });

  it("lascia Modifica ed Elimina sugli eventi ma nessuna azione nello slot di routine", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ol role="list">
      <PlanSlot slot={slot({ id: "manual", title: "Ripasso" })} onEdit={onEdit} onDelete={onDelete} />
      <PlanSlot slot={slot({ id: "school", kind: "routine", title: "Scuola", subject: null, routineKind: "school", routineLabel: "Scuola" })} />
    </ol>);

    const event = screen.getByRole("listitem", { name: /Studio, Biologia, Ripasso/i });
    expect(within(event).getByRole("button", { name: "Modifica Ripasso" })).toBeVisible();
    expect(within(event).getByRole("button", { name: "Elimina Ripasso" })).toBeVisible();
    fireEvent.click(within(event).getByRole("button", { name: "Modifica Ripasso" }));
    fireEvent.click(within(event).getByRole("button", { name: "Elimina Ripasso" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    const routine = screen.getByRole("listitem", { name: /Routine, Scuola/ });
    expect(within(routine).queryByRole("button")).not.toBeInTheDocument();
  });
});
