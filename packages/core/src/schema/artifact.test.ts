import { describe, expect, it } from "vitest";
import {
  ArtifactSchema,
  ArtifactScopeSchema,
  ArtifactTypeSchema,
} from "./artifact.js";

const UNIT_LEVEL_TYPES = [
  "reading",
  "slides",
  "spec",
  "rubric",
  "lab-notebook",
  "media",
  "practice",
  "worked-example",
  "diagnostic",
  "concept-review",
] as const;

const SECTION_LEVEL_TYPES = [
  "intro",
  "synthesis",
  "equation-collection",
  "practice-set",
  "review-checklist",
  "concept-map",
  "misconception-summary",
  "historical-context",
  "further-reading",
  "reference-tables",
] as const;

describe("ArtifactTypeSchema", () => {
  it("accepts every declared variant (Unit-level + Section-level)", () => {
    for (const t of [...UNIT_LEVEL_TYPES, ...SECTION_LEVEL_TYPES]) {
      expect(() => ArtifactTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => ArtifactTypeSchema.parse("lecture-notes")).toThrow();
  });
});

describe("ArtifactScopeSchema", () => {
  it("accepts 'unit' and 'section'", () => {
    expect(() => ArtifactScopeSchema.parse("unit")).not.toThrow();
    expect(() => ArtifactScopeSchema.parse("section")).not.toThrow();
  });
  it("rejects unknown scope values", () => {
    expect(() => ArtifactScopeSchema.parse("course")).toThrow();
  });
});

describe("ArtifactSchema", () => {
  it("accepts a minimal Unit-level reading artifact", () => {
    expect(() =>
      ArtifactSchema.parse({
        id: "m1-l1-reading",
        type: "reading",
        scope: "unit",
        title: "L1 reading: Why ASTR 201 is Different",
        source_path:
          "src/content/courses/astr201/sections/m1/units/l1/reading.mdx",
      })
    ).not.toThrow();
  });

  it("accepts a Section-level practice-set artifact with references", () => {
    expect(() =>
      ArtifactSchema.parse({
        id: "m1-practice-set",
        type: "practice-set",
        scope: "section",
        title: "Module 1 — Interleaved practice",
        source_path: "src/content/courses/astr201/sections/m1/practice-set.mdx",
        references: { units: ["l1", "l2", "l3"], los: ["lo-1.1", "lo-1.2"] },
      })
    ).not.toThrow();
  });

  it("rejects missing required fields (no source_path)", () => {
    expect(() =>
      ArtifactSchema.parse({
        id: "x",
        type: "reading",
        scope: "unit",
        title: "X",
      })
    ).toThrow();
  });

  it("rejects unknown scope", () => {
    expect(() =>
      ArtifactSchema.parse({
        id: "x",
        type: "reading",
        scope: "course",
        title: "X",
        source_path: "x.mdx",
      })
    ).toThrow();
  });

  it("defaults references to an empty object", () => {
    const parsed = ArtifactSchema.parse({
      id: "x",
      type: "reading",
      scope: "unit",
      title: "X",
      source_path: "x.mdx",
    });
    expect(parsed.references).toEqual({});
  });

  it("allows optional order field for in-Section ordering", () => {
    expect(() =>
      ArtifactSchema.parse({
        id: "x",
        type: "intro",
        scope: "section",
        title: "X",
        source_path: "x.mdx",
        order: 0,
      })
    ).not.toThrow();
  });
});
