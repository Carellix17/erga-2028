import { describe, expect, it } from "vitest";
import { computeStudyStreak, daysUntil, formatEventTime, toLocalDayKey } from "@/lib/homeDashboard";

describe("home dashboard utilities", () => {
  it("formatta una data con la giornata locale", () => {
    expect(toLocalDayKey(new Date(2026, 7, 20, 15, 30))).toBe("2026-08-20");
  });

  it("calcola una serie che include oggi", () => {
    const now = new Date(2026, 7, 20, 12);
    const sessions = [
      new Date(2026, 7, 20, 10).toISOString(),
      new Date(2026, 7, 19, 18).toISOString(),
      new Date(2026, 7, 18, 16).toISOString(),
    ];
    expect(computeStudyStreak(sessions, now)).toBe(3);
  });

  it("mantiene la serie di ieri senza penalizzare la giornata corrente", () => {
    const now = new Date(2026, 7, 20, 9);
    const sessions = [
      new Date(2026, 7, 19, 18).toISOString(),
      new Date(2026, 7, 18, 16).toISOString(),
    ];
    expect(computeStudyStreak(sessions, now)).toBe(2);
  });

  it("interrompe la serie se manca sia oggi sia ieri", () => {
    const now = new Date(2026, 7, 20, 12);
    expect(computeStudyStreak([new Date(2026, 7, 18, 16).toISOString()], now)).toBe(0);
  });

  it("calcola i giorni mancanti e pulisce gli orari", () => {
    const now = new Date(2026, 7, 20, 22);
    expect(daysUntil(new Date(2026, 7, 23, 8), now)).toBe(3);
    expect(formatEventTime("15:30:00")).toBe("15:30");
    expect(formatEventTime(null)).toBeNull();
  });
});
