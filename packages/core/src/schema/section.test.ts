import { describe, expect, it } from "vitest";
import {
  SectionModuleVariantSchema,
  SectionSchema,
  SectionTypeSchema,
} from "./section.js";

describe("SectionTypeSchema", () => {
  it("accepts each variant per ADR 0067", () => {
    for (const t of ["module", "phase", "track", "unit-block", "bridge"]) {
      expect(() => SectionTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => SectionTypeSchema.parse("chapter")).toThrow();
  });
});

describe("SectionModuleVariantSchema", () => {
  const validModule = {
    type: "module",
    slug: "01-foundations",
    title: "Foundations",
    order: 1,
    description: "Introductory module.",
  };

  it("accepts a valid module variant", () => {
    expect(() => SectionModuleVariantSchema.parse(validModule)).not.toThrow();
  });

  it("rejects missing required fields (no slug)", () => {
    const { slug: _slug, ...rest } = validModule;
    expect(() => SectionModuleVariantSchema.parse(rest)).toThrow();
  });

  it("rejects wrong type discriminator", () => {
    expect(() =>
      SectionModuleVariantSchema.parse({ ...validModule, type: "phase" })
    ).toThrow();
  });

  it("accepts module without optional description", () => {
    const { description: _description, ...rest } = validModule;
    expect(() => SectionModuleVariantSchema.parse(rest)).not.toThrow();
  });
});

describe("SectionSchema (discriminated union)", () => {
  it("accepts a module variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "module",
        slug: "01-foundations",
        title: "Foundations",
        order: 1,
      })
    ).not.toThrow();
  });

  it("accepts a phase variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "phase",
        slug: "phase-1",
        title: "Phase 1 — Foundations",
        order: 1,
      })
    ).not.toThrow();
  });

  it("accepts a track variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "track",
        slug: "track-theory",
        title: "Theory track",
        order: 1,
      })
    ).not.toThrow();
  });

  it("accepts a unit-block variant", () => {
    expect(() =>
      SectionSchema.parse({
        type: "unit-block",
        slug: "spectra-cluster",
        title: "Spectra cluster",
        order: 2,
      })
    ).not.toThrow();
  });

  it("accepts a bridge variant with display_label", () => {
    expect(() =>
      SectionSchema.parse({
        type: "bridge",
        slug: "math-prereqs",
        title: "Math & Physics Prereqs",
        order: 0,
        display_label: "Python Bootcamp",
      })
    ).not.toThrow();
  });

  it("accepts a bridge variant without display_label (optional)", () => {
    expect(() =>
      SectionSchema.parse({
        type: "bridge",
        slug: "math-prereqs",
        title: "Math & Physics Prereqs",
        order: 0,
      })
    ).not.toThrow();
  });

  it("rejects unknown type discriminator", () => {
    expect(() =>
      SectionSchema.parse({
        type: "mystery",
        slug: "x",
        title: "X",
        order: 1,
      })
    ).toThrow();
  });

  it("rejects negative order", () => {
    expect(() =>
      SectionSchema.parse({
        type: "module",
        slug: "x",
        title: "X",
        order: -1,
      })
    ).toThrow();
  });
});
