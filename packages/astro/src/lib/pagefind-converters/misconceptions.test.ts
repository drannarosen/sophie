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
  unit: "measuring-the-sky",
  anchor: "misc-2",
  length: "short",
  label: "Brighter ≠ hotter",
  slug: "brighter-hotter",
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

  test("strips HTML tags from body in content", () => {
    const html = '<p>foo <span class="katex"><span>bar</span></span> baz</p>';
    const htmlFixture: MisconceptionEntry = { ...fixture, body: html };
    const record = toMisconceptionRecord(htmlFixture, ctx);
    expect(record.content).toContain("foo");
    expect(record.content).toContain("bar");
    expect(record.content).toContain("baz");
    expect(record.content).not.toMatch(/<|>/);
  });
});
