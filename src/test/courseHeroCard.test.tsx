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

    expect(article).toHaveClass("bg-[#ffffff]", "text-[#0a0a0a]", "rounded-[8px]");
    expect(title).toHaveClass("text-[#0a0a0a]");
    expect(title).not.toHaveClass("text-contrast");
    expect(article.style.getPropertyValue("--contrast-ink")).toBe("");
    expect(article).not.toHaveAttribute("data-auto-contrast");
  });

  it("uses the same near-black ink for the empty-state title", () => {
    const { container } = render(<CourseHeroCard emptyTitle="Scegli un percorso" />);
    const article = container.querySelector("article")!;
    const title = screen.getByRole("heading", { level: 2, name: "Scegli un percorso" });

    expect(article).toHaveClass("bg-[#ffffff]", "rounded-[8px]");
    expect(title).toHaveClass("text-[#0a0a0a]");
    expect(title).not.toHaveClass("text-contrast");
    expect(article).not.toHaveAttribute("data-auto-contrast");
  });
});
