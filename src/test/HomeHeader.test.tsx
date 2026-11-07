import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeHeader } from "@/components/home/HomeHeader";
import tailwindConfig from "../../tailwind.config";

const fontFamilies = tailwindConfig.theme.extend.fontFamily;

/**
 * Saluto della Home — DESIGN.md scuro: Geist per la UI.
 * Scala compatta: 32px telefono, 40 sm, 48 lg.
 */

describe("Font del messaggio di benvenuto", () => {
  it("self-host Geist e non carica Google Fonts", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");
    expect(html).not.toContain("fonts.googleapis.com");
    expect(main).toContain("@fontsource/geist/400.css");
    expect(main).toContain("@fontsource/geist-mono/400.css");
  });

  it("usa Geist per UI, titoli e lettura", () => {
    expect(fontFamilies.display).toEqual(["Geist", "system-ui", "sans-serif"]);
    expect(fontFamilies.serif).toEqual(fontFamilies.display);
    expect(fontFamilies.sans).toEqual(fontFamilies.display);
    expect(fontFamilies.reading).toEqual(fontFamilies.display);
    expect(fontFamilies.editorial).toEqual(["Geist", "system-ui", "sans-serif"]);
    expect(fontFamilies.mono).toEqual(["Geist Mono", "ui-monospace", "monospace"]);
    expect(fontFamilies).not.toHaveProperty("welcome-title");
    expect(fontFamilies).not.toHaveProperty("welcome");
  });

  it("applica il carattere UI al titolo preservando peso, scala compatta e le due righe accessibili", () => {
    const { container } = render(<HomeHeader greeting="Buongiorno" userName="Vale" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Buongiorno Vale" });

    expect(heading).toHaveClass(
      "font-display", "font-medium",
      "text-[2rem]", "sm:text-[2.5rem]", "lg:text-[3rem]",
      "leading-[1.15]", "tracking-[-0.01em]", "text-balance",
    );
    expect(container.querySelectorAll(".font-display")).toHaveLength(1);
    const lines = heading.querySelectorAll("span");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent("Buongiorno");
    expect(lines[1]).toHaveTextContent("Vale");
    lines.forEach((line) => expect(line).toHaveClass("block"));
  });

  it("il sottotitolo è attenuato e non tronca mai (va a capo)", () => {
    render(<HomeHeader greeting="Buonasera" userName="Vale" subtitle="Hai una lezione da riprendere" />);
    const subtitle = screen.getByText("Hai una lezione da riprendere");

    expect(subtitle).toHaveClass("text-[15px]", "leading-snug", "text-muted-foreground");
    expect(subtitle).not.toHaveClass("truncate");
    expect(subtitle).not.toHaveClass("font-display");
  });

  it("mantiene il carattere UI anche quando il messaggio contiene solo il nome", () => {
    render(<HomeHeader userName="Alessandro" />);
    expect(screen.getByRole("heading", { level: 1, name: "Alessandro" })).toHaveClass("font-display");
  });

  it("la scala del saluto è compatta: 32 / 40 / 48 px (2.1 §5, mai gigantesco)", () => {
    render(<HomeHeader greeting="Buongiorno" userName="Vale" />);
    const heading = screen.getByRole("heading", { level: 1 });
    const rem = (prefix: string) => {
      const match = heading.className.match(new RegExp(`${prefix}text-\\[([\\d.]+)rem\\]`));
      return match ? Number(match[1]) : null;
    };
    expect(rem("(?<![a-z]:)")).toBe(2);       // 32px
    expect(rem("sm:")).toBe(2.5);             // 40px
    expect(rem("lg:")).toBe(3);               // 48px
    // la rampa resta monotona crescente e non torna ai giganti D1 (43–86px)
    expect(rem("sm:")).toBeGreaterThan(rem("(?<![a-z]:)")!);
    expect(rem("lg:")).toBeGreaterThan(rem("sm:")!);
    expect(rem("lg:")!).toBeLessThan(3.5);
  });

  it("tiene il saluto su un solo rigo: break-words resta solo sul nome", () => {
    render(<HomeHeader greeting="Buonasera" userName="Bartolomeo" />);
    const heading = screen.getByRole("heading", { level: 1 });
    const [greetingLine, nameLine] = Array.from(heading.querySelectorAll("span"));
    expect(heading).not.toHaveClass("break-words");
    expect(greetingLine).not.toHaveClass("break-words");
    expect(nameLine).toHaveClass("break-words");
  });
});
