import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PathHero } from "@/components/studio/PathHero";

// 🛡️ P24 regressione: il selettore "Cambia corso" del banner non deve
// esplodere (bug: createPortal importato male -> ErrorBoundary "Ops").
describe("PathHero — selettore percorsi", () => {
  const courses = [
    { id: "1", file_name: "storia.pdf", lesson_count: 5 },
    { id: "2", file_name: "matematica.pdf", lesson_count: 8 },
  ];

  it("apre il selettore senza errori", () => {
    render(
      <PathHero
        title="Storia"
        completedCount={1}
        totalLessons={5}
        canResume
        onResume={() => {}}
        courses={courses}
        activeCourseId="1"
        onSelectCourse={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Cambia corso"));
    expect(screen.getByText("I tuoi percorsi")).toBeTruthy();
  });

  it("cliccando un corso chiama onSelectCourse con il suo id", () => {
    const onSelect = vi.fn();
    render(
      <PathHero
        title="Storia"
        completedCount={1}
        totalLessons={5}
        canResume
        onResume={() => {}}
        courses={courses}
        activeCourseId="1"
        onSelectCourse={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Cambia corso"));
    fireEvent.click(screen.getByText("matematica"));
    expect(onSelect).toHaveBeenCalledWith("2");
  });
});
