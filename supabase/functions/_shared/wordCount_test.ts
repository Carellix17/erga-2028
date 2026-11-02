import { countWords } from "./wordCount.ts";

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

Deno.test("counts words while stripping simple Markdown and inline LaTeX", () => {
  assertEquals(countWords("## Titolo\n**ciao** mondo $x^2$"), 3, "acceptance example");
});

Deno.test("keeps Markdown link labels and code text, but removes link URLs", () => {
  assertEquals(countWords("Leggi [questo link](https://example.com) e `codice`"), 5, "visible text count");
});

Deno.test("returns zero for empty or whitespace-only text", () => {
  assertEquals(countWords(""), 0, "empty text");
  assertEquals(countWords(" \n\t "), 0, "whitespace-only text");
});
