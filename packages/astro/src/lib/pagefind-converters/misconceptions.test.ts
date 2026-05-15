import type { MisconceptionEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toMisconceptionRecord } from "./misconceptions.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: MisconceptionEntry = {
  body: "Many beginners conflate apparent brightness with temperature.",
  chapter: "measuring-the-sky",
  anchor: "misc-2",
  length: "short",
  label: "Brighter ≠ hotter",
};

describe("toMisconceptionRecord", () => {
  test("filters.type is ['misconception']", () => {
    expect(toMisconceptionRecord(fixture, ctx).filters.type).toEqual([
      "misconception",
    ]);
  });

  test("meta.length carries the length discriminator", () => {
    expect(toMisconceptionRecord(fixture, ctx).meta.length).toBe("short");
  });

  test("meta.title is the optional label when present", () => {
    expect(toMisconceptionRecord(fixture, ctx).meta.title).toBe(
      "Brighter ≠ hotter"
    );
  });

  test("content carries the body HTML", () => {
    expect(toMisconceptionRecord(fixture, ctx).content).toContain(
      "Many beginners conflate apparent brightness with temperature."
    );
  });
});
