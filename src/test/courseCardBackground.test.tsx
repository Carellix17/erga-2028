import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { resolveCourseCover } from "@/lib/courseIdentity";

/**
 * Copertina astratta V2-01 (DESIGN.md 2.1 §4).
 * Campo dominante del colore materia, forme nette, grana discreta.
 * Le vecchie varianti con orb sfocati e cover Wikipedia sono archiviate.
 */

const layerNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-cover-layer]"))
    .map((node) => node.getAttribute("data-cover-layer"));

describe("CourseCardBackground — composizione astratta della copertina", () => {
  it("campo dominante + forme della variante + grana, niente blur né immagini", () => {
    const { container } = render(<CourseCardBackground courseName="Storia del Novecento" />);
    const root = container.querySelector<HTMLElement>("[data-cover-root]")!;

    // struttura: campo, due forme, grana
    const layers = layerNames(container);
    expect(layers[0]).toBe("field");
    expect(layers[layers.length - 1]).toBe("grain");
    expect(layers.filter((l) => l!.startsWith("shape")).length).toBeGreaterThanOrEqual(2);

    // il campo è un colore pieno (nessun gradiente, nessuna immagine)
    const field = container.querySelector<HTMLElement>('[data-cover-layer="field"]')!;
    expect(field.style.backgroundColor).toMatch(/^rgb\(|#/);
    expect(container.querySelector("img")).toBeNull();
    // niente classi di sfocatura sulle forme
    container.querySelectorAll("[data-cover-layer]").forEach((node) => {
      expect(node.className).not.toMatch(/blur/);
    });

    // la grana è il layer condiviso dichiarato
    expect(container.querySelector('[data-cover-layer="grain"]')).toHaveClass("cover-grain");
    // metadati per test e detector
    expect(root.getAttribute("data-cover-family")).toMatch(/^(light|deep)$/);
    expect(root.getAttribute("data-cover-layout")).toMatch(/^[012]$/);
  });

  it("tre varianti di composizione stabili per corso (stesso corso = stessa identità)", () => {
    const a = resolveCourseCover("Matematica — equazioni e funzioni");
    const b = resolveCourseCover("Matematica — equazioni e funzioni");
    expect(a.layout).toBe(b.layout);
    expect(a.field).toBe(b.field);
    expect(a.family).toBe(b.family);

    // le tre varianti esistono davvero nell'insieme dei corsi reali
    const layouts = new Set(
      ["Storia del Novecento", "Matematica — equazioni", "Economia politica",
       "Scienze — biologia", "Letteratura italiana", "Filosofia moderna",
       "Fisica — meccanica", "Informatica e programmazione", "Storia dell'arte",
       "Diritto costituzionale", "Inglese — grammatica"]
        .map((n) => resolveCourseCover(n).layout),
    );
    expect(layouts.size).toBe(3);
  });

  it("la famiglia segue la materia (non tutte le copertine uguali)", () => {
    const light = resolveCourseCover("Letteratura italiana");
    const deep = resolveCourseCover("Storia dell'arte antica");
    // assegnazione fissa di sistema: letteratura è light, storia è deep
    expect(light.family).toBe("light");
    expect(deep.family).toBe("deep");
    expect(light.ink).not.toBe(deep.ink);
  });

  it("la personalizzazione del colore vince sul rilevamento dal nome", () => {
    const auto = resolveCourseCover("Storia del Novecento");
    const custom = resolveCourseCover("Storia del Novecento", "arte");
    expect(auto.subjectKey).toBe("storia");
    expect(custom.subjectKey).toBe("arte");
    expect(custom.field).toBe(resolveCourseCover("Arte").field);
  });

  it("il fallback senza materia riconosciuta è stabile e leggibile", () => {
    // nome senza parole chiave → materia STABILE via hash (contratto
    // preesistente di getStableSubjectColor): stessa chiamata, stessa identità
    const fb = resolveCourseCover("zzz corso sconosciuto qqq");
    expect(fb).toEqual(resolveCourseCover("zzz corso sconosciuto qqq"));
    // famiglia e inchiostro coerenti (il contrasto lo garantisce il resolver)
    if (fb.family === "light") expect(fb.ink).toBe("#252623");
    else expect(fb.ink).toBe("#FFFEF9");
    // il titolo vuoto (nessun corso) è comunque stabile
    expect(resolveCourseCover("")).toEqual(resolveCourseCover(""));
  });
});
