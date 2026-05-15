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
  chapter: "measuring-the-sky",
  anchor: "ki-3",
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
      "/chapters/measuring-the-sky#ki-3"
    );
  });

  test("meta.title is the first sentence (or full body if short)", () => {
    expect(toKeyInsightRecord(fixture, ctx).meta.title).toBe(
      "Distance hides itself in every photometric measurement."
    );
  });
});
