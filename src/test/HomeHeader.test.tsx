import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeHeader } from "@/components/home/HomeHeader";
import tailwindConfig from "../../tailwind.config";

const fontFamilies = tailwindConfig.theme.extend.fontFamily;

describe("Font del messaggio di benvenuto", () => {
  it("carica Ubuntu Sans 500 da Google Fonts senza rimuovere gli altri font", () => {
    const html = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const link = doc.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href^="https://fonts.googleapis.com/css2"]');
    expect(link).not.toBeNull();

    const url = new URL(link!.href);
    expect(url.searchParams.getAll("family")).toEqual([
      "Montserrat:ital,wght@0,100..900;1,100..900",
      "Plus Jakarta Sans:wght@400;500;600;700;800",
      "Raleway:ital,wght@0,100..900;1,100..900",
      "Ubuntu Sans:wght@500",
      "Zalando Sans Expanded:ital,wght@0,200..900;1,200..900",
    ]);
    expect(url.searchParams.get("display")).toBe("swap");
  });

  it("limita Ubuntu Sans alla nuova utility del titolo, lasciando invariata la famiglia del contenitore", () => {
    expect(fontFamilies["welcome-title"]).toEqual(["Ubuntu Sans", "Montserrat", "system-ui", "sans-serif"]);
    expect(fontFamilies.welcome).toEqual(["Zalando Sans Expanded", "Montserrat", "system-ui", "sans-serif"]);
    expect(Object.entries(fontFamilies).filter(([, stack]) => stack.includes("Ubuntu Sans")).map(([name]) => name))
      .toEqual(["welcome-title"]);
  });

  it("applica Ubuntu Sans solo all'h1 preservando peso, scala e le due righe accessibili", () => {
    const { container } = render(<HomeHeader greeting="Buongiorno" userName="Vale" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Buongiorno Vale" });

    expect(heading).toHaveClass(
      "font-welcome-title", "font-medium",
      "text-[2.7rem]", "sm:text-[4.4rem]", "md:text-[4.8rem]", "lg:text-[5.4rem]",
      "leading-[1.05]", "tracking-tight", "text-balance",
    );
    expect(container.querySelectorAll(".font-welcome-title")).toHaveLength(1);
    const lines = heading.querySelectorAll("span");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent("Buongiorno");
    expect(lines[1]).toHaveTextContent("Vale");
    lines.forEach((line) => expect(line).toHaveClass("block"));
  });

  it("non trasferisce Ubuntu Sans al sottotitolo né al contenitore", () => {
    render(<HomeHeader greeting="Buonasera" userName="Vale" subtitle="Hai una lezione da riprendere" />);
    const subtitle = screen.getByText("Hai una lezione da riprendere");
    const wrapper = subtitle.parentElement!;

    expect(wrapper).toHaveClass("font-welcome");
    expect(wrapper).not.toHaveClass("font-welcome-title");
    expect(subtitle.closest(".font-welcome-title")).toBeNull();
    expect(subtitle).toHaveClass("text-base", "leading-snug", "text-muted-foreground");
    expect(subtitle).not.toHaveClass("font-medium");
  });

  it("mantiene il nuovo font anche quando il messaggio contiene solo il nome", () => {
    render(<HomeHeader userName="Alessandro" />);
    expect(screen.getByRole("heading", { level: 1, name: "Alessandro" })).toHaveClass("font-welcome-title");
  });

  it("riduce del 20% la scala del messaggio di benvenuto", () => {
    render(<HomeHeader greeting="Buongiorno" userName="Vale" />);
    const heading = screen.getByRole("heading", { level: 1 });
    const rem = (prefix: string) => {
      const match = heading.className.match(new RegExp(`${prefix}text-\\[([\\d.]+)rem\\]`));
      return match ? Number(match[1]) : null;
    };
    // gradini precedenti: 3.375rem base, 5.5rem sm, 6rem md, 6.75rem lg → -20% (×0.8)
    expect(rem("(?<![a-z]:)")).toBeCloseTo(3.375 * 0.8, 5);
    expect(rem("sm:")).toBeCloseTo(5.5 * 0.8, 5);
    expect(rem("md:")).toBeCloseTo(6 * 0.8, 5);
    expect(rem("lg:")).toBeCloseTo(6.75 * 0.8, 5);
    // la rampa resta monotona crescente
    expect(rem("sm:")).toBeGreaterThan(rem("(?<![a-z]:)")!);
    expect(rem("md:")).toBeGreaterThan(rem("sm:")!);
    expect(rem("lg:")).toBeGreaterThan(rem("md:")!);
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
