import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import {
  enqueueSlotReminders,
  synchronizePhasePushWithStore,
  type ExistingScheduledPush,
  type PushScheduleStore,
  type TimerReminderSession,
} from "@/lib/pushSchedule";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const today = "2026-11-03";
const tomorrow = "2026-11-04";
const now = new Date("2026-11-03T11:00:00.000Z"); // 12:00 a Roma

type ScheduleInsert = Parameters<PushScheduleStore["insert"]>[1][number];

interface MemoryRow {
  id: string;
  row: ScheduleInsert;
  sentAt: string | null;
  cancelledAt: string | null;
  skipReason: string | null;
}

class MemoryStore implements PushScheduleStore {
  rows: MemoryRow[] = [];
  inserted: ScheduleInsert[] = [];
  cancelledIds: string[] = [];
  cancelledSessions: string[] = [];
  private nextId = 1;

  async listManaged(userId: string): Promise<readonly ExistingScheduledPush[]> {
    return this.rows
      .filter(({ row, cancelledAt }) =>
        row.user_id === userId
        && (row.kind === "slot_start" || row.kind === "evening_summary")
        && cancelledAt === null,
      )
      .map(({ id, row, sentAt, cancelledAt, skipReason }) => ({
        id,
        kind: String(row.kind),
        tag: row.tag ?? null,
        send_at: String(row.send_at),
        title: String(row.title),
        body: String(row.body),
        url: String(row.url),
        sent_at: sentAt,
        cancelled_at: cancelledAt,
        skip_reason: skipReason,
      }));
  }

  async cancelPending(userId: string, ids: readonly string[], cancelledAt: string): Promise<void> {
    for (const id of ids) {
      this.cancelledIds.push(id);
      const current = this.rows.find((entry) => entry.id === id && entry.row.user_id === userId);
      if (current && current.sentAt === null && current.cancelledAt === null) current.cancelledAt = cancelledAt;
    }
  }

  async listSessionReminders(userId: string, sessionId: string): Promise<readonly ExistingScheduledPush[]> {
    return this.rows
      .filter(({ row, cancelledAt }) =>
        row.user_id === userId
        && row.focus_session_id === sessionId
        && (row.kind === "pomodoro_end" || row.kind === "break_end" || row.kind === "overrun")
        && cancelledAt === null,
      )
      .map(({ id, row, sentAt, cancelledAt, skipReason }) => ({
        id,
        kind: String(row.kind),
        tag: row.tag ?? null,
        send_at: String(row.send_at),
        title: String(row.title),
        body: String(row.body),
        url: String(row.url),
        sent_at: sentAt,
        cancelled_at: cancelledAt,
        skip_reason: skipReason,
      }));
  }

  async cancelForSession(userId: string, sessionId: string, cancelledAt: string): Promise<void> {
    this.cancelledSessions.push(sessionId);
    for (const current of this.rows) {
      if (
        current.row.user_id === userId
        && current.row.focus_session_id === sessionId
        && current.sentAt === null
        && current.cancelledAt === null
      ) current.cancelledAt = cancelledAt;
    }
  }

  async insert(userId: string, rows: readonly ScheduleInsert[]): Promise<void> {
    for (const row of rows) {
      this.inserted.push(row);
      this.rows.push({
        id: `push-${this.nextId++}`,
        row: { ...row, user_id: userId },
        sentAt: null,
        cancelledAt: null,
        skipReason: null,
      });
    }
  }

  active(kind: string): MemoryRow[] {
    return this.rows.filter(({ row, cancelledAt }) => row.kind === kind && cancelledAt === null);
  }
}

function studyEvent(id: string, time: string, overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id,
    subject: "Biologia",
    title: "TEST_LESSON_CONTENT_DO_NOT_NOTIFY",
    event_date: tomorrow,
    event_time: time,
    end_time: `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:${time.slice(3, 5)}`,
    event_type: "study",
    lesson_from: 0,
    lesson_to: 6,
    status: "planned",
    is_completed: false,
    move_count: 0,
    updated_at: `${today}T10:00:00.000Z`,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("pushSchedule", () => {
  it("schedules at most five slot reminders in the same Rome day", async () => {
    const store = new MemoryStore();
    const events = Array.from({ length: 8 }, (_, index) =>
      studyEvent(`slot-${index + 1}`, `${String(9 + index).padStart(2, "0")}:00`),
    );

    await enqueueSlotReminders(events, {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      store,
      now,
      language: "it",
    });

    const scheduled = store.active("slot_start");
    expect(scheduled).toHaveLength(5);
    expect(scheduled.map(({ row }) => row.tag)).toEqual([
      "erga-slot-slot-1",
      "erga-slot-slot-2",
      "erga-slot-slot-3",
      "erga-slot-slot-4",
      "erga-slot-slot-5",
    ]);
  });

  it("cancels and recreates an unsent reminder when its slot moves", async () => {
    const store = new MemoryStore();
    const first = studyEvent("moving-slot", "13:00");
    await enqueueSlotReminders([first], {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      store,
      now,
      language: "it",
    });
    const original = store.active("slot_start")[0];
    expect(original.row.send_at).toBe("2026-11-04T11:55:00.000Z");

    const moved = { ...first, event_time: "13:30", end_time: "14:30", move_count: 1 };
    await enqueueSlotReminders([moved], {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      store,
      now,
      language: "it",
    });

    expect(store.cancelledIds).toContain(original.id);
    expect(store.active("slot_start")).toHaveLength(1);
    expect(store.active("slot_start")[0].row.send_at).toBe("2026-11-04T12:25:00.000Z");
    expect(store.inserted.filter((row) => row.kind === "slot_start")).toHaveLength(2);
  });

  it("keeps an expired queued reminder while its planned slot has not started, without creating past rows", async () => {
    const event = studyEvent("near-slot", "15:00");
    const beforeReminder = new Date("2026-11-04T12:00:00.000Z");
    const afterReminder = new Date("2026-11-04T13:55:10.000Z");
    const store = new MemoryStore();
    const options = {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      store,
      language: "it",
    };

    await enqueueSlotReminders([event], { ...options, now: beforeReminder });
    const queued = store.active("slot_start")[0];
    expect(queued.row.send_at).toBe("2026-11-04T13:55:00.000Z");

    await enqueueSlotReminders([event], { ...options, now: afterReminder });
    expect(store.cancelledIds).not.toContain(queued.id);
    expect(store.active("slot_start")).toHaveLength(1);
    expect(store.inserted).toHaveLength(1);

    const noExistingRowStore = new MemoryStore();
    await enqueueSlotReminders([event], {
      ...options,
      store: noExistingRowStore,
      now: afterReminder,
    });
    expect(noExistingRowStore.inserted).toHaveLength(0);
  });

  it("cancels an expired queued reminder when its slot moves, completes, or starts", async () => {
    const beforeReminder = new Date("2026-11-04T12:00:00.000Z");
    const afterReminder = new Date("2026-11-04T13:55:10.000Z");
    const original = studyEvent("changed-slot", "15:00");
    const baseOptions = {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      now: beforeReminder,
      language: "it",
    };

    const movedStore = new MemoryStore();
    await enqueueSlotReminders([original], { ...baseOptions, store: movedStore });
    const movedReminder = movedStore.active("slot_start")[0];
    await enqueueSlotReminders([{
      ...original,
      event_time: "15:30",
      end_time: "16:30",
      move_count: 1,
    }], { ...baseOptions, store: movedStore, now: afterReminder });
    expect(movedStore.cancelledIds).toContain(movedReminder.id);
    expect(movedStore.active("slot_start")).toHaveLength(1);
    expect(movedStore.active("slot_start")[0].row.send_at).toBe("2026-11-04T14:25:00.000Z");

    const completedStore = new MemoryStore();
    await enqueueSlotReminders([original], { ...baseOptions, store: completedStore });
    const completedReminder = completedStore.active("slot_start")[0];
    await enqueueSlotReminders([{
      ...original,
      is_completed: true,
      status: "done",
    }], { ...baseOptions, store: completedStore, now: afterReminder });
    expect(completedStore.cancelledIds).toContain(completedReminder.id);
    expect(completedStore.active("slot_start")).toHaveLength(0);

    const startedStore = new MemoryStore();
    const nearlyStarted = studyEvent("started-slot", "14:55");
    await enqueueSlotReminders([nearlyStarted], { ...baseOptions, store: startedStore });
    const startedReminder = startedStore.active("slot_start")[0];
    await enqueueSlotReminders([nearlyStarted], {
      ...baseOptions,
      store: startedStore,
      now: afterReminder,
    });
    expect(startedStore.cancelledIds).toContain(startedReminder.id);
    expect(startedStore.active("slot_start")).toHaveLength(0);
  });

  it("includes the subject by default but never includes lesson content; hide_subject removes the subject", async () => {
    const visibleStore = new MemoryStore();
    await enqueueSlotReminders([studyEvent("visible-slot", "13:00")], {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      store: visibleStore,
      now,
      language: "it",
    });
    const visible = visibleStore.active("slot_start")[0].row;
    expect(visible.title).toContain("Biologia");
    expect(`${visible.title} ${visible.body}`).not.toContain("TEST_LESSON_CONTENT_DO_NOT_NOTIFY");

    const englishStore = new MemoryStore();
    await enqueueSlotReminders([studyEvent("english-slot", "13:00")], {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false },
      store: englishStore,
      now,
      language: "en",
    });
    expect(englishStore.active("slot_start")[0].row.title).toContain("In 5 minutes");

    const privateStore = new MemoryStore();
    await enqueueSlotReminders([studyEvent("private-slot", "14:00")], {
      userId: "student-1",
      notifyTypes: { slot_start: true, evening_summary: false, hide_subject: true },
      store: privateStore,
      now,
      language: "it",
    });
    const hidden = privateStore.active("slot_start")[0].row;
    expect(hidden.title).not.toContain("Biologia");
    expect(hidden.body).not.toContain("Biologia");
    expect(`${hidden.title} ${hidden.body}`).not.toContain("TEST_LESSON_CONTENT_DO_NOT_NOTIFY");
  });

  it("creates the 20:30 move summary only for moved slots today and hides subjects when requested", async () => {
    const moved = studyEvent("moved-slot", "13:00", {
    move_count: 1,
    original_date: today,
    original_time: "12:00",
    updated_at: "2026-11-03T10:30:00.000Z",
    });
    const store = new MemoryStore();
    await enqueueSlotReminders([moved], {
      userId: "student-1",
      notifyTypes: { slot_start: false, evening_summary: true, hide_subject: true },
      store,
      now,
      language: "it",
    });

    const summary = store.active("evening_summary");
    expect(summary).toHaveLength(1);
    expect(summary[0].row.send_at).toBe("2026-11-03T19:30:00.000Z");
    expect(summary[0].row.body).toContain("1");
    expect(summary[0].row.body).not.toContain("Biologia");
    expect(summary[0].row.body).not.toContain("TEST_LESSON_CONTENT_DO_NOT_NOTIFY");

    const visibleSummaryStore = new MemoryStore();
    await enqueueSlotReminders([moved], {
      userId: "student-1",
      notifyTypes: { slot_start: false, evening_summary: true },
      store: visibleSummaryStore,
      now,
      language: "en",
    });
    expect(visibleSummaryStore.active("evening_summary")[0].row.body).toContain("Biologia at 13:00");
  });

  it("does not enqueue an expired timer phase again when the app is reopened", async () => {
    const store = new MemoryStore();
    const session: TimerReminderSession = {
      id: "expired-session",
      userId: "student-1",
      phase: "focus",
      cycle: 0,
      phaseEndsAt: Date.parse("2026-11-03T12:30:00.000Z"),
      phaseDurationSeconds: 25 * 60,
      pausedAt: null,
      task: { subject: "Biologia", eventId: "slot-1" },
    };

    await synchronizePhasePushWithStore(store, session, { pomodoro: true }, { now });
    expect(store.inserted).toHaveLength(1);

    await synchronizePhasePushWithStore(store, session, { pomodoro: true }, {
      now: new Date("2026-11-03T12:31:00.000Z"),
    });
    expect(store.inserted).toHaveLength(1);
    expect(store.active("pomodoro_end")).toHaveLength(1);

    const emptyStore = new MemoryStore();
    await synchronizePhasePushWithStore(emptyStore, session, { pomodoro: true }, {
      now: new Date("2026-11-03T12:30:00.000Z"),
    });
    expect(emptyStore.inserted).toHaveLength(0);
  });

  it("is idempotent per session, kind, and phase expiry, including claimed rows", async () => {
    const store = new MemoryStore();
    const session: TimerReminderSession = {
      id: "idempotent-session",
      userId: "student-1",
      phase: "focus",
      cycle: 0,
      phaseEndsAt: Date.parse("2026-11-03T12:30:00.000Z"),
      phaseDurationSeconds: 25 * 60,
      pausedAt: null,
      task: { subject: "Biologia", eventId: "slot-1" },
    };

    await synchronizePhasePushWithStore(store, session, { pomodoro: true }, { now });
    await synchronizePhasePushWithStore(store, session, { pomodoro: true }, { now });
    expect(store.inserted).toHaveLength(1);

    store.rows[0].sentAt = "2026-11-03T12:00:01.000Z";
    await synchronizePhasePushWithStore(store, session, { pomodoro: true }, { now });
    expect(store.inserted).toHaveLength(1);
    expect(store.active("pomodoro_end")).toHaveLength(1);
  });

  it("cancels a timer reminder on pause and recreates it on resume", async () => {
    const store = new MemoryStore();
    const session: TimerReminderSession = {
      id: "session-1",
      userId: "student-1",
      phase: "focus",
      cycle: 1,
      phaseEndsAt: Date.parse("2026-11-03T12:30:00.000Z"),
      phaseDurationSeconds: 25 * 60,
      nextBreakMinutes: 10,
      pausedAt: null,
      task: { subject: "Biologia", eventId: "slot-1", lessonFrom: 1, lessonTo: 7 },
    };

    await synchronizePhasePushWithStore(store, session, { pomodoro: true }, {
      now,
      language: "it",
    });
    expect(store.active("pomodoro_end")).toHaveLength(1);
    expect(store.active("pomodoro_end")[0].row.tag).toBe("erga-timer");
    expect(store.active("pomodoro_end")[0].row.body).toContain("10 minuti");

    const privateStore = new MemoryStore();
    await synchronizePhasePushWithStore(privateStore, session, { pomodoro: true, hide_subject: true }, {
      now,
      language: "it",
    });
    const privateTimer = privateStore.active("pomodoro_end")[0].row;
    expect(`${privateTimer.title} ${privateTimer.body}`).not.toContain("Biologia");

    const pausedAt = Date.parse("2026-11-03T12:10:00.000Z");
    await synchronizePhasePushWithStore(store, { ...session, pausedAt }, { pomodoro: true }, {
      now,
      language: "it",
    });
    expect(store.active("pomodoro_end")).toHaveLength(0);

    const resumed = { ...session, phaseEndsAt: Date.parse("2026-11-03T12:45:00.000Z") };
    await synchronizePhasePushWithStore(store, resumed, { pomodoro: true }, {
      now,
      language: "it",
    });
    expect(store.active("pomodoro_end")).toHaveLength(1);
    expect(store.active("pomodoro_end")[0].row.send_at).toBe("2026-11-03T12:45:00.000Z");
    expect(store.cancelledSessions).toEqual(["session-1"]);
  });
});
