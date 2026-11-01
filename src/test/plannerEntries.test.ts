import { describe, expect, it } from "vitest";
import { plannerEntries, validEventTime } from "@/lib/plannerEntries";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import { resolveCourseCover } from "@/lib/courseIdentity";

const evaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: "exam", user_id: "demo", subject_id: "physics", type: "orale", title: "Interrogazione sul moto", description: null,
  date: "2026-11-05", topic_type: "free", topic_id: null, free_topic_title: null, goal: null, is_completed: false, created_at: "2026-11-01", ...overrides,
});
const subjects = [{ id: "physics", user_id: "demo", name: "Fisica", color: "fisica" }];

describe("planner data used by both month and day", () => {
  it("preserves real local times, distinguishing date-only and legacy noon records", () => {
    const entries = plannerEntries([
      evaluation(), evaluation({ id: "noon", date: new Date(2026, 10, 5, 12).toISOString() }),
      evaluation({ id: "timed", date: new Date(2026, 10, 5, 9, 30).toISOString() }),
    ], [], subjects);
    expect(entries.map((entry) => entry.time)).toEqual([undefined, undefined, "09:30"]);
    expect(entries[2].date.getDate()).toBe(5);
  });
  it("assigns a stable kind to evaluations and each study-event type", () => {
    const events: StudyEvent[] = [
      { id: "study", subject: "Fisica", title: "Ripasso", event_date: "2026-11-06", event_type: "study" },
      { id: "assignment", subject: "Fisica", title: "Esercizi", event_date: "2026-11-06", event_type: "assignment" },
      { id: "personal", subject: " aLtRo ", title: "Allenamento", event_date: "2026-11-06", event_type: "assignment" },
      { id: "test", subject: "Fisica", title: "Verifica", event_date: "2026-11-06", event_type: "test" },
    ];

    expect(plannerEntries([evaluation()], events, subjects).map(({ id, kind }) => [id, kind])).toEqual([
      ["exam", "evaluation"],
      ["study", "study"],
      ["assignment", "assignment"],
      ["personal", "personal"],
      ["test", "evaluation"],
    ]);
  });

  it("reuses the exact linked Studio cover, with a subject fallback", () => {
    const [linked] = plannerEntries([evaluation({ topic_type: "linked", topic_id: "course" })], [], subjects, [{ id: "course", file_name: "Fisica del moto.pdf" }]);
    const [fallback] = plannerEntries([evaluation()], [], subjects);
    expect(linked.coverName).toBe("Fisica del moto");
    expect(resolveCourseCover(linked.coverName, linked.customColor)).toEqual(resolveCourseCover("Fisica del moto"));
    expect(fallback.coverName).toBe("Fisica");
    expect(fallback.customColor).toBe("fisica");
  });
  it("keeps homework and completed records in the calendar while marking test candidates", () => {
    const entries = plannerEntries([evaluation(), evaluation({ id: "hw", type: "compito" }), evaluation({ id: "done", is_completed: true }), evaluation({ id: "bad", date: "bad" })], [], subjects);
    expect(entries).toHaveLength(3);
    expect(entries.filter((entry) => entry.important && !entry.completed).map((entry) => entry.id)).toEqual(["exam"]);
  });
  it("maps extended study-event fields and treats either completion marker as done", () => {
    const events: StudyEvent[] = [
      {
        id: "slot-done",
        subject: "Fisica",
        title: "Ripasso",
        event_date: "2026-11-06",
        event_time: "15:00",
        event_type: "study",
        status: "done",
        is_completed: false,
        end_time: "16:00",
        notes: "Capitolo 2",
        context_id: "context-id",
        lesson_from: 1,
        lesson_to: 2,
        source: "auto",
        move_count: 3,
        original_date: "2026-11-05",
        original_time: "14:00",
        locked: true,
        version: 4,
      },
      {
        id: "legacy-done",
        subject: "Fisica",
        title: "Esercizi",
        event_date: "2026-11-07",
        event_type: "study",
        status: "partial",
        is_completed: true,
      },
      {
        id: "not-done",
        subject: "Fisica",
        title: "Lettura",
        event_date: "2026-11-08",
        event_type: "study",
        status: "planned",
        is_completed: false,
      },
    ];
    const entries = plannerEntries([], events, subjects);

    expect(entries.map((entry) => entry.completed)).toEqual([true, true, false]);
    expect(entries[0]).toMatchObject({
      endTime: "16:00",
      notes: "Capitolo 2",
      status: "done",
      contextId: "context-id",
      lessonFrom: 1,
      lessonTo: 2,
      source: "auto",
      moveCount: 3,
      originalDate: "2026-11-05",
      originalTime: "14:00",
      locked: true,
      version: 4,
    });
  });
  it("does not put malformed times on the hourly grid", () => {
    expect(validEventTime("15:30:00")).toBe("15:30");
    expect(validEventTime("25:00")).toBeUndefined();
    expect(validEventTime("9:77")).toBeUndefined();
  });
});
