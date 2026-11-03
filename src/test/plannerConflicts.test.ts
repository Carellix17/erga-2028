import { describe, expect, it } from "vitest";
import {
  findConflicts,
  findFirstFreeTime,
  type MoveConflictEvent,
} from "@/lib/planner/conflicts";

const monday = "2026-11-02";

function event(overrides: Partial<MoveConflictEvent> = {}): MoveConflictEvent {
  return {
    id: "occupied",
    event_date: monday,
    event_time: "17:00",
    end_time: "19:00",
    event_type: "assignment",
    subject: "Altro",
    label: "Occupato",
    ...overrides,
  };
}

describe("planner move conflicts", () => {
  it("offers after, shorten, and keep for a 16:30–18:00 slot overlapping 17:00–19:00", () => {
    const result = findConflicts({
      id: "study-slot",
      eventTime: "16:30",
      endTime: "18:00",
      original: { date: "2026-11-01", eventTime: "15:00", endTime: "16:00" },
      events: [event()],
    }, monday);

    expect(result).toEqual({
      valid: true,
      hasConflict: true,
      conflicts: [{ kind: "event", label: "Occupato", startTime: "17:00", endTime: "19:00" }],
      proposals: [
        { kind: "after", date: monday, time: "19:00", endTime: "20:30" },
        { kind: "shorten", date: monday, time: "16:30", endTime: "17:00" },
        { kind: "keep", date: "2026-11-01", time: "15:00", endTime: "16:00" },
      ],
    });
  });

  it("treats routines as occupied and permits a slot that only touches a commitment", () => {
    const routineResult = findConflicts({
      id: "study-slot",
      eventTime: "08:30",
      endTime: "09:30",
      routines: [{ kind: "school", label: "Scuola", start_time: "08:00", end_time: "13:30", days_of_week: [1] }],
    }, monday);
    expect(routineResult.conflicts).toEqual([
      { kind: "routine", label: "Scuola", startTime: "08:00", endTime: "13:30" },
    ]);

    const touching = findConflicts({
      id: "study-slot",
      eventTime: "15:00",
      endTime: "16:00",
      events: [event({ event_time: "16:00", end_time: "17:00" })],
    }, monday);
    expect(touching).toMatchObject({ valid: true, hasConflict: false, conflicts: [], proposals: [] });
  });

  it("does not propose shortening below ten minutes", () => {
    const result = findConflicts({
      id: "study-slot",
      eventTime: "16:55",
      endTime: "18:00",
      events: [event({ event_time: "17:00" })],
    }, monday);

    expect(result.hasConflict).toBe(true);
    expect(result.proposals.some((proposal) => proposal.kind === "shorten")).toBe(false);
  });

  it("finds the first free time after sleep using the supplied Rome clock", () => {
    const result = findFirstFreeTime({
      fromDay: monday,
      fromTime: "05:30",
      durationMinutes: 60,
      now: new Date("2026-11-02T05:30:00+01:00"),
      routines: [{
        kind: "sleep",
        label: "Sonno",
        start_time: "22:00",
        end_time: "07:00",
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
      }],
    });

    expect(result).toEqual({ date: monday, time: "07:00" });
  });
});
