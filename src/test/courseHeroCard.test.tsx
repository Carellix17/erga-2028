import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseHeroCard } from "@/components/home/CourseHeroCard";

describe("CourseHeroCard title contrast", () => {
  it("uses a white surface and near-black ink for the active lesson", () => {
    const { container } = render(
      <CourseHeroCard
        courseTitle="Evoluzione"
        lessonTitle="Selezione naturale"
        primaryCtaLabel="Riprendi"
        onPrimaryCta={() => {}}
      />,
    );
    const article = container.querySelector("article")!;
    const title = screen.getByRole("heading", { level: 2, name: "Evoluzione" });

    expect(article).toHaveClass("bg-[#FFFBF4]", "text-[#0a0a0a]", "rounded-[24px]");
    expect(title).toHaveClass("text-[#0a0a0a]");
    const cta = screen.getByRole("button", { name: "Riprendi" });
    expect(cta).toHaveClass(
      "bg-[#0a0a0a]",
      "text-[#ffffff]",
      "border-[#0a0a0a]",
      "hover:bg-[#1a1c20]",
      "hover:text-[#ffffff]",
      "focus-visible:ring-[#0a0a0a]",
      "focus-visible:ring-offset-[#FFFBF4]",
    );
    expect(cta.className).not.toMatch(/bg-transparent|text-foreground|border-foreground/);
    expect(title).not.toHaveClass("text-contrast");
    expect(article.style.getPropertyValue("--contrast-ink")).toBe("");
    expect(article).not.toHaveAttribute("data-auto-contrast");
  });

  it("uses the same near-black ink for the empty-state title", () => {
    const { container } = render(
      <CourseHeroCard emptyTitle="Scegli un percorso" emptyCtaLabel="Aggiungi materiale" />,
    );
    const article = container.querySelector("article")!;
    const title = screen.getByRole("heading", { level: 2, name: "Scegli un percorso" });
    const cta = screen.getByRole("button", { name: /aggiungi materiale/i });

    expect(article).toHaveClass("bg-[#FFFBF4]", "rounded-[24px]");
    expect(title).toHaveClass("text-[#0a0a0a]");
    expect(title).not.toHaveClass("text-contrast");
    expect(article).not.toHaveAttribute("data-auto-contrast");
    expect(cta).toHaveClass("bg-[#0a0a0a]", "text-[#ffffff]");
  });
});
