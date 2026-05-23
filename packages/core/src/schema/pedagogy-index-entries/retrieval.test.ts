import { describe, expect, it } from "vitest";
import {
  RetrievalPromptEntrySchema,
  SkillReviewEntrySchema,
  SpacedReviewEntrySchema,
} from "./retrieval.ts";

describe("RetrievalPromptEntrySchema", () => {
  it("accepts a valid entry", () => {
    expect(() =>
      RetrievalPromptEntrySchema.parse({
        unit: "spoiler-alerts",
        anchor: "rp-1",
        target_id: "eq:stefan-boltzmann",
      })
    ).not.toThrow();
  });

  it("rejects empty target_id", () => {
    expect(() =>
      RetrievalPromptEntrySchema.parse({
        unit: "spoiler-alerts",
        anchor: "rp-1",
        target_id: "",
      })
    ).toThrow();
  });

  it("rejects missing chapter", () => {
    expect(() =>
      RetrievalPromptEntrySchema.parse({
        anchor: "rp-1",
        target_id: "eq:x",
      })
    ).toThrow();
  });
});

describe("SpacedReviewEntrySchema", () => {
  it("accepts target_id-scoped entry", () => {
    expect(() =>
      SpacedReviewEntrySchema.parse({
        unit: "spoiler-alerts",
        anchor: "sp-1",
        target_id: "topic:logarithms",
        max: 3,
      })
    ).not.toThrow();
  });

  it("accepts section_id-scoped entry", () => {
    expect(() =>
      SpacedReviewEntrySchema.parse({
        unit: "spoiler-alerts",
        anchor: "sp-1",
        section_id: "m1-foundations",
        max: 5,
      })
    ).not.toThrow();
  });

  it("rejects both target_id and section_id (refine violation)", () => {
    expect(() =>
      SpacedReviewEntrySchema.parse({
        unit: "ch",
        anchor: "sp-1",
        target_id: "eq:x",
        section_id: "s",
        max: 3,
      })
    ).toThrow();
  });

  it("rejects neither target_id nor section_id", () => {
    expect(() =>
      SpacedReviewEntrySchema.parse({
        unit: "ch",
        anchor: "sp-1",
        max: 3,
      })
    ).toThrow();
  });

  it("rejects non-positive max", () => {
    expect(() =>
      SpacedReviewEntrySchema.parse({
        unit: "ch",
        anchor: "sp-1",
        target_id: "eq:x",
        max: 0,
      })
    ).toThrow();
    expect(() =>
      SpacedReviewEntrySchema.parse({
        unit: "ch",
        anchor: "sp-1",
        target_id: "eq:x",
        max: -1,
      })
    ).toThrow();
  });
});

describe("SkillReviewEntrySchema", () => {
  it("accepts a valid entry with has_explicit_content=true", () => {
    expect(() =>
      SkillReviewEntrySchema.parse({
        unit: "spoiler-alerts",
        anchor: "sk-1",
        target_id: "topic:logarithms",
        has_explicit_content: true,
      })
    ).not.toThrow();
  });

  it("accepts a valid entry with has_explicit_content=false", () => {
    expect(() =>
      SkillReviewEntrySchema.parse({
        unit: "spoiler-alerts",
        anchor: "sk-1",
        target_id: "topic:exponents",
        has_explicit_content: false,
      })
    ).not.toThrow();
  });

  it("rejects empty target_id", () => {
    expect(() =>
      SkillReviewEntrySchema.parse({
        unit: "ch",
        anchor: "sk-1",
        target_id: "",
        has_explicit_content: true,
      })
    ).toThrow();
  });
});
