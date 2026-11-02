import { describe, expect, it } from "vitest";
import { freeWindows, type PlannerRoutine } from "@/lib/planner/freeTime";
import { buildPlan, pauses, type ScheduleEvaluation } from "@/lib/planner/schedule";

const TODAY = "2026-11-02"; // Monday in Europe/Rome.
const WEEKDAYS = [1, 2, 3, 4, 5];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function evaluation(overrides: Partial<ScheduleEvaluation> = {}): ScheduleEvaluation {
  return {
    id: "eval-bio",
    date: "2026-11-03",
    is_completed: false,
    topic_type: "linked",
    topic_id: "ctx-bio",
    subject_id: "subject-bio",
    title: "Verifica di Biologia",
    subject: "Biologia",
    ...overrides,
  };
}

function lessons(count = 7) {
  return Array.from({ length: count }, (_, lesson_order) => ({
    lesson_order,
    word_count: 489,
    exercise_count: 4,
  }));
}

const afternoonRoutines: PlannerRoutine[] = [
  { kind: "other", start_time: "06:30", end_time: "15:00", days_of_week: ALL_DAYS },
  { kind: "sleep", start_time: "20:30", end_time: "06:30", days_of_week: ALL_DAYS },
];

function basePlan(overrides: Partial<Parameters<typeof buildPlan>[0]> = {}) {
  return {
    today: TODAY,
    horizonDays: 2,
    evaluations: [evaluation()],
    lessonsByContext: { "ctx-bio": { lessons: lessons(), subject: "Biologia" } },
    completedByContext: { "ctx-bio": [] },
    estimateFn: () => 14,
    routines: afternoonRoutines,
    busyEvents: [],
    existingSlots: [],
    ...overrides,
  };
}

describe("freeWindows", () => {
  it("uses the routine window, leaves thirty minutes before sleep, and blocks transport", () => {
    const windows = freeWindows(
      TODAY,
      [
        { kind: "school", start_time: "08:00", end_time: "13:30", days_of_week: WEEKDAYS },
        { kind: "meal", start_time: "13:30", end_time: "14:30", days_of_week: WEEKDAYS },
        { kind: "transport", start_time: "16:00", end_time: "16:30", days_of_week: WEEKDAYS },
        { kind: "sleep", start_time: "22:00", end_time: "06:30", days_of_week: ALL_DAYS },
      ],
      [],
    );

    expect(windows).toEqual([
      { start: 390, end: 480 },
      { start: 870, end: 960 },
      { start: 990, end: 1290 },
    ]);
  });

  it("keeps a full thirty-minute buffer even when bedtime is earlier than the routine helper's minimum window", () => {
    expect(freeWindows(TODAY, [
      { kind: "sleep", start_time: "19:00", end_time: "22:00", days_of_week: [1] },
    ])).toEqual([{ start: 390, end: 1110 }]);
  });

  it("suppresses no_study days and treats an untimed personal assignment as a 60-minute blocker", () => {
    expect(freeWindows(TODAY, [
      { kind: "no_study", start_time: "00:00", end_time: "23:59", days_of_week: [1] },
    ])).toEqual([]);

    const windows = freeWindows(TODAY, [], [
      { event_date: TODAY, event_time: "17:00", end_time: null, event_type: "assignment", subject: "Altro" },
    ]);
    expect(windows).toContainEqual({ start: 390, end: 1020 });
    expect(windows).toContainEqual({ start: 1080, end: 1350 });
  });
});

describe("buildPlan", () => {
  it("fills the complete quota for a verification tomorrow, with two ten-minute pauses", () => {
    const result = buildPlan(basePlan({ horizonDays: 1 }));

    expect(result.slots).toEqual([{
      event_date: TODAY,
      event_time: "15:00",
      end_time: "16:58",
      context_id: "ctx-bio",
      lesson_from: 0,
      lesson_to: 6,
      evaluation_id: "eval-bio",
      source: "auto",
      subject: "Biologia",
      title: "Da Minilezione 1 a 7",
    }]);
    expect(result.warnings).toEqual([]);
    expect(pauses(result.slots[0], Array(7).fill(14))
      .filter((segment) => segment.kind === "pause")
      .map((segment) => segment.duration)).toEqual([10, 10]);
  });

  it("splits the 49-minute quota plus ten-minute tolerance across today and tomorrow", () => {
    const result = buildPlan(basePlan({
      horizonDays: 2,
      evaluations: [evaluation({ date: "2026-11-04" })],
    }));

    expect(result.slots.map(({ event_date, event_time, end_time, lesson_from, lesson_to, title }) => ({
      event_date, event_time, end_time, lesson_from, lesson_to, title,
    }))).toEqual([
      {
        event_date: TODAY,
        event_time: "15:00",
        end_time: "16:06",
        lesson_from: 0,
        lesson_to: 3,
        title: "Da Minilezione 1 a 4",
      },
      {
        event_date: "2026-11-03",
        event_time: "15:00",
        end_time: "15:42",
        lesson_from: 4,
        lesson_to: 6,
        title: "Da Minilezione 5 a 7",
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("serves the nearest evaluation first within each day's available time", () => {
    const result = buildPlan(basePlan({
      horizonDays: 1,
      evaluations: [
        evaluation({ id: "later", date: "2026-11-04", topic_id: "ctx-later", subject: "Storia" }),
        evaluation({ id: "nearer", date: "2026-11-03", topic_id: "ctx-nearer", subject: "Fisica" }),
      ],
      lessonsByContext: {
        "ctx-nearer": { lessons: lessons(1), subject: "Fisica" },
        "ctx-later": { lessons: lessons(1), subject: "Storia" },
      },
      completedByContext: { "ctx-nearer": [], "ctx-later": [] },
    }));

    expect(result.slots.map(({ evaluation_id, event_time }) => [evaluation_id, event_time])).toEqual([
      ["nearer", "15:00"],
      ["later", "15:14"],
    ]);
  });

  it("keeps study slots outside school, lunch, an Altro event, and bedtime", () => {
    const routines: PlannerRoutine[] = [
      { kind: "school", start_time: "08:00", end_time: "13:30", days_of_week: WEEKDAYS },
      { kind: "meal", start_time: "13:30", end_time: "14:30", days_of_week: WEEKDAYS },
      { kind: "sleep", start_time: "22:30", end_time: "06:30", days_of_week: ALL_DAYS },
    ];
    const result = buildPlan(basePlan({
      horizonDays: 1,
      routines,
      evaluations: [evaluation()],
      lessonsByContext: { "ctx-bio": { lessons: lessons(3), subject: "Biologia" } },
      busyEvents: [{
        event_date: TODAY,
        event_time: "17:00",
        end_time: "19:00",
        event_type: "assignment",
        subject: "Altro",
      }],
    }));

    expect(result.slots.length).toBeGreaterThan(0);
    const routineIntervals = [
      [480, 810], // school
      [810, 870], // lunch
      [1320, 1440], // sleep
    ];
    for (const slot of result.slots) {
      const start = Number(slot.event_time.slice(0, 2)) * 60 + Number(slot.event_time.slice(3));
      const end = Number(slot.end_time.slice(0, 2)) * 60 + Number(slot.end_time.slice(3));
      expect(end).toBeLessThanOrEqual(1320);
      expect(start < 1020 && end > 1020).toBe(false);
      expect(start < 1140 && end > 1020).toBe(false);
      expect(routineIntervals.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart)).toBe(false);
    }
  });

  it("keeps manual, locked, and done existing slots untouched and treats them as busy", () => {
    const existingSlots = [
      { event_date: TODAY, event_time: "15:00", end_time: "16:00", event_type: "study", subject: "Altro", source: "manual" as const, status: "planned" as const, locked: false, lesson_from: null, lesson_to: null, title: "Manuale", id: "manual" },
      { event_date: TODAY, event_time: "16:00", end_time: "17:00", event_type: "study", subject: "Fisica", source: "auto" as const, status: "planned" as const, locked: true, lesson_from: null, lesson_to: null, title: "Bloccato", id: "locked" },
      { event_date: TODAY, event_time: "17:00", end_time: "18:00", event_type: "study", subject: "Storia", source: "auto" as const, status: "done" as const, locked: false, lesson_from: null, lesson_to: null, title: "Completato", id: "done" },
    ];
    const result = buildPlan(basePlan({
      horizonDays: 1,
      lessonsByContext: { "ctx-bio": { lessons: lessons(1), subject: "Biologia" } },
      existingSlots,
    }));

    expect(result.slots[0]).toMatchObject({ event_time: "18:00", end_time: "18:14" });
    expect(existingSlots.map(({ event_time }) => event_time)).toEqual(["15:00", "16:00", "17:00"]);
  });

  it("warns about all remaining lesson minutes when the day is no_study", () => {
    const result = buildPlan(basePlan({
      horizonDays: 1,
      routines: [{ kind: "no_study", start_time: "00:00", end_time: "23:59", days_of_week: [1] }],
      lessonsByContext: { "ctx-bio": { lessons: lessons(2), subject: "Biologia" } },
    }));

    expect(result.slots).toEqual([]);
    expect(result.warnings).toEqual([{ evaluationId: "eval-bio", missingMinutes: 28 }]);
  });

  it("schedules free-topic reviews for at most three useful days", () => {
    const result = buildPlan(basePlan({
      horizonDays: 5,
      evaluations: [evaluation({
        id: "free-eval",
        date: "2026-11-07",
        topic_type: "free",
        topic_id: null,
        subject: null,
        title: "Rivoluzione francese",
      })],
      lessonsByContext: {},
      completedByContext: {},
      routines: [],
    }));

    expect(result.slots.map(({ event_date, event_time, end_time, title }) => [event_date, event_time, end_time, title])).toEqual([
      [TODAY, "06:30", "07:15", "Ripasso: Rivoluzione francese"],
      ["2026-11-03", "06:30", "07:15", "Ripasso: Rivoluzione francese"],
      ["2026-11-04", "06:30", "07:15", "Ripasso: Rivoluzione francese"],
    ]);
  });

  it("uses later available days for free-topic reviews after a no_study day", () => {
    const result = buildPlan(basePlan({
      horizonDays: 5,
      evaluations: [evaluation({ id: "free-eval", date: "2026-11-07", topic_type: "free", topic_id: null, title: "Storia" })],
      lessonsByContext: {},
      completedByContext: {},
      routines: [{ kind: "no_study", start_time: "00:00", end_time: "23:59", days_of_week: [1] }],
    }));

    expect(result.slots.map(({ event_date }) => event_date)).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
    expect(result.warnings).toEqual([]);
  });

  it("returns the same result on repeated calls and does not mutate its inputs", () => {
    const input = basePlan();
    const before = JSON.stringify({ ...input, estimateFn: "estimateFn" });
    expect(buildPlan(input)).toEqual(buildPlan(input));
    expect(JSON.stringify({ ...input, estimateFn: "estimateFn" })).toBe(before);
  });
});
