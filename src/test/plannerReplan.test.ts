import { describe, expect, it } from "vitest";
import { placeSkipped, detectSkipped, splitPartial, type ReplanSlot } from "@/lib/planner/replan";
import type { PlannerRoutine } from "@/lib/planner/freeTime";

function slot(overrides: Partial<ReplanSlot> = {}): ReplanSlot {
  return {
    id: "slot-1",
    completed_at: null,
    context_id: "ctx-bio",
    end_time: "16:00",
    event_date: "2026-11-02",
    event_time: "15:00",
    event_type: "study",
    evaluation_id: "eval-bio",
    is_completed: false,
    lesson_from: 0,
    lesson_to: 6,
    locked: false,
    move_count: 0,
    notes: null,
    original_date: null,
    original_time: null,
    source: "auto",
    status: "planned",
    subject: "Biologia",
    title: "Da Minilezione 1 a 7",
    version: 4,
    ...overrides,
  };
}

const afternoon: PlannerRoutine[] = [
  { kind: "other", start_time: "06:30", end_time: "15:00", days_of_week: [1, 2, 3, 4, 5, 6, 7] },
  { kind: "sleep", start_time: "20:30", end_time: "06:30", days_of_week: [1, 2, 3, 4, 5, 6, 7] },
];

describe("detectSkipped", () => {
  it("waits until end plus fifteen minutes and ignores active, started, done, and locked slots", () => {
    const candidates = [
      slot(),
      slot({ id: "active" }),
      slot({ id: "partial", status: "partial" }),
      slot({ id: "done", status: "done" }),
      slot({ id: "locked", locked: true }),
    ];

    expect(detectSkipped(candidates, "2026-11-02T16:14:59+01:00", "active").map(({ id }) => id)).toEqual([]);
    expect(detectSkipped(candidates, "2026-11-02T16:15:00+01:00", "active").map(({ id }) => id)).toEqual(["slot-1"]);
  });

  it("does not treat a slot with a completed lesson or active session as skipped", () => {
    const partial = slot({ status: "partial" });
    const active = slot({ id: "active" });
    expect(detectSkipped([partial, active], "2026-11-02T18:00:00+01:00", "active")).toEqual([]);
  });
});

describe("placeSkipped", () => {
  it("moves to the first free window before the deadline and increments move_count", () => {
    const occupied = slot({
      id: "manual-1",
      event_time: "15:00",
      end_time: "15:30",
      source: "manual",
      lesson_from: null,
      lesson_to: null,
    });
    const result = placeSkipped(slot(), {
      now: "2026-11-02T10:00:00+01:00",
      deadline: "2026-11-04",
      routines: afternoon,
      existingSlots: [slot(), occupied],
    });

    expect(result.status).toBe("moved");
    expect(result.needsUser).toBeUndefined();
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      op: "update",
      event_id: "slot-1",
      version: 4,
      before: { event_date: "2026-11-02", event_time: "15:00", version: 4 },
      after: {
        event_date: "2026-11-02",
        event_time: "15:30",
        end_time: "16:30",
        move_count: 1,
        original_date: "2026-11-02",
        original_time: "15:00",
        status: "planned",
        source: "replan",
      },
    });
  });

  it("asks the user instead of making the third move", () => {
    const result = placeSkipped(slot({ move_count: 2 }), {
      now: "2026-11-02T10:00:00+01:00",
      deadline: "2026-11-04",
      routines: afternoon,
    });
    expect(result).toEqual({ changes: [], needsUser: true, reason: "move_limit" });
  });

  it("leaves a skipped status and no_space reason if no window exists before the deadline", () => {
    const noStudy: PlannerRoutine[] = [
      { kind: "no_study", start_time: "00:00", end_time: "23:59", days_of_week: [1] },
    ];
    const result = placeSkipped(slot(), {
      now: "2026-11-02T10:00:00+01:00",
      deadline: "2026-11-03",
      routines: noStudy,
    });

    expect(result).toMatchObject({ status: "skipped", reason: "no_space" });
    expect(result.changes[0]).toMatchObject({ op: "update", after: { status: "skipped", source: "replan" } });
  });

  it("never moves a locked slot", () => {
    const result = placeSkipped(slot({ locked: true }), {
      now: "2026-11-02T10:00:00+01:00",
      deadline: "2026-11-04",
      routines: afternoon,
    });
    expect(result).toEqual({ changes: [], needsUser: true, reason: "locked" });
  });
});

describe("splitPartial", () => {
  it("marks lessons 1–3 done and inserts an untimed continuation for lessons 4–7", () => {
    const result = splitPartial(slot(), [0, 1, 2]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      op: "update",
      event_id: "slot-1",
      version: 4,
      before: { lesson_from: 0, lesson_to: 6, status: "planned" },
      after: { lesson_to: 2, status: "done", source: "replan" },
    });
    expect(result[1]).toMatchObject({
      op: "insert",
      after: {
        event_date: "2026-11-02",
        event_time: null,
        end_time: null,
        context_id: "ctx-bio",
        evaluation_id: "eval-bio",
        lesson_from: 3,
        lesson_to: 6,
        source: "replan",
        subject: "Biologia",
        title: "Da Minilezione 4 a 7",
      },
    });
  });

  it("accepts completed lesson-order objects and requires a contiguous prefix", () => {
    expect(splitPartial(slot(), [{ order: 1 }, { order: 2 }])).toEqual([]);
    expect(splitPartial(slot(), [{ order: 0 }, { order: 1 }, { order: 2 }])).toHaveLength(2);
  });
});
