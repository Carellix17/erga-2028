import {
  MAX_PLAN_CHANGES,
  buildStudyEventInsert,
  validatePlanChanges,
  validateStudyEventFields,
} from "./validate.ts";

function assertEquals(actual: unknown, expected: unknown, message = "Values differ"): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const contextId = "9f6a1a2b-3c4d-5e6f-8a9b-0c1d2e3f4a5b";
const evaluationId = "a6b2c1d0-4e5f-6789-abcd-0123456789ab";

Deno.test("normalizes the new event fields to database column names", () => {
  const fields = validateStudyEventFields({
    notes: "  Ripassare il capitolo 4  ",
    time: "16:30",
    endTime: "17:15",
    contextId: contextId.toUpperCase(),
    evaluationId,
    source: "ai",
    status: "planned",
    lessonFrom: 0,
    lessonTo: 4,
  });

  assertEquals(fields, {
    notes: "Ripassare il capitolo 4",
    end_time: "17:15",
    context_id: contextId,
    evaluation_id: evaluationId,
    source: "ai",
    status: "planned",
    lesson_from: 0,
    lesson_to: 4,
  });
});

Deno.test("leaves absent and empty optional fields out of the insert payload", () => {
  assertEquals(validateStudyEventFields({}), {});
  assertEquals(validateStudyEventFields({ notes: "  ", lessonFrom: null, lessonTo: null }), {});
});

Deno.test("keeps the exact legacy insert keys when there are no new fields", () => {
  const payload = buildStudyEventInsert("user-1", {
    subject: "Fisica",
    title: "Ripasso",
    date: "2026-11-05",
    time: "15:00",
    type: "study",
  });

  assertEquals(Object.keys(payload), ["user_id", "subject", "title", "event_date", "event_time", "event_type"]);
  assert(!("is_completed" in payload), "add must not send is_completed");
  assert(!("version" in payload), "add must not send version");
  assert(!("move_count" in payload), "add must not send move_count");
});

Deno.test("discards invalid fields individually instead of rejecting valid siblings", () => {
  const fields = validateStudyEventFields({
    notes: "  ",
    time: "10:00",
    endTime: "09:59",
    contextId: "not-a-uuid",
    evaluationId,
    source: "planner",
    status: "done",
    lessonFrom: 3,
    lessonTo: 2,
  });

  assertEquals(fields, { evaluation_id: evaluationId, status: "done" });
});

Deno.test("requires strict end times after a valid start time and trims notes to 1000 characters", () => {
  assertEquals(validateStudyEventFields({ time: "16:00", endTime: "16:00" }), {});
  assertEquals(validateStudyEventFields({ time: "16:00:00", endTime: "16:30" }), { end_time: "16:30" });
  const notes = validateStudyEventFields({ notes: `  ${"x".repeat(1005)}  ` }).notes;
  assert(notes?.length === 1000, "notes should be trimmed and capped at 1000 characters");
});

Deno.test("accepts planner change batches only when each change is valid and within the limit", () => {
  const result = validatePlanChanges([
    {
      op: "insert",
      after: {
        subject: " Matematica ",
        title: " Esercizi ",
        event_date: "2026-11-05",
        event_time: "15:00",
        end_time: "16:00",
        source: "auto",
        lesson_from: 1,
        lesson_to: 2,
      },
    },
    {
      op: "update",
      event_id: contextId,
      version: 0,
      before: { status: "planned", version: 0, ignored: "not persisted" },
      after: { status: "done", move_count: 1 },
    },
    { op: "delete", event_id: evaluationId, version: 3 },
  ]);

  assert(result.ok, "expected a valid batch");
  if (result.ok) {
    assertEquals(result.changes, [
      {
        op: "insert",
        after: {
          subject: "Matematica",
          title: "Esercizi",
          event_date: "2026-11-05",
          event_time: "15:00",
          end_time: "16:00",
          lesson_from: 1,
          lesson_to: 2,
          source: "auto",
        },
      },
      {
        op: "update",
        before: { status: "planned", version: 0 },
        event_id: contextId,
        version: 0,
        after: { status: "done", move_count: 1 },
      },
      { op: "delete", event_id: evaluationId, version: 3 },
    ]);
  }

  assertEquals(validatePlanChanges([{ op: "update", event_id: contextId, version: 0, after: {} }]), {
    ok: false,
    error: "changes_invalid",
  });
  assertEquals(validatePlanChanges(Array.from({ length: MAX_PLAN_CHANGES + 1 }, () => ({ op: "delete", event_id: contextId, version: 0 }))), {
    ok: false,
    error: "changes_limit",
  });
});
