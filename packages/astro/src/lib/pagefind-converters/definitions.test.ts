import type { DefinitionEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toDefinitionRecord } from "./definitions.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: DefinitionEntry = {
  term: "luminosity",
  slug: "luminosity",
  body: "Total radiant power emitted by a body.",
  chapter: "measuring-the-sky",
  anchor: "def-luminosity",
};

describe("toDefinitionRecord", () => {
  test("emits url with chapter slug + anchor", () => {
    expect(toDefinitionRecord(fixture, ctx).url).toBe(
      "/chapters/measuring-the-sky#def-luminosity"
    );
  });

  test("emits content as the pre-rendered body HTML", () => {
    expect(toDefinitionRecord(fixture, ctx).content).toBe(
      "Total radiant power emitted by a body."
    );
  });

  test("emits meta.title as the term", () => {
    expect(toDefinitionRecord(fixture, ctx).meta.title).toBe("luminosity");
  });

  test("emits meta.locator as 'chapter · module'", () => {
    expect(toDefinitionRecord(fixture, ctx).meta.locator).toBe(
      "Measuring the sky · Foundations"
    );
  });

  test("filters.type is the array ['term']", () => {
    expect(toDefinitionRecord(fixture, ctx).filters.type).toEqual(["term"]);
  });

  test("filters.chapter and filters.module are arrays", () => {
    const record = toDefinitionRecord(fixture, ctx);
    expect(record.filters.chapter).toEqual(["measuring-the-sky"]);
    expect(record.filters.module).toEqual(["01-foundations"]);
  });

  test("language is 'en'", () => {
    expect(toDefinitionRecord(fixture, ctx).language).toBe("en");
  });
});
