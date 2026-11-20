import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseHeroCard } from "@/components/home/CourseHeroCard";
import { getCourseImage } from "@/lib/courseImages";

describe("Copertina del percorso in Home", () => {
  it("usa la materia del materiale e rende la foto decorativa", () => {
    const onPrimaryCta = vi.fn();
    const { container } = render(
      <CourseHeroCard
        courseTitle="Appunti.pdf"
        coverSubject="scienze"
        lessonTitle="Selezione naturale"
        primaryCtaLabel="Riprendi"
        onPrimaryCta={onPrimaryCta}
      />,
    );

    expect(container.querySelector("article")).toHaveClass("course-cover-surface", "text-foreground");
    expect(screen.getByRole("heading", { level: 2, name: "Appunti.pdf" })).toBeVisible();
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", getCourseImage("scienze"));
    expect(image).toHaveAttribute("alt", "");
    expect(image?.parentElement).toHaveAttribute("aria-hidden", "true");
    fireEvent.error(image!);
    expect(image).toHaveAttribute("hidden");
    expect(container.querySelector("[data-cover-root]")).toBeInTheDocument();

    const cta = screen.getByRole("button", { name: "Riprendi" });
    expect(cta).toHaveClass("rounded-button", "bg-transparent");
    fireEvent.click(cta);
    expect(onPrimaryCta).toHaveBeenCalled();
  });

  it("mantiene lo stato vuoto scuro senza scaricare una foto", () => {
    const { container } = render(
      <CourseHeroCard emptyTitle="Scegli un percorso" emptyCtaLabel="Aggiungi materiale" />,
    );
    expect(container.querySelector("article")).toHaveClass("course-cover-surface", "text-foreground");
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Scegli un percorso" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Aggiungi materiale" })).toHaveClass("bg-transparent");
  });
});
