import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeHeader } from "@/components/home/HomeHeader";
import tailwindConfig from "../../tailwind.config";

const fontFamilies = tailwindConfig.theme.extend.fontFamily;

/**
 * Saluto della Home — pilota V2-01 (DESIGN.md 2.1 §5, §9).
 * Serif compatto (Lora 400/500): 32px telefono, 40 sm, 48 lg.
 * «Compact, mai gigantesco»: la scala D1 da 43–86px è archiviata.
 */

describe("Font del messaggio di benvenuto", () => {
  it("carica Lora e Inter da Google Fonts come family variable (2.1 §5)", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const link = doc.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href^="https://fonts.googleapis.com/css2"]');
    expect(link).not.toBeNull();

    const url = new URL(link!.href);
    expect(url.searchParams.getAll("family").sort()).toEqual([
      "Inter:ital,wght@0,400..700;1,400..700",
      "Lora:ital,wght@0,400..700;1,400..700",
    ]);
    expect(url.searchParams.get("display")).toBe("swap");
  });

  it("configura Lora per il display serif e Inter per interfaccia e lettura", () => {
    expect(fontFamilies.display).toEqual(["Lora", "Georgia", "serif"]);
    expect(fontFamilies.serif).toEqual(["Lora", "Georgia", "serif"]);
    expect(fontFamilies.sans).toEqual(["Inter", "system-ui", "-apple-system", "sans-serif"]);
    expect(fontFamilies.reading).toEqual(["Inter", "system-ui", "-apple-system", "sans-serif"]);
    expect(fontFamilies).not.toHaveProperty("welcome-title");
    expect(fontFamilies).not.toHaveProperty("welcome");
  });

  it("applica il serif al titolo preservando peso, scala compatta e le due righe accessibili", () => {
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

  it("il sottotitolo è Inter attenuato e non tronca mai (va a capo)", () => {
    render(<HomeHeader greeting="Buonasera" userName="Vale" subtitle="Hai una lezione da riprendere" />);
    const subtitle = screen.getByText("Hai una lezione da riprendere");

    expect(subtitle).toHaveClass("text-[15px]", "leading-snug", "text-muted-foreground");
    expect(subtitle).not.toHaveClass("truncate");
    expect(subtitle).not.toHaveClass("font-display");
  });

  it("mantiene il serif anche quando il messaggio contiene solo il nome", () => {
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
