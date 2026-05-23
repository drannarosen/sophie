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
  unit: "measuring-the-sky",
  anchor: "def-luminosity",
};

describe("toDefinitionRecord", () => {
  test("emits url with chapter slug + anchor", () => {
    expect(toDefinitionRecord(fixture, ctx).url).toBe(
      "/units/measuring-the-sky/reading#def-luminosity"
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

  test("filters.unit and filters.module are arrays", () => {
    const record = toDefinitionRecord(fixture, ctx);
    expect(record.filters.chapter).toEqual(["measuring-the-sky"]);
    expect(record.filters.module).toEqual(["01-foundations"]);
  });

  test("language is 'en'", () => {
    expect(toDefinitionRecord(fixture, ctx).language).toBe("en");
  });

  test("strips HTML tags from body in content", () => {
    const html = '<p>foo <span class="katex"><span>bar</span></span> baz</p>';
    const htmlFixture: DefinitionEntry = { ...fixture, body: html };
    const record = toDefinitionRecord(htmlFixture, ctx);
    expect(record.content).toContain("foo");
    expect(record.content).toContain("bar");
    expect(record.content).toContain("baz");
    expect(record.content).not.toMatch(/<|>/);
  });
});
