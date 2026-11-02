import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 🛡️ P47 — Guardia strutturale del foglio "Aggiungi evento" (Piano).
 * Verifica (leggendo il sorgente) che restino in piedi le decisioni di
 * layout/densità del P47: barra unica Titolo+Modalità con tendina a
 * DropdownMenu, Data+Materia affiancate a 2 colonne in Verifica e Compito,
 * ora di fine OBBLIGATORIA per la verifica nuova, e messaggi i18n presenti
 * in entrambe le lingue. Non rende i componenti (servono Radix/Dialog):
 * controlla la struttura come gli altri test di guardia della repo.
 */

const SHEET = readFileSync(join(__dirname, "..", "components", "piano", "AddEventSheet.tsx"), "utf8");
const IT = readFileSync(join(__dirname, "..", "..", "src", "i18n", "locales", "it.json"), "utf8");
const EN = readFileSync(join(__dirname, "..", "..", "src", "i18n", "locales", "en.json"), "utf8");

describe("AddEventSheet — densità P47", () => {
  it("fonde Titolo e Modalità in un'unica barra con DropdownMenu (niente riga 'Modalità' separata)", () => {
    // importa e usa il DropdownMenu (pill a destra nella stessa barra)
    expect(SHEET).toContain("DropdownMenu");
    expect(SHEET).toContain("DropdownMenuTrigger");
    expect(SHEET).toContain("DropdownMenuContent");
    expect(SHEET).toContain("VERIFICA_MODES.map");
    // La modalità è annunciata insieme al valore visibile, senza aria-label generici.
    expect(SHEET).toContain('<span className="sr-only">{t("piano.sheet.mode")}:</span>');
    expect(SHEET).not.toMatch(/aria-label=\{t\("piano\.sheet\.mode"\)\}/);
    expect(SHEET).toContain("DropdownMenuRadioGroup");
    expect(SHEET).toContain("DropdownMenuRadioItem");
  });

  it("elenco modalità invariato: Orale, Scritta, Pratica, Interrogazione", () => {
    expect(SHEET).toContain('"orale", "scritta", "pratica", "interrogazione"');
    expect(SHEET).toContain("piano.sheet.modeOrale");
    expect(SHEET).toContain("piano.sheet.modeScritta");
    expect(SHEET).toContain("piano.sheet.modePratica");
    expect(SHEET).toContain("piano.sheet.modePresentazione");
  });

  it("Data e Materia sono affiancate a 2 colonne sia in Verifica che in Compito", () => {
    const verificaBlock = SHEET.slice(
      SHEET.indexOf("{category === \"verifica\" && ("),
      SHEET.indexOf("{category === \"compito\" && (")
    );
    const compitoBlock = SHEET.slice(
      SHEET.indexOf("{category === \"compito\" && ("),
      SHEET.indexOf("{category === \"altro\" && (")
    );
    expect(verificaBlock).toContain("grid grid-cols-2 gap-3");
    expect(verificaBlock).toContain("{dateField}");
    expect(verificaBlock).toContain("{subjectSelect}");
    expect(compitoBlock).toContain("grid grid-cols-2 gap-3");
    expect(compitoBlock).toContain("{dateField}");
    expect(compitoBlock).toContain("{subjectSelect}");
  });

  it("per la verifica l'ora di fine è obbligatoria: timeRange(true), niente '(opzionale)'", () => {
    expect(SHEET).toContain("{timeRange(true)}");
    // il "(opzionale)" resta solo nel caso requireEnd=false (tab Altro)
    expect(SHEET).toMatch(/optional/);
    expect(SHEET).not.toMatch(/endTime"\)\} <span[^>]*>\(opzionale\)/);
  });

  it("mantiene in Altro Note e ora di fine opzionali e mostra l'errore sotto il campo", () => {
    const altroBlock = SHEET.slice(
      SHEET.indexOf('{category === "altro" && ('),
      SHEET.indexOf('<Button type="submit"')
    );
    expect(altroBlock).toContain("{timeRange(false)}");
    expect(altroBlock.match(/t\("piano\.sheet\.notes"\)/g)).toHaveLength(1);
    expect(altroBlock).not.toContain("piano.sheet.optional");
    expect(altroBlock).toContain('renderFieldError("endTime", ids.endTimeError, endError');
    expect(SHEET).toContain('setEndTime("")');
    expect(SHEET).toContain("validateAltroTimes");
    expect(SHEET).toContain("{timeRange(true)}");
    expect(IT).toContain('"notes": "Note (opzionale)"');
    expect(EN).toContain('"notes": "Notes (optional)"');
  });

  it("valida: fine mancante alla creazione e fine <= inizio", () => {
    expect(SHEET).toContain("endTimeRequired");
    expect(SHEET).toContain("endTimeAfterStart");
    expect(SHEET).toContain("validateVerificaTimes");
    expect(SHEET).toContain('role="alert"');
  });

  it("le nuove etichette di errore esistono in italiano e inglese", () => {
    expect(IT).toContain('"endTimeRequired"');
    expect(IT).toContain('"endTimeAfterStart"');
    expect(EN).toContain('"endTimeRequired"');
    expect(EN).toContain('"endTimeAfterStart"');
  });

  it("usa la precompilazione dell'ora e aiuti localizzati", () => {
    expect(SHEET).toContain("addOneHour");
    expect(SHEET).toContain("endTouched");
    expect(IT).toContain('"endTimeDefaultHint"');
    expect(EN).toContain('"endTimeDefaultHint"');
    expect(IT).toContain('"requiredFieldsHint": "I campi obbligatori sono indicati"');
    expect(EN).toContain('"requiredFieldsHint": "Required fields are indicated"');
  });

  it("usa le etichette delle schede e della modalità tradotte e capitalizzate", () => {
    expect(IT).toContain('"verifica": "Verifica"');
    expect(IT).toContain('"compito": "Compito"');
    expect(IT).toContain('"altro": "Altro"');
    expect(IT).toContain('"modePresentazione": "Interrogazione"');
    expect(EN).toContain('"verifica": "Test"');
    expect(EN).toContain('"compito": "Assignment"');
    expect(EN).toContain('"altro": "Other"');
    expect(EN).toContain('"modePresentazione": "Oral test"');
  });
});
