import { describe, expect, it } from "vitest";
import { ArtifactEntrySchema } from "./artifact.ts";

describe("ArtifactEntrySchema", () => {
  const validUnitReading = {
    id: "spectra-and-composition",
    type: "reading",
    scope: "unit",
    title: "Spectra & Composition — reading",
    source_path:
      "src/content/sections/stars/units/spectra-and-composition/reading.mdx",
    references: {},
    section_id: "stars",
    unit_id: "spectra-and-composition",
  };

  const validSectionIntro = {
    id: "stars-intro",
    type: "intro",
    scope: "section",
    title: "Stars — module intro",
    source_path: "src/content/sections/stars/intro.mdx",
    references: {},
    section_id: "stars",
  };

  it("parses a unit-scope reading artifact (W2)", () => {
    const parsed = ArtifactEntrySchema.parse(validUnitReading);
    expect(parsed.scope).toBe("unit");
    if (parsed.scope === "unit") {
      expect(parsed.unit_id).toBe("spectra-and-composition");
      expect(parsed.section_id).toBe("stars");
    }
  });

  it("parses a section-scope intro artifact (W2)", () => {
    const parsed = ArtifactEntrySchema.parse(validSectionIntro);
    expect(parsed.scope).toBe("section");
    expect(parsed.section_id).toBe("stars");
  });

  it("rejects a unit-scope artifact missing unit_id (W2)", () => {
    const { unit_id: _, ...withoutUnit } = validUnitReading;
    expect(ArtifactEntrySchema.safeParse(withoutUnit).success).toBe(false);
  });

  it("rejects a unit-scope artifact missing section_id (W2)", () => {
    const { section_id: _, ...withoutSection } = validUnitReading;
    expect(ArtifactEntrySchema.safeParse(withoutSection).success).toBe(false);
  });

  it("rejects a section-scope artifact missing section_id (W2)", () => {
    const { section_id: _, ...withoutSection } = validSectionIntro;
    expect(ArtifactEntrySchema.safeParse(withoutSection).success).toBe(false);
  });

  it("rejects an unknown scope (W2: discriminator gate)", () => {
    expect(
      ArtifactEntrySchema.safeParse({
        ...validUnitReading,
        scope: "module",
      }).success
    ).toBe(false);
  });

  it("rejects an empty section_id (W2: NonEmptyString)", () => {
    expect(
      ArtifactEntrySchema.safeParse({
        ...validUnitReading,
        section_id: "",
      }).success
    ).toBe(false);
  });

  it("accepts the optional order field (W2)", () => {
    const parsed = ArtifactEntrySchema.parse({
      ...validUnitReading,
      order: 3,
    });
    if (parsed.scope === "unit") {
      expect(parsed.order).toBe(3);
    }
  });

  it("populates the references default {} when omitted (W2)", () => {
    const { references: _, ...withoutRefs } = validUnitReading;
    const parsed = ArtifactEntrySchema.parse(withoutRefs);
    expect(parsed.references).toEqual({});
  });

  it("round-trips a unit-scope artifact with non-empty references (W2)", () => {
    const input = {
      ...validUnitReading,
      references: {
        units: ["measuring-the-sky"],
        equations: ["wien-displacement-law"],
      },
    };
    const parsed = ArtifactEntrySchema.parse(input);
    expect(parsed.references.units).toEqual(["measuring-the-sky"]);
    expect(parsed.references.equations).toEqual(["wien-displacement-law"]);
  });
});
