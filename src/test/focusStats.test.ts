import { describe, expect, it } from "vitest";
import {
  buildFocusDailyStats,
  summarizeFocusPeriod,
  summarizePreviousFocusPeriod,
  type FocusSessionStat,
} from "@/lib/focusStats";

const now = new Date(2026, 7, 23, 12, 0, 0);

function session(id: string, day: number, actualDuration: number): FocusSessionStat {
  return {
    id,
    actualDuration,
    completedAt: new Date(2026, 7, day, 14, 0, 0).toISOString(),
    subjectName: "Fisica",
    taskLabel: "Ripasso",
  };
}

describe("focusStats", () => {
  it("costruisce una serie continua e conserva i giorni senza sessioni", () => {
    const daily = buildFocusDailyStats([
      session("old", 15, 45),
      session("first", 17, 20),
      session("second", 22, 30),
      session("third", 22, 15),
    ], 7, now);

    expect(daily).toHaveLength(7);
    expect(daily.map((entry) => entry.date)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
    expect(daily[0]).toMatchObject({ minutes: 20, sessions: 1 });
    expect(daily[1]).toMatchObject({ minutes: 0, sessions: 0 });
    expect(daily[5]).toMatchObject({ minutes: 45, sessions: 2 });
  });

  it("calcola il riepilogo solo nel periodo scelto e il confronto con il periodo precedente", () => {
    const sessions = [
      session("previous-one", 11, 20),
      session("previous-two", 15, 10),
      session("current-one", 17, 30),
      session("current-two", 22, 60),
      session("current-three", 23, 30),
    ];

    expect(summarizeFocusPeriod(sessions, 7, now)).toEqual({
      minutes: 120,
      sessions: 3,
      activeDays: 3,
      averageSessionMinutes: 40,
    });
    expect(summarizePreviousFocusPeriod(sessions, 7, now)).toEqual({
      minutes: 30,
      sessions: 2,
      activeDays: 2,
      averageSessionMinutes: 15,
    });
  });
});
