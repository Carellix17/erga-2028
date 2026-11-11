import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Guardia strutturale del foglio "Aggiungi evento" (Piano).
 * Le modalità sono radio sempre visibili. Materia e data stanno una sotto
 * l'altra. L'ora di fine resta obbligatoria per una verifica nuova.
 */

const SHEET = readFileSync(join(__dirname, "..", "components", "piano", "AddEventSheet.tsx"), "utf8");
const IT = readFileSync(join(__dirname, "..", "..", "src", "i18n", "locales", "it.json"), "utf8");
const EN = readFileSync(join(__dirname, "..", "..", "src", "i18n", "locales", "en.json"), "utf8");

describe("AddEventSheet — densità P47", () => {
  it("mostra le modalità come radio visibili, non in una tendina nel titolo", () => {
    expect(SHEET).not.toContain("DropdownMenu");
    expect(SHEET).toContain("VERIFICA_MODES.map");
    expect(SHEET).toContain('role="radiogroup"');
    expect(SHEET).toContain('role="radio"');
    expect(SHEET).toContain("rounded-[24px]");
  });

  it("elenco modalità invariato, con Scritta per prima", () => {
    expect(SHEET).toContain('"scritta", "orale", "pratica", "interrogazione"');
    expect(SHEET).toContain("piano.sheet.modeOrale");
    expect(SHEET).toContain("piano.sheet.modeScritta");
    expect(SHEET).toContain("piano.sheet.modePratica");
    expect(SHEET).toContain("piano.sheet.modePresentazione");
  });

  it("in Verifica mette Materia, Data e orario prima del titolo", () => {
    const verificaBlock = SHEET.slice(
      SHEET.indexOf("{category === \"verifica\" && ("),
      SHEET.indexOf("{category === \"compito\" && (")
    );
    const subjectAt = verificaBlock.indexOf("{subjectSelect}");
    const dateAt = verificaBlock.indexOf("{dateField}");
    const timeAt = verificaBlock.indexOf("{timeRange(true)}");
    const titleAt = verificaBlock.indexOf("piano.sheet.title");
    expect(subjectAt).toBeGreaterThan(-1);
    expect(subjectAt).toBeLessThan(dateAt);
    expect(dateAt).toBeLessThan(timeAt);
    expect(timeAt).toBeLessThan(titleAt);
    expect(verificaBlock).not.toContain("grid grid-cols-2");
  });

  it("in Compito mette Materia e Data una sotto l'altra, prima della descrizione", () => {
    const compitoBlock = SHEET.slice(
      SHEET.indexOf("{category === \"compito\" && ("),
      SHEET.indexOf("{category === \"altro\" && (")
    );
    const subjectAt = compitoBlock.indexOf("{subjectSelect}");
    const dateAt = compitoBlock.indexOf("{dateField}");
    expect(subjectAt).toBeGreaterThan(-1);
    expect(subjectAt).toBeLessThan(dateAt);
    expect(dateAt).toBeLessThan(compitoBlock.indexOf("piano.sheet.compitoLabel"));
    expect(compitoBlock).not.toContain("grid grid-cols-2");
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
