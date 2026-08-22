import { afterEach, describe, expect, it } from "vitest";
import {
  applyAutoContrast,
  averageCssGradient,
  compositeOver,
  contrastRatio,
  parseCssColor,
  pickContrastInk,
  refreshAutoContrast,
  relativeLuminance,
} from "@/lib/autoContrast";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("class");
});

describe("parseCssColor", () => {
  it("legge hex a 3, 6 e 8 cifre", () => {
    expect(parseCssColor("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseCssColor("#121212")).toEqual({ r: 18, g: 18, b: 18, a: 1 });
    expect(parseCssColor("#00000080")?.a).toBeCloseTo(0.5, 1);
  });

  it("legge rgb/rgba con virgole e con la sintassi moderna", () => {
    expect(parseCssColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseCssColor("rgba(10, 20, 30, 0.5)")?.a).toBe(0.5);
    expect(parseCssColor("rgb(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });

  it("legge hsl/hsla (il formato dei colori materia)", () => {
    const storia = parseCssColor("hsl(18 45% 45%)");
    expect(storia).not.toBeNull();
    expect(storia!.r).toBeGreaterThan(storia!.b); // terracotta: rosso > blu
    expect(parseCssColor("hsl(0, 0%, 100%)")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseCssColor("hsla(0, 0%, 0%, 0.5)")?.a).toBe(0.5);
  });

  it("riconosce transparent e i nomi base, rifiuta valori assurdi", () => {
    expect(parseCssColor("transparent")?.a).toBe(0);
    expect(parseCssColor("white")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseCssColor("black")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseCssColor("supercalifragilistico")).toBeNull();
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor(null)).toBeNull();
  });
});

describe("luminanza e contrasto WCAG", () => {
  it("bianco = 1, nero = 0", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 1 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 1 })).toBe(0);
  });

  it("bianco/nero = 21:1, colore con sé stesso = 1:1", () => {
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const black = { r: 0, g: 0, b: 0, a: 1 };
    expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0); // simmetrico
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });

  it("premoltiplica l'alfa nel compositing", () => {
    const halfBlack = compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
    expect(halfBlack.r).toBeCloseTo(127.5, 0);
    expect(halfBlack.a).toBe(1);
    const transparent = compositeOver({ r: 0, g: 0, b: 0, a: 0 }, { r: 200, g: 100, b: 50, a: 1 });
    expect(transparent).toEqual({ r: 200, g: 100, b: 50, a: 1 });
  });
});

describe("pickContrastInk", () => {
  it("sceglie la panna su fondo scuro (marrone materia sfumato nel nero)", () => {
    const pick = pickContrastInk({ r: 60, g: 45, b: 40, a: 1 });
    expect(pick.channels).toBe("248 247 221"); // P29: #F8F7DD, non bianco puro
    expect(pick.tone).toBe("light-text");
    expect(pick.ratio).toBeGreaterThan(4.5); // almeno AA per testo normale
  });

  it("sceglie il quasi-nero su fondo chiaro", () => {
    const pick = pickContrastInk({ r: 240, g: 235, b: 230, a: 1 });
    expect(pick.channels).toBe("17 17 17");
    expect(pick.tone).toBe("dark-text");
    expect(pick.ratio).toBeGreaterThan(4.5);
  });
});

describe("averageCssGradient", () => {
  it("media gli stop pesandoli per posizione", () => {
    const avg = averageCssGradient("linear-gradient(180deg, rgb(0, 0, 0) 0%, rgb(255, 255, 255) 100%)");
    expect(avg).not.toBeNull();
    expect(avg!.r).toBeGreaterThan(120);
    expect(avg!.r).toBeLessThan(135);
    expect(avg!.a).toBe(1);
  });

  it("tiene conto dell'alfa dei veli (scrim scuro su trasparente)", () => {
    const avg = averageCssGradient(
      "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%)",
    );
    expect(avg).not.toBeNull();
    expect(avg!.a).toBeGreaterThan(0.2);
    expect(avg!.a).toBeLessThan(0.35);
  });

  it("ignora valori che non sono gradienti", () => {
    expect(averageCssGradient("none")).toBeNull();
    expect(averageCssGradient("url(immagine.png)")).toBeNull();
  });
});

describe("blocchi data-auto-contrast (DOM)", () => {
  it("fondo scuro sul blocco → inchiostro panna", () => {
    document.body.innerHTML =
      '<div data-auto-contrast id="block" style="background-color: rgb(45, 30, 30)"><p>ciao</p></div>';
    const block = document.getElementById("block") as HTMLElement;
    const pick = applyAutoContrast(block);
    expect(pick.tone).toBe("light-text");
    expect(block.style.getPropertyValue("--contrast-ink")).toBe("248 247 221");
    expect(block.getAttribute("data-contrast-tone")).toBe("light-text");
  });

  it("fondo chiaro → inchiostro scuro", () => {
    document.body.innerHTML =
      '<div data-auto-contrast id="block" style="background-color: rgb(250, 248, 245)"><p>ciao</p></div>';
    const block = document.getElementById("block") as HTMLElement;
    const pick = applyAutoContrast(block);
    expect(pick.tone).toBe("dark-text");
    expect(block.style.getPropertyValue("--contrast-ink")).toBe("17 17 17");
  });

  it("legge il fondo dai layer marcati data-contrast-layer anche se il blocco è trasparente", () => {
    // È il caso reale: la card è trasparente, il colore vive nei layer
    // di CourseCardBackground (base scura + velo nero sopra).
    document.body.innerHTML = `
      <div data-auto-contrast id="block">
        <div data-contrast-layer="base" style="background-color: rgb(143, 111, 42)"></div>
        <div data-contrast-layer="shade" style="background-color: rgba(0, 0, 0, 0.5)"></div>
        <h2>Titolo lezione</h2>
      </div>`;
    const block = document.getElementById("block") as HTMLElement;
    const pick = applyAutoContrast(block);
    expect(pick.tone).toBe("light-text");
  });

  it("si aggiorna quando il layer cambia colore (cambio corso)", () => {
    document.body.innerHTML = `
      <div data-auto-contrast id="block">
        <div data-contrast-layer="base" id="base" style="background-color: rgb(15, 15, 15)"></div>
      </div>`;
    const block = document.getElementById("block") as HTMLElement;
    applyAutoContrast(block);
    expect(block.getAttribute("data-contrast-tone")).toBe("light-text");

    const base = document.getElementById("base") as HTMLElement;
    base.style.backgroundColor = "rgb(245, 242, 238)";
    applyAutoContrast(block);
    expect(block.getAttribute("data-contrast-tone")).toBe("dark-text");
    expect(block.style.getPropertyValue("--contrast-ink")).toBe("17 17 17");
  });

  it("refreshAutoContrast processa tutti i blocchi connessi", () => {
    document.body.innerHTML = `
      <div data-auto-contrast style="background-color: rgb(20, 20, 20)"></div>
      <div data-auto-contrast style="background-color: rgb(250, 250, 250)"></div>
      <div><span>nessun marcatore</span></div>`;
    const processed = refreshAutoContrast(document);
    expect(processed).toBe(2);
    const blocks = document.querySelectorAll<HTMLElement>("[data-auto-contrast]");
    expect(blocks[0].getAttribute("data-contrast-tone")).toBe("light-text");
    expect(blocks[1].getAttribute("data-contrast-tone")).toBe("dark-text");
  });
});
