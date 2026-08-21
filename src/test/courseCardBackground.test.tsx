import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";

const layerNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-course-card-layer]"))
    .map((node) => node.getAttribute("data-course-card-layer"));

describe("CourseCardBackground — sfumature card corso", () => {
  it("lascia invariato lo sfondo predefinito condiviso con la Home", () => {
    const { container } = render(
      <CourseCardBackground coverUrl={null} subjectColor="hsl(350 30% 50%)" />,
    );
    const layers = Array.from(container.children) as HTMLElement[];

    expect(layerNames(container)).toEqual([]);
    expect(layers[0]?.style.backgroundColor).toBeTruthy();
    expect(layers[0]?.style.backgroundImage).toBe("");
    expect(layers[1]).toHaveClass("via-scrim/20", "to-scrim/70");
    expect(layers[2]).toHaveClass("-top-10", "-right-10", "blur-2xl");
    expect(layers[3]).toHaveClass("top-4", "left-6", "blur-3xl");
  });

  it("mantiene l'ordine approvato: base, cover, discesa e due aloni", () => {
    const { container } = render(
      <CourseCardBackground
        coverUrl="https://example.com/cover.jpg"
        subjectColor="hsl(350 30% 50%)"
        variant="studio"
      />,
    );

    expect(layerNames(container)).toEqual([
      "base",
      "cover",
      "shade",
      "orb-main",
      "orb-secondary",
    ]);
  });

  it("usa una discesa morbida e aloni separati nelle posizioni corrette", () => {
    const { container } = render(
      <CourseCardBackground
        coverUrl={null}
        subjectColor="hsl(350 30% 50%)"
        variant="studio"
      />,
    );

    const base = container.querySelector<HTMLElement>('[data-course-card-layer="base"]');
    const shade = container.querySelector<HTMLElement>('[data-course-card-layer="shade"]');
    const main = container.querySelector<HTMLElement>('[data-course-card-layer="orb-main"]');
    const secondary = container.querySelector<HTMLElement>('[data-course-card-layer="orb-secondary"]');

    expect(base?.getAttribute("style")).toContain("linear-gradient");
    expect(shade).toHaveClass("via-scrim/[0.08]", "to-scrim/[0.55]");
    expect(main).toHaveClass("-top-28", "-right-28", "blur-[6px]");
    expect(secondary).toHaveClass("-top-6", "-left-[88px]", "blur-[18px]");
    expect(main?.style.opacity).toBe("0.42");
    expect(secondary?.style.opacity).toBe("0.38");
  });

  it("ricalcola davvero la sfumatura quando cambia la materia", () => {
    const { container, rerender } = render(
      <CourseCardBackground
        coverUrl={null}
        subjectColor="hsl(350 30% 50%)"
        variant="studio"
      />,
    );
    const artGradient = container
      .querySelector<HTMLElement>('[data-course-card-layer="base"]')
      ?.getAttribute("style");

    rerender(
      <CourseCardBackground
        coverUrl={null}
        subjectColor="hsl(210 36% 42%)"
        variant="studio"
      />,
    );
    const mathGradient = container
      .querySelector<HTMLElement>('[data-course-card-layer="base"]')
      ?.getAttribute("style");

    expect(artGradient).toBeTruthy();
    expect(mathGradient).toBeTruthy();
    expect(mathGradient).not.toBe(artGradient);
  });
});
