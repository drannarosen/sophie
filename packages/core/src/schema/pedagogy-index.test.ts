import { describe, expect, test } from "vitest";
import {
  DefinitionEntrySchema,
  EquationEntrySchema,
  FigureEntrySchema,
  KeyInsightEntrySchema,
  MisconceptionEntrySchema,
  PedagogyIndexSchema,
} from "./pedagogy-index.ts";

const validDefinition = {
  term: "Standard candle",
  slug: "standard-candle",
  body: "<p>An object whose intrinsic luminosity is known.</p>",
  chapter: "spoiler-alerts",
  anchor: "standard-candle",
};

describe("DefinitionEntrySchema", () => {
  test("accepts a valid entry", () => {
    expect(DefinitionEntrySchema.safeParse(validDefinition).success).toBe(true);
  });

  test("rejects an entry missing the term", () => {
    const { term: _term, ...rest } = validDefinition;
    expect(DefinitionEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an entry with empty slug", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, slug: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty chapter", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, chapter: "" })
        .success
    ).toBe(false);
  });

  test("accepts an empty body (definitions with header-only structure)", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, body: "" }).success
    ).toBe(true);
  });
});

const validEquation = {
  slug: "wiens-law",
  title: "Wien's Law",
  number: 1,
  tex: "\\lambda_{\\text{peak}} = b T^{-1}",
  body: "<p>where b is...</p>",
  chapter: "spoiler-alerts",
  anchor: "wiens-law",
};

describe("EquationEntrySchema", () => {
  test("accepts a valid entry with all required fields", () => {
    expect(EquationEntrySchema.safeParse(validEquation).success).toBe(true);
  });

  test("rejects an entry missing number (now required)", () => {
    const { number: _number, ...rest } = validEquation;
    expect(EquationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an entry with empty tex", () => {
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, tex: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty title", () => {
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, title: "" }).success
    ).toBe(false);
  });
});

describe("future-PR entry schemas (stub-tested in PR-C1)", () => {
  test("KeyInsightEntrySchema accepts a minimal valid entry", () => {
    expect(
      KeyInsightEntrySchema.safeParse({
        body: "<p>Color is encoded physics.</p>",
        chapter: "spoiler-alerts",
        anchor: "color-physics",
      }).success
    ).toBe(true);
  });

  test("FigureEntrySchema accepts a minimal valid entry", () => {
    expect(
      FigureEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        chapter: "spoiler-alerts",
        anchor: "fig-ladder",
      }).success
    ).toBe(true);
  });

  test("MisconceptionEntrySchema accepts both length discriminators", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>Stars don't twinkle in space.</p>",
        chapter: "atmospheric-physics",
        anchor: "twinkle",
        length: "short",
      }).success
    ).toBe(true);
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>Long-form misconception treatment...</p>",
        chapter: "atmospheric-physics",
        anchor: "twinkle-long",
        length: "long",
      }).success
    ).toBe(true);
  });

  test("MisconceptionEntrySchema rejects invalid length value", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        chapter: "ch",
        anchor: "a",
        length: "medium",
      }).success
    ).toBe(false);
  });
});

describe("PedagogyIndexSchema", () => {
  test("accepts an empty index", () => {
    expect(
      PedagogyIndexSchema.safeParse({
        definitions: [],
        equations: [],
        keyInsights: [],
        figures: [],
        misconceptions: [],
      }).success
    ).toBe(true);
  });

  test("accepts a populated definitions array", () => {
    expect(
      PedagogyIndexSchema.safeParse({
        definitions: [validDefinition],
        equations: [],
        keyInsights: [],
        figures: [],
        misconceptions: [],
      }).success
    ).toBe(true);
  });

  test("rejects an index missing a required collection", () => {
    expect(
      PedagogyIndexSchema.safeParse({
        definitions: [],
        equations: [],
        keyInsights: [],
        figures: [],
        // misconceptions missing
      }).success
    ).toBe(false);
  });
});
