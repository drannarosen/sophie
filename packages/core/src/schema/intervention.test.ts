import { describe, expect, it } from "vitest";
import {
  InterventionDepthSchema,
  InterventionEntrySchema,
  InterventionFamilySchema,
  InterventionLibraryEntrySchema,
} from "./intervention.ts";

describe("InterventionFamilySchema", () => {
  it("accepts the 4 ADR 0044 families", () => {
    for (const family of [
      "confrontation",
      "bridging",
      "restructuring",
      "reinforcement",
    ]) {
      expect(InterventionFamilySchema.safeParse(family).success).toBe(true);
    }
  });

  it("rejects unknown families", () => {
    expect(InterventionFamilySchema.safeParse("reinforce").success).toBe(false);
    expect(InterventionFamilySchema.safeParse("").success).toBe(false);
  });
});

describe("InterventionDepthSchema", () => {
  it("accepts 'light' and 'substantial'", () => {
    expect(InterventionDepthSchema.safeParse("light").success).toBe(true);
    expect(InterventionDepthSchema.safeParse("substantial").success).toBe(true);
  });

  it("rejects unknown depth labels", () => {
    expect(InterventionDepthSchema.safeParse("deep").success).toBe(false);
  });
});

describe("InterventionEntrySchema (pedagogy-index entry)", () => {
  it("accepts a minimum-valid entry", () => {
    const result = InterventionEntrySchema.safeParse({
      type: "contrasting-cases",
      addresses: ["universe-with-a-center"],
      body: "Predict what you'd observe if the universe had a center…",
      depth: "light",
      chapter: "01-foundations/spoiler-alerts",
      anchor: "intervention-contrasting-cases-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts custom-type entry with name", () => {
    const result = InterventionEntrySchema.safeParse({
      type: "custom",
      name: "scale-comparison",
      addresses: ["stars-are-points"],
      body: "Compare 10^21 m to 10^23 m…",
      depth: "substantial",
      chapter: "01-foundations/spoiler-alerts",
      anchor: "intervention-scale-comparison-1",
    });
    expect(result.success).toBe(true);
  });

  it("requires addresses to be a non-empty array (single-target string in props is normalized at extract time)", () => {
    expect(
      InterventionEntrySchema.safeParse({
        type: "contrasting-cases",
        addresses: [],
        body: "body",
        depth: "light",
        chapter: "ch",
        anchor: "a",
      }).success
    ).toBe(false);
    // String form is NOT accepted at the index entry layer — extractor
    // normalizes to array. Schema enforces.
    expect(
      InterventionEntrySchema.safeParse({
        type: "contrasting-cases",
        addresses: "universe-with-a-center",
        body: "body",
        depth: "light",
        chapter: "ch",
        anchor: "a",
      }).success
    ).toBe(false);
  });

  it("requires depth (no default at the index layer; extractor pulls from props default)", () => {
    const result = InterventionEntrySchema.safeParse({
      type: "contrasting-cases",
      addresses: ["x"],
      body: "body",
      chapter: "ch",
      anchor: "a",
    });
    expect(result.success).toBe(false);
  });

  it("REJECTS type=custom WITHOUT name (.superRefine — mirrors component-side constraint)", () => {
    const result = InterventionEntrySchema.safeParse({
      type: "custom",
      addresses: ["stars-are-points"],
      body: "body",
      depth: "light",
      chapter: "ch",
      anchor: "a",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("name"));
      expect(issue).toBeDefined();
      expect(issue?.message).toMatch(/name.*required.*custom/i);
    }
  });
});

describe("InterventionLibraryEntrySchema (intervention-index.ts entry)", () => {
  it("accepts a v1 library entry without v2-reserved fields", () => {
    const result = InterventionLibraryEntrySchema.safeParse({
      name: "contrasting-cases",
      family: "confrontation",
      description:
        "Two cases differing only on the key dimension; predict before reveal.",
      citation: "Bransford & Schwartz 1999",
      addresses_families: ["misconception-as-substance"],
      move: "predict-then-reveal",
    });
    expect(result.success).toBe(true);
  });

  it("accepts v2-reserved DOI + bibtex + template_body slots", () => {
    const result = InterventionLibraryEntrySchema.safeParse({
      name: "bridging-analogy",
      family: "bridging",
      description:
        "Analogy intuitive to students AND mapping the target concept; declare limits explicitly.",
      citation: "Clement 1993",
      addresses_families: ["mental-model-mismatch"],
      move: "bridging-analogy",
      citation_doi: "10.1002/sce.3730770505",
      citation_bibtex:
        "@article{clement1993, author = {Clement, John}, year = {1993}}",
      template_body: "Consider {anchor}: …",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown family value", () => {
    const result = InterventionLibraryEntrySchema.safeParse({
      name: "x",
      family: "reinforce",
      description: "d",
      citation: "c",
      addresses_families: [],
      move: "m",
    });
    expect(result.success).toBe(false);
  });
});
