import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EarlyFinishSheet } from "@/components/focus/EarlyFinishSheet";
import { OverrunSheet } from "@/components/focus/OverrunSheet";
import {
  createSlotExtensionPlan,
  findNextScheduleItem,
  getSlotExtensionLimit,
  getStudyEventEndInstant,
  isAtLeastTenMinutesEarly,
  isEligiblePlannedStudy,
  isSlotOverrunThresholdReached,
  romeDateTimeToInstant,
} from "@/lib/focus/slotOverrun";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { PlannerRoutine } from "@/lib/planner/freeTime";

const focusMock = vi.hoisted(() => ({ current: { isActive: true } }));
vi.mock("@/contexts/FocusContext", () => ({ useOptionalFocus: () => focusMock.current }));

afterEach(() => {
  cleanup();
  focusMock.current = { isActive: true };
});

function studyEvent(overrides: Partial<StudyEvent> = {}): StudyEvent {
  return {
    id: "study-1",
    subject: "Fisica",
    title: "Ripasso",
    event_date: "2026-11-02",
    event_time: "16:00",
    end_time: "16:50",
    event_type: "study",
    source: "ai",
    status: "planned",
    version: 1,
    ...overrides,
  };
}

describe("slot overrun timing", () => {
  it("resolves a DB wall-clock end in Europe/Rome in winter and summer", () => {
    expect(romeDateTimeToInstant("2026-01-15", "17:00:00"))
      .toBe(Date.parse("2026-01-15T16:00:00.000Z"));
    expect(romeDateTimeToInstant("2026-07-15", "17:00"))
      .toBe(Date.parse("2026-07-15T15:00:00.000Z"));
  });

  it("resolves the repeated Rome wall time at the autumn DST change deterministically", () => {
    expect(romeDateTimeToInstant("2026-10-25", "02:30"))
      .toBe(Date.parse("2026-10-25T02:30:00+01:00"));
  });

  it("does not invent an instant for a nonexistent Rome wall time at the spring DST jump", () => {
    expect(romeDateTimeToInstant("2026-03-29", "02:30")).toBeNull();
  });

  it("uses the DB slot end plus exactly two minutes, not a Focus phase deadline", () => {
    const event = studyEvent({ event_time: "16:00", end_time: "16:50" });
    const end = getStudyEventEndInstant(event)!;
    expect(isSlotOverrunThresholdReached(event, end + 119_999)).toBe(false);
    expect(isSlotOverrunThresholdReached(event, end + 120_000)).toBe(true);
  });

  it("accepts only planned timed study tasks with an event id, never a free session", () => {
    const event = studyEvent();
    expect(isEligiblePlannedStudy({ eventId: event.id, sourceType: "planned" }, event)).toBe(true);
    expect(isEligiblePlannedStudy({ eventId: undefined, sourceType: "adhoc" }, event)).toBe(false);
    expect(isEligiblePlannedStudy({ eventId: event.id, sourceType: "adhoc" }, event)).toBe(false);
    expect(isEligiblePlannedStudy({ eventId: event.id, sourceType: "planned" }, studyEvent({ end_time: null }))).toBe(false);
  });

  it("recognizes a finish exactly ten minutes before the Rome slot end", () => {
    const event = studyEvent({ end_time: "16:50" });
    const end = getStudyEventEndInstant(event)!;
    expect(isAtLeastTenMinutesEarly(event, end - 10 * 60_000)).toBe(true);
    expect(isAtLeastTenMinutesEarly(event, end - 9 * 60_000 - 59_999)).toBe(false);
  });
});

describe("slot extension package", () => {
  it("extends the active slot and moves only the colliding study slot in one versioned package", () => {
    const current = studyEvent({ event_time: "15:00", end_time: "16:00" });
    const nextStudy = studyEvent({
      id: "study-2",
      event_time: "16:00",
      end_time: "16:30",
      subject: "Storia",
      title: "Lettura",
      version: 4,
    });
    const protectedEvent = studyEvent({
      id: "assignment-1",
      event_type: "assignment",
      event_time: "17:00",
      end_time: "17:30",
      subject: "Sport",
      title: "Pallavolo",
      version: 8,
    });

    const plan = createSlotExtensionPlan(current, [current, nextStudy, protectedEvent], [], 10);

    expect(plan?.changes).toHaveLength(2);
    expect(plan?.changes[0]).toMatchObject({ op: "update", event_id: current.id, version: 1, after: { end_time: "16:10" } });
    expect(plan?.changes[1]).toMatchObject({
      op: "update",
      event_id: nextStudy.id,
      version: 4,
      after: { event_time: "16:10", end_time: "16:40" },
    });
    expect(plan?.changes.some((change) => change.op === "update" && change.event_id === protectedEvent.id)).toBe(false);
  });

  it("caps an extension before an occupied event instead of moving it", () => {
    const current = studyEvent({ end_time: "16:50" });
    const volleyball = studyEvent({
      id: "volleyball",
      event_type: "assignment",
      event_time: "17:00",
      end_time: "18:00",
      title: "Pallavolo",
    });

    expect(createSlotExtensionPlan(current, [current, volleyball], [], 10)?.changes[0])
      .toMatchObject({ op: "update", after: { end_time: "17:00" } });
    expect(createSlotExtensionPlan(current, [current, volleyball], [], 11)).toBeNull();
  });

  it("reports the exact maximum safe extension before a protected event", () => {
    const current = studyEvent({ end_time: "16:50" });
    const volleyball = studyEvent({
      id: "volleyball",
      event_type: "assignment",
      event_time: "16:58",
      end_time: "18:00",
      title: "Pallavolo",
    });

    expect(getSlotExtensionLimit(current, [current, volleyball], [])).toEqual({
      minutes: 8,
      time: "16:58",
      item: "Pallavolo",
    });
  });

  it("refuses to shift a study slot into a protected commitment and allows the smaller safe delta", () => {
    const current = studyEvent({ event_time: "15:00", end_time: "16:00" });
    const nextStudy = studyEvent({ id: "study-2", event_time: "16:00", end_time: "16:30", version: 2 });
    const protectedEvent = studyEvent({
      id: "appointment",
      event_type: "test",
      event_time: "16:35",
      end_time: "17:00",
      title: "Verifica",
    });

    expect(createSlotExtensionPlan(current, [current, nextStudy, protectedEvent], [], 10)).toBeNull();
    expect(createSlotExtensionPlan(current, [current, nextStudy, protectedEvent], [], 5)?.changes).toHaveLength(2);
  });

  it("treats routines as protected and never emits a routine change", () => {
    const current = studyEvent({ end_time: "16:50" });
    const volleyball: PlannerRoutine = {
      kind: "other",
      label: "Pallavolo",
      start_time: "17:00",
      end_time: "18:00",
      days_of_week: [1],
    };

    const plan = createSlotExtensionPlan(current, [current], [volleyball], 10);
    expect(plan?.changes).toHaveLength(1);
    expect(plan?.changes[0]).toMatchObject({ op: "update", event_id: current.id, after: { end_time: "17:00" } });
  });

  it("does not move a locked study slot to make room", () => {
    const current = studyEvent({ event_time: "15:00", end_time: "16:00" });
    const lockedStudy = studyEvent({ id: "locked", event_time: "16:00", end_time: "16:30", locked: true });
    expect(createSlotExtensionPlan(current, [current, lockedStudy], [], 1)).toBeNull();
  });

  it("finds the next routine when it precedes the next scheduled event", () => {
    const routine: PlannerRoutine = {
      kind: "other",
      label: "Pallavolo",
      start_time: "17:00",
      end_time: "18:00",
      days_of_week: [1],
    };
    const event = studyEvent({ id: "next", event_time: "18:30", end_time: "19:00" });

    expect(findNextScheduleItem("2026-11-02", 16 * 60 + 50, "study-1", [event], [routine]))
      .toMatchObject({ label: "Pallavolo", time: "17:00", kind: "routine" });
  });
});

describe("overrun sheet interactions", () => {
  it("keeps the early-finish sheet non-modal and Escape does not run any action", () => {
    const onStartNext = vi.fn();
    const onStartBreak = vi.fn();
    const onLeaveFree = vi.fn();
    const onDismiss = vi.fn();
    render(
      <EarlyFinishSheet
        prompt={{
          sessionKey: "session-1",
          event: studyEvent(),
          subject: "Fisica",
          lessonFrom: 0,
          lessonTo: 0,
          nextItem: null,
          nextStudyEvent: null,
        }}
        onStartNext={onStartNext}
        onStartBreak={onStartBreak}
        onLeaveFree={onLeaveFree}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "false");
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onStartNext).not.toHaveBeenCalled();
    expect(onStartBreak).not.toHaveBeenCalled();
    expect(onLeaveFree).not.toHaveBeenCalled();
  });

  it("keeps the sheet non-modal and treats Escape as decide-later without running a plan action", () => {
    const onExtend = vi.fn();
    const onFinish = vi.fn();
    const onStop = vi.fn();
    const onDismiss = vi.fn();
    render(
      <OverrunSheet
        open
        subject="Fisica"
        lessonLabel="Minilezione 1"
        nextItem={null}
        extensionMinutes={0}
        extensionLimit={{ minutes: 0, time: null, item: null }}
        isSaving={false}
        onExtend={onExtend}
        onFinish={onFinish}
        onStop={onStop}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "false");
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onExtend).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });
});
