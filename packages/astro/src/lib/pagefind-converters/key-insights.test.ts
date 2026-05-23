import type { KeyInsightEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toKeyInsightRecord } from "./key-insights.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: KeyInsightEntry = {
  body: "Distance hides itself in every photometric measurement.",
  unit: "measuring-the-sky",
  anchor: "ki-3",
  slug: "measuring-the-sky-ki-3",
};

describe("toKeyInsightRecord", () => {
  test("filters.type is ['keyInsight']", () => {
    expect(toKeyInsightRecord(fixture, ctx).filters.type).toEqual([
      "keyInsight",
    ]);
  });

  test("content carries the insight body", () => {
    expect(toKeyInsightRecord(fixture, ctx).content).toBe(
      "Distance hides itself in every photometric measurement."
    );
  });

  test("url uses anchor ki-3", () => {
    expect(toKeyInsightRecord(fixture, ctx).url).toBe(
      "/units/measuring-the-sky/reading#ki-3"
    );
  });

  test("meta.title is the first sentence (or full body if short)", () => {
    expect(toKeyInsightRecord(fixture, ctx).meta.title).toBe(
      "Distance hides itself in every photometric measurement."
    );
  });

  test("strips HTML tags from body in content and meta.title", () => {
    const html = '<p>foo <span class="katex"><span>bar</span></span> baz</p>';
    const htmlFixture: KeyInsightEntry = { ...fixture, body: html };
    const record = toKeyInsightRecord(htmlFixture, ctx);
    expect(record.content).toContain("foo");
    expect(record.content).toContain("bar");
    expect(record.content).toContain("baz");
    expect(record.content).not.toMatch(/<|>/);
    expect(record.meta.title).not.toMatch(/<|>/);
  });
});
