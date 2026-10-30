import { describe, expect, it } from "vitest";
import { getCompletedLessonOrders, isLastLessonCompleted } from "@/lib/courseProgress";
import { computeStudyStreak, daysUntil, formatEventTime, selectHomeResumeLesson, toLocalDayKey } from "@/lib/homeDashboard";

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

  it("usa lo stesso indice per titolo e posizione della lezione da riprendere e riconosce il corso finito", () => {
    const lessons = [
      { title: "Moto uniforme", is_generated: true, lesson_order: 0 },
      { title: "In attesa di generazione", is_generated: false, lesson_order: 1 },
      { title: "Accelerazione", is_generated: true, lesson_order: 2 },
    ];
    const selection = selectHomeResumeLesson(lessons, 1);

    expect(selection).toMatchObject({
      lessonIndex: 2,
      lessonTitle: "Accelerazione",
      lessonNumber: 3,
      lessonCount: 3,
      progressPercent: 67,
    });

    const completedOrders = getCompletedLessonOrders([{ order: 2 }]);
    const finishedSelection = selectHomeResumeLesson(
      lessons,
      1,
      isLastLessonCompleted(completedOrders, lessons[lessons.length - 1]?.lesson_order),
    );
    expect(finishedSelection).toMatchObject({ lessonIndex: 2, lessonTitle: "Accelerazione", lessonNumber: 3, progressPercent: 100 });
  });

  it("calcola i giorni mancanti e pulisce gli orari", () => {
    const now = new Date(2026, 7, 20, 22);
    expect(daysUntil(new Date(2026, 7, 23, 8), now)).toBe(3);
    expect(formatEventTime("15:30:00")).toBe("15:30");
    expect(formatEventTime(null)).toBeNull();
  });
});
