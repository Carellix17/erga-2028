import { mammothHtmlToMarkdown } from "../../supabase/functions/_shared/docxMarkdown";

/**
 * 🧪 P18 — Collaudo del traduttore DOCX → Markdown.
 * L'HTML di ingresso imita quello "semplice" prodotto da mammoth.
 */
describe("mammothHtmlToMarkdown (P18)", () => {
  it("stringa vuota → stringa vuota", () => {
    expect(mammothHtmlToMarkdown("")).toBe("");
  });

  it("titoli → cancelletti", () => {
    expect(mammothHtmlToMarkdown("<h1>Titolo</h1><h2>Capitolo</h2><h3>Sezione</h3>")).toBe(
      "# Titolo\n\n## Capitolo\n\n### Sezione",
    );
  });

  it("grassetto e corsivo sopravvivono", () => {
    expect(mammothHtmlToMarkdown("<p>Un <strong>concetto chiave</strong> e una <em>sfumatura</em>.</p>")).toBe(
      "Un **concetto chiave** e una *sfumatura*.",
    );
  });

  it("elenco puntato → trattini", () => {
    expect(mammothHtmlToMarkdown("<ul><li>primo</li><li>secondo</li></ul>")).toBe("- primo\n- secondo");
  });

  it("elenco numerato → numeri veri", () => {
    expect(mammothHtmlToMarkdown("<ol><li>alfa</li><li>beta</li><li>gamma</li></ol>")).toBe(
      "1. alfa\n2. beta\n3. gamma",
    );
  });

  it("li con <p> dentro non rompe la riga", () => {
    expect(mammothHtmlToMarkdown("<ul><li><p>voce con paragrafo</p></li></ul>")).toBe("- voce con paragrafo");
  });

  it("tabella con intestazioni <th> → pipe table", () => {
    const html = "<table><tr><th>Nome</th><th>Ruolo</th></tr><tr><td>Anna</td><td>Capo</td></tr><tr><td>Bob</td><td>Aiutante</td></tr></table>";
    expect(mammothHtmlToMarkdown(html)).toBe(
      "| Nome | Ruolo |\n| --- | --- |\n| Anna | Capo |\n| Bob | Aiutante |",
    );
  });

  it("tabella di soli <td>: la prima riga diventa intestazione", () => {
    const html = "<table><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></table>";
    expect(mammothHtmlToMarkdown(html)).toBe("| A1 | B1 |\n| --- | --- |\n| A2 | B2 |");
  });

  it("riga corta nella tabella viene imbottita di celle vuote", () => {
    const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>solo</td></tr></table>";
    expect(mammothHtmlToMarkdown(html)).toBe("| A | B |\n| --- | --- |\n| solo |  |");
  });

  it("la pipe dentro una cella viene messa al guinzaglio", () => {
    const html = "<table><tr><td>a|b</td></tr></table>";
    expect(mammothHtmlToMarkdown(html)).toBe("| a\\|b |\n| --- |");
  });

  it("link → [testo](url), anche col grassetto dentro", () => {
    expect(mammothHtmlToMarkdown('<p>Vedi <a href="https://esempio.it"><strong>questa fonte</strong></a>.</p>')).toBe(
      "Vedi [**questa fonte**](https://esempio.it).",
    );
  });

  it("le immagini base64 di mammoth vengono TAGLIATE (niente data-uri nel caveau)", () => {
    const html = '<p>testo<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEA" alt="figura"/>dopo</p>';
    const out = mammothHtmlToMarkdown(html);
    expect(out).toBe("testodopo");
    expect(out).not.toContain("data:");
  });

  it("entità HTML decodificate, con &amp; per ultima", () => {
    expect(mammothHtmlToMarkdown("<p>5 &lt; 6 &amp; 7 &gt; 4&nbsp;ok &#65;</p>")).toBe("5 < 6 & 7 > 4 ok A");
    expect(mammothHtmlToMarkdown("<p>&amp;lt; resta scritto</p>")).toBe("&lt; resta scritto");
  });

  it("a-capo <br> e paragrafi multipli", () => {
    expect(mammothHtmlToMarkdown("<p>riga uno<br/>riga due</p><p>altro paragrafo</p>")).toBe(
      "riga uno\nriga due\n\naltro paragrafo",
    );
  });

  it("niente triple a-capo: tre o più newline si comprimono", () => {
    expect(mammothHtmlToMarkdown("<p>uno</p><br/><br/><p>due</p>")).toBe("uno\n\ndue");
  });

  it("documento combinato: titolo + testo + elenco + tabella", () => {
    const html =
      "<h2>Rivoluzione francese</h2>" +
      "<p>Anno: <strong>1789</strong>.</p>" +
      "<ol><li>Presa della Bastiglia</li><li>Dichiarazione dei diritti</li></ol>" +
      "<table><tr><th>Evento</th><th>Data</th></tr><tr><td>Bastiglia</td><td>14 luglio</td></tr></table>";
    expect(mammothHtmlToMarkdown(html)).toBe(
      "## Rivoluzione francese\n\nAnno: **1789**.\n\n1. Presa della Bastiglia\n2. Dichiarazione dei diritti\n\n| Evento | Data |\n| --- | --- |\n| Bastiglia | 14 luglio |",
    );
  });
});
