import { describe, it, expect } from "vitest";
import {
  buildModulePush,
  buildPathPush,
  cleanMaterialName,
} from "../../supabase/functions/_shared/modulePush";

// 🔔 PACCHETTO 1 — collaudo delle notifiche oneste: la push dice COSA è
// successo davvero, non quello che ci si augurava.

describe("🔔 buildModulePush — notifica onesta del modulo", () => {
  it("modulo completo → 'pronto'", () => {
    const msg = buildModulePush({ done: 4, total: 4, moduleIndex: 1, fileName: "Fisica.pdf" });
    expect(msg.title).toBe("Modulo 2 pronto 📚");
    expect(msg.body).toContain("Fisica");
    expect(msg.body).not.toContain("su 4");
  });

  it("modulo parziale → 'parzialmente pronto' CON i numeri veri", () => {
    const msg = buildModulePush({ done: 2, total: 4, moduleIndex: 0, fileName: "Storia.pdf" });
    expect(msg.title).toBe("Modulo 1 parzialmente pronto");
    expect(msg.body).toContain("2 lezioni su 4");
    expect(msg.body).toContain("Storia");
  });

  it("modulo fallito → 'non completato' e invito a riprovare", () => {
    const msg = buildModulePush({ done: 0, total: 4, moduleIndex: 2, fileName: "Chimica.pdf" });
    expect(msg.title).toBe("Modulo 3 non completato");
    expect(msg.body).toContain("interrotta");
  });

  it("nome file senza estensione e con fallback se manca", () => {
    expect(cleanMaterialName("Geografia.pdf")).toBe("Geografia");
    expect(cleanMaterialName(null)).toBe("il tuo materiale");
    expect(cleanMaterialName("   ")).toBe("il tuo materiale");
  });
});

describe("🔔 buildPathPush — notifica onesta del percorso", () => {
  it("primo modulo tutto caldo → messaggio classico", () => {
    const msg = buildPathPush({ warmDone: 4, warmCount: 4, fileName: "Latino.pdf" });
    expect(msg.title).toBe("Percorso pronto 🚀");
    expect(msg.body).toContain("già calde");
    expect(msg.body).not.toMatch(/prime \d+ lezioni/);
  });

  it("primo modulo parzialmente caldo → dice QUANTE sono calde", () => {
    const msg = buildPathPush({ warmDone: 2, warmCount: 4, fileName: "Filosofia.pdf" });
    expect(msg.body).toContain("prime 2 lezioni");
    expect(msg.body).toContain("già calde");
  });

  it("nessuna lezione calda → invita a preparare la prima lezione", () => {
    const msg = buildPathPush({ warmDone: 0, warmCount: 4, fileName: "Arte.pdf" });
    expect(msg.body).toContain("apri il percorso");
    expect(msg.body).not.toContain("già calde");
  });

  it("percorso da una sola lezione, riuscita → messaggio classico", () => {
    const msg = buildPathPush({ warmDone: 1, warmCount: 1, fileName: "Appunti.txt" });
    expect(msg.body).toContain("già calde");
  });
});
