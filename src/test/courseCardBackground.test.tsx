import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CourseCard } from "@/components/studio/CourseCard";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { cleanCourseName } from "@/lib/courseName";
import { contrastRatio, resolveCourseCover } from "@/lib/courseIdentity";
import { SUBJECT_PALETTE } from "@/lib/subjectColors";

/**
 * Copertina astratta V2-01 (DESIGN.md 2.1 §4).
 * Campo dominante del colore materia, forme nette, grana discreta.
 * Le vecchie varianti con orb sfocati e cover Wikipedia sono archiviate.
 */

const layerNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-cover-layer]"))
    .map((node) => node.getAttribute("data-cover-layer"));

const COURSE_TITLE_BY_SUBJECT: Record<string, string> = {
  storia: "Storia del Novecento",
  matematica: "Matematica — equazioni e funzioni",
  economia: "Economia politica",
  scienze: "Evoluzione e genetica",
  letteratura: "Letteratura italiana",
  filosofia: "Filosofia moderna",
  fisica: "Fisica — meccanica",
  informatica: "Informatica e programmazione",
  arte: "Arte e pittura",
  geografia: "Geografia fisica",
  diritto: "Diritto costituzionale",
  lingue: "Inglese — grammatica",
};

function cssColorToHex(value: string): string {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Colore CSS non supportato: ${value}`);
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function rgbChannelsToHex(value: string): string {
  const channels = value.trim().split(/\s+/).map(Number);
  if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
    throw new Error(`Canali RGB non validi: ${value}`);
  }
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function composite(background: string, foreground: string, opacity: number): string {
  const channels = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  const bg = channels(background);
  const fg = channels(foreground);
  return `#${bg.map((channel, index) => Math.round(channel * (1 - opacity) + fg[index] * opacity).toString(16).padStart(2, "0")).join("")}`;
}

/** Ricava i campioni effettivi del campo e delle forme dichiarate nel DOM. */
function renderedCoverSamples(container: HTMLElement): Array<[string, string]> {
  const field = container.querySelector<HTMLElement>('[data-cover-layer="field"]')!;
  const fieldColor = cssColorToHex(field.style.backgroundColor);
  const coverRoot = container.querySelector<HTMLElement>("[data-cover-root]")!;
  const layout = coverRoot.dataset.coverLayout;
  const layers = Array.from(container.querySelectorAll<HTMLElement>("[data-cover-layer^='shape-']"));
  const band = layers.find((layer) => layer.dataset.coverLayer === "shape-band");
  const main = layers.find((layer) => layer.dataset.coverLayer === "shape-main");
  const colorOf = (layer: HTMLElement) => cssColorToHex(layer.style.backgroundColor || layer.style.borderColor);
  const opacityOf = (layer: HTMLElement) => Number(layer.style.opacity || 1);
  const bandColor = band ? composite(fieldColor, colorOf(band), opacityOf(band)) : fieldColor;
  const mainColor = main ? composite(fieldColor, colorOf(main), opacityOf(main)) : fieldColor;
  const samples: Array<[string, string]> = [["field", fieldColor]];

  for (const layer of layers) {
    let underlay = fieldColor;
    if (layout === "1" && layer.dataset.coverLayer === "shape-main") underlay = bandColor;
    if (layout === "2" && layer.dataset.coverLayer === "shape-arc") underlay = mainColor;
    samples.push([
      layer.dataset.coverLayer ?? "shape",
      composite(underlay, colorOf(layer), opacityOf(layer)),
    ]);
  }
  return samples;
}

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

  it("ogni copertina renderizzata conserva ≥4,5:1 tra inchiostro e campo finale (incluse le forme)", () => {
    const paletteTitles = SUBJECT_PALETTE.map((subject) => {
      const title = COURSE_TITLE_BY_SUBJECT[subject.key];
      if (!title) throw new Error(`Manca un titolo campione per la palette ${subject.key}`);
      return title;
    });
    // Evoluzionismo non corrisponde a una keyword: il suo hash cambia se
    // l'estensione 🌐 ... .pdf non viene rimossa prima di risolvere il fondo.
    const titles = [...paletteTitles, "Evoluzionismo"];

    for (const title of titles) {
      const fileName = `🌐 ${title}.pdf`;
      const { container, unmount } = render(
        <CourseCard
          course={{ id: fileName, file_name: fileName }}
          actionLabel="Scegli corso"
          onSelect={() => {}}
        />,
      );
      const card = container.querySelector<HTMLElement>("button")!;
      const canonicalName = cleanCourseName(fileName);
      const expectedCover = resolveCourseCover(canonicalName);
      const ink = rgbChannelsToHex(card.style.getPropertyValue("--contrast-ink"));
      const samples = renderedCoverSamples(container);

      expect(canonicalName).toBe(title);
      expect(ink).toBe(expectedCover.ink.toLowerCase());

      for (const [layer, visibleColor] of samples) {
        const baseRatio = contrastRatio(ink, visibleColor);
        expect(baseRatio, `${title} / ${layer}: ${ink} su ${visibleColor} = ${baseRatio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(4.5);

        // Include gli estremi della grana: multiply diurno può scurire,
        // screen notturno può schiarire; in contrasto elevato è disattivata.
        for (const [theme, grainColor] of [["giorno", "#000000"], ["notte", "#FFFFFF"]] as const) {
          const finalColor = composite(visibleColor, grainColor, 0.05);
          const ratio = contrastRatio(ink, finalColor);
          expect(ratio, `${title} / ${layer} / ${theme}: ${ink} su ${finalColor} = ${ratio.toFixed(2)}:1`)
            .toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(samples[0]?.[1]).toBe(expectedCover.field);
      unmount();
    }
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
    if (fb.family === "light") expect(fb.ink).toBe("#11120D");
    else expect(fb.ink).toBe("#FFFBF4");
    // il titolo vuoto (nessun corso) è comunque stabile
    expect(resolveCourseCover("")).toEqual(resolveCourseCover(""));
  });
});
