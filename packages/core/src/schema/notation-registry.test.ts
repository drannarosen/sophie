import { describe, expect, it } from "vitest";
import {
  CommonConfusionSchema,
  ConceptSchema,
  NotationRegistrySchema,
} from "./notation-registry.ts";

describe("CommonConfusionSchema", () => {
  it("accepts the minimum-valid entry (symbol + meaning)", () => {
    const result = CommonConfusionSchema.safeParse({
      symbol: "R",
      meaning: "stellar radius — reserved for the central body",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional concept_ref", () => {
    const result = CommonConfusionSchema.safeParse({
      symbol: "R",
      meaning: "stellar radius",
      concept_ref: "stellar-radius",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing symbol or meaning", () => {
    expect(CommonConfusionSchema.safeParse({ symbol: "R" }).success).toBe(
      false
    );
    expect(
      CommonConfusionSchema.safeParse({ meaning: "stellar radius" }).success
    ).toBe(false);
  });

  it("rejects empty symbol or meaning", () => {
    expect(
      CommonConfusionSchema.safeParse({ symbol: "", meaning: "x" }).success
    ).toBe(false);
    expect(
      CommonConfusionSchema.safeParse({ symbol: "R", meaning: "" }).success
    ).toBe(false);
  });
});

describe("ConceptSchema", () => {
  const minValid = {
    id: "orbital-radius",
    verbal_label: "orbital radius",
    canonical_symbol: "r",
    latex: "r",
  };

  it("accepts the minimum-valid concept (id + verbal_label + canonical_symbol + latex)", () => {
    const result = ConceptSchema.safeParse(minValid);
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields filled", () => {
    const result = ConceptSchema.safeParse({
      ...minValid,
      units: "cm (CGS); AU (display)",
      code_alias: "r_au",
      common_confusions: [
        {
          symbol: "R",
          meaning: "stellar radius",
          concept_ref: "stellar-radius",
        },
        { symbol: "d", meaning: "Earth-observer distance" },
      ],
      introduced_in: "module-02/lecture-04",
      related_concepts: ["semi-major-axis", "orbital-period"],
      notes: "Common authoring confusion: R vs r.",
      epistemic_role: "observable",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    for (const field of ["id", "verbal_label", "canonical_symbol", "latex"]) {
      const { [field as keyof typeof minValid]: _omitted, ...rest } = minValid;
      const result = ConceptSchema.safeParse(rest);
      expect(result.success, `expected missing "${field}" to be rejected`).toBe(
        false
      );
    }
  });

  it("rejects non-kebab-case id (per Slug primitive)", () => {
    for (const bad of ["UPPER_CASE", "with space", "trailing-", "a--b"]) {
      const result = ConceptSchema.safeParse({ ...minValid, id: bad });
      expect(result.success, `expected id "${bad}" to be rejected`).toBe(false);
    }
  });

  it("rejects related_concepts entries that aren't kebab-case slugs", () => {
    const result = ConceptSchema.safeParse({
      ...minValid,
      related_concepts: ["valid-concept", "Invalid Slug"],
    });
    expect(result.success).toBe(false);
  });

  it("epistemic_role must be one of the 8 canonical roles when present", () => {
    const valid = ConceptSchema.safeParse({
      ...minValid,
      epistemic_role: "model",
    });
    expect(valid.success).toBe(true);

    const invalid = ConceptSchema.safeParse({
      ...minValid,
      epistemic_role: "remediation",
    });
    expect(invalid.success).toBe(false);
  });

  it("epistemic_role is optional (registry hardening §R2 — opt-in per concept)", () => {
    // The 2026-05-17 design hardening §D3 makes epistemic_role optional at v1.
    // Concepts without declared role are valid; audit treats as "unknown role".
    const result = ConceptSchema.safeParse(minValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.epistemic_role).toBeUndefined();
    }
  });
});

describe("NotationRegistrySchema", () => {
  const minValid = {
    version: "1",
    course: "astr-201",
    last_updated: "2026-05-17",
    concepts: [
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
    ],
  };

  it("accepts the minimum-valid registry", () => {
    const result = NotationRegistrySchema.safeParse(minValid);
    expect(result.success).toBe(true);
  });

  it("accepts an empty concepts list (registry-stub case)", () => {
    // A course can opt into the registry with no concepts declared yet;
    // chapters then can't use <MultiRep> but the file structure is valid.
    const result = NotationRegistrySchema.safeParse({
      ...minValid,
      concepts: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional extensions passthrough object", () => {
    const result = NotationRegistrySchema.safeParse({
      ...minValid,
      extensions: { courseSpecificField: "value" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required top-level fields", () => {
    for (const field of [
      "version",
      "course",
      "last_updated",
      "concepts",
    ] as const) {
      const { [field]: _omitted, ...rest } = minValid;
      const result = NotationRegistrySchema.safeParse(rest);
      expect(result.success, `expected missing "${field}" to be rejected`).toBe(
        false
      );
    }
  });

  it("rejects non-ISO last_updated", () => {
    for (const bad of ["May 17 2026", "2026/05/17", "17-05-2026", ""]) {
      const result = NotationRegistrySchema.safeParse({
        ...minValid,
        last_updated: bad,
      });
      expect(
        result.success,
        `expected last_updated "${bad}" to be rejected`
      ).toBe(false);
    }
  });
});
