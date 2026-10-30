import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseHeroCard } from "@/components/home/CourseHeroCard";

describe("CourseHeroCard title contrast", () => {
  it("uses the cover ink for the active course title", () => {
    const { container } = render(
      <CourseHeroCard
        courseTitle="Evoluzione"
        lessonTitle="Selezione naturale"
        primaryCtaLabel="Riprendi"
        onPrimaryCta={() => {}}
      />,
    );
    const article = container.querySelector("article")!;

    expect(screen.getByRole("heading", { level: 2, name: "Evoluzione" })).toHaveClass("text-contrast");
    expect(article.style.getPropertyValue("--contrast-ink")).toBeTruthy();
    expect(article).not.toHaveAttribute("data-auto-contrast");
  });

  it("uses a fixed foreground color for the empty-state title", () => {
    const { container } = render(<CourseHeroCard emptyTitle="Scegli un percorso" />);
    const article = container.querySelector("article")!;

    expect(screen.getByRole("heading", { level: 2, name: "Scegli un percorso" })).toHaveClass("text-foreground");
    expect(screen.getByRole("heading", { level: 2, name: "Scegli un percorso" })).not.toHaveClass("text-contrast");
    expect(article).not.toHaveAttribute("data-auto-contrast");
  });
});
