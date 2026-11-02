import { countWords } from "../_shared/wordCount.ts";
import { toLessonMeta, type LessonListRow } from "./lessonMeta.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

function makeRow(overrides: Partial<LessonListRow> = {}): LessonListRow {
  return {
    id: "lesson-1",
    title: "Titolo della lezione",
    is_generated: true,
    lesson_order: 2,
    context_id: "context-1",
    page_start: 4,
    page_end: 6,
    concept: "Concetto fondamentale",
    explanation: "Una spiegazione con parole",
    example: "Un esempio semplice",
    exercises: [{ question: "1" }, { question: "2" }, { question: "3" }],
    ...overrides,
  };
}

Deno.test("toLessonMeta returns only the exact metadata keys, never lesson text", () => {
  const meta = toLessonMeta(makeRow());
  const expectedKeys = [
    "id",
    "title",
    "is_generated",
    "lesson_order",
    "context_id",
    "page_start",
    "page_end",
    "word_count",
    "exercise_count",
  ].sort();

  assertEquals(Object.keys(meta).sort(), expectedKeys, "metadata keys");
  assert(!("concept" in meta), "concept must not be returned");
  assert(!("explanation" in meta), "explanation must not be returned");
  assert(!("example" in meta), "example must not be returned");
  assert(!("exercises" in meta), "exercises must not be returned");
});

Deno.test("word_count sums the three text counts and treats a null example as zero", () => {
  const row = makeRow({ example: null });
  const expected = countWords(row.concept as string)
    + countWords(row.explanation as string)
    + countWords(typeof row.example === "string" ? row.example : "");

  assertEquals(toLessonMeta(row).word_count, expected, "summed word count");
});

Deno.test("non-generated placeholders have a null word_count", () => {
  const meta = toLessonMeta(makeRow({ is_generated: false }));
  assertEquals(meta.word_count, null, "placeholder word_count");
});

Deno.test("exercise_count is zero for non-arrays and the array length otherwise", () => {
  assertEquals(toLessonMeta(makeRow({ exercises: null })).exercise_count, 0, "null exercises");
  assertEquals(toLessonMeta(makeRow({ exercises: { items: [1, 2, 3] } })).exercise_count, 0, "object exercises");
  assertEquals(toLessonMeta(makeRow({ exercises: [1, 2, 3] })).exercise_count, 3, "three exercises");
});
