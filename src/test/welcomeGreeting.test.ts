/**
 * Il messaggio di benvenuto ha due soli tipi: "Buongiorno" e "Buonasera".
 * "Buonasera" copre dalle 17:00 dell'orologio del dispositivo fino alle 03:00
 * di notte; il resto della giornata è "Buongiorno". Non esistono più il
 * saluto del pomeriggio né quello della notte.
 */
import { describe, expect, it } from "vitest";
import { greetingKeyForHour } from "@/hooks/useWelcomeMessage";
import enLocale from "@/i18n/locales/en.json";
import itLocale from "@/i18n/locales/it.json";

describe("Saluto della Home", () => {
  it("usa Buonasera dalle 17:00 alle 02:59 e Buongiorno dalle 03:00 alle 16:59", () => {
    const evening = [17, 18, 20, 23, 0, 1, 2];
    const morning = [3, 4, 7, 11, 12, 13, 15, 16];

    evening.forEach((hour) => expect(greetingKeyForHour(hour)).toBe("home.greeting.evening"));
    morning.forEach((hour) => expect(greetingKeyForHour(hour)).toBe("home.greeting.morning"));

    // nessun'ora del giorno produce un saluto diverso dai due previsti
    const keys = new Set(Array.from({ length: 24 }, (_, hour) => greetingKeyForHour(hour)));
    expect([...keys].sort()).toEqual(["home.greeting.evening", "home.greeting.morning"]);
  });

  it("i confini sono 17:00 e 03:00 esatti", () => {
    expect(greetingKeyForHour(16)).toBe("home.greeting.morning");
    expect(greetingKeyForHour(17)).toBe("home.greeting.evening");
    expect(greetingKeyForHour(2)).toBe("home.greeting.evening");
    expect(greetingKeyForHour(3)).toBe("home.greeting.morning");
  });

  it("le traduzioni contengono solo i due saluti rimasti", () => {
    expect(Object.keys(itLocale.home.greeting).sort()).toEqual(["evening", "morning"]);
    expect(Object.keys(enLocale.home.greeting).sort()).toEqual(["evening", "morning"]);
    expect(itLocale.home.greeting.morning).toBe("Buongiorno");
    expect(itLocale.home.greeting.evening).toBe("Buonasera");
    expect(JSON.stringify(itLocale.home.greeting)).not.toContain("pomeriggio");
  });
});
