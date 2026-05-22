import { describe, expect, it } from "vitest";
import { SectionEntrySchema } from "./section.ts";

describe("SectionEntrySchema", () => {
  it("parses a module-variant section", () => {
    const input = {
      type: "module",
      slug: "intro",
      title: "Introduction to Astrophysics",
      order: 0,
      description: "Foundation concepts.",
    };
    expect(SectionEntrySchema.parse(input)).toEqual(input);
  });

  it("parses a phase-variant section without description", () => {
    const input = {
      type: "phase",
      slug: "phase-1",
      title: "Phase 1: Foundations",
      order: 0,
    };
    expect(SectionEntrySchema.parse(input)).toEqual(input);
  });

  it("parses a bridge-variant section with display_label", () => {
    const input = {
      type: "bridge",
      slug: "math-prereqs",
      title: "Math Prerequisites",
      order: 0,
      display_label: "Foundations",
    };
    expect(SectionEntrySchema.parse(input)).toEqual(input);
  });

  it("rejects an unknown type discriminator", () => {
    expect(() =>
      SectionEntrySchema.parse({
        type: "unknown",
        slug: "x",
        title: "X",
        order: 0,
      })
    ).toThrow();
  });

  it("rejects an empty slug", () => {
    expect(() =>
      SectionEntrySchema.parse({
        type: "module",
        slug: "",
        title: "X",
        order: 0,
      })
    ).toThrow();
  });

  it("rejects a negative order", () => {
    expect(() =>
      SectionEntrySchema.parse({
        type: "module",
        slug: "x",
        title: "X",
        order: -1,
      })
    ).toThrow();
  });
});
