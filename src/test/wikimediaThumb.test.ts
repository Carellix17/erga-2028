import { originalUrlFromThumb, shortImageLabel } from "../../supabase/functions/_shared/wikimediaThumb";

/**
 * 🧪 P19 — Collaudo della ricetta thumb → originale (la "scala" web).
 */
describe("originalUrlFromThumb / shortImageLabel (P19)", () => {
  const THUMB =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Prise_de_la_Bastille.jpg/1280px-Prise_de_la_Bastille.jpg?utm_source=x";
  const ORIG = "https://upload.wikimedia.org/wikipedia/commons/4/4e/Prise_de_la_Bastille.jpg";

  it("thumb commons + query → originale pulito", () => {
    expect(originalUrlFromThumb(THUMB)).toBe(ORIG);
  });

  it("thumb della wiki italiana → originale", () => {
    const t = "https://upload.wikimedia.org/wikipedia/it/thumb/a/ab/Mappa%20antica.png/1024px-Mappa%20antica.png";
    expect(originalUrlFromThumb(t)).toBe("https://upload.wikimedia.org/wikipedia/it/a/ab/Mappa%20antica.png");
  });

  it("URL già originale (senza /thumb/) → null (niente scala)", () => {
    expect(originalUrlFromThumb(ORIG)).toBeNull();
    expect(originalUrlFromThumb("https://it.wikipedia.org/wiki/Special:FilePath/x.jpg")).toBeNull();
  });

  it("URL di un altro mondo → null", () => {
    expect(originalUrlFromThumb("https://esempio.it/foto.jpg")).toBeNull();
    expect(originalUrlFromThumb("")).toBeNull();
  });

  it("shortImageLabel: ultima parte, senza query, decodificata, max 48", () => {
    expect(shortImageLabel(THUMB)).toBe("1280px-Prise_de_la_Bastille.jpg");
    expect(shortImageLabel("https://x.it/a/Mappa%20di%20Italia.jpg")).toBe("Mappa di Italia.jpg");
    expect(shortImageLabel(`https://x.it/${"z".repeat(80)}.jpg`).length).toBeLessThanOrEqual(48);
  });
});
