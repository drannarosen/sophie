import { describe, expect, it } from "vitest";
import { SubsectionSchema } from "./subsection.js";

describe("SubsectionSchema", () => {
  it("accepts an auto-grouping subsection (no intro_mdx)", () => {
    expect(() =>
      SubsectionSchema.parse({
        id: "slides",
        label: "Slides",
        order: 1,
        kind: "auto-grouped",
        artifact_type: "slides",
      })
    ).not.toThrow();
  });

  it("accepts an explicit subsection (with intro_mdx)", () => {
    expect(() =>
      SubsectionSchema.parse({
        id: "first-half",
        label: "Lectures 1–3",
        order: 1,
        kind: "explicit",
        intro_mdx: "These three lectures cover the basics...",
      })
    ).not.toThrow();
  });

  it("rejects auto-grouped without artifact_type", () => {
    expect(() =>
      SubsectionSchema.parse({
        id: "x",
        label: "X",
        order: 1,
        kind: "auto-grouped",
      })
    ).toThrow();
  });

  it("rejects unknown kind", () => {
    expect(() =>
      SubsectionSchema.parse({
        id: "x",
        label: "X",
        order: 1,
        kind: "mystery",
      })
    ).toThrow();
  });

  it("rejects negative order", () => {
    expect(() =>
      SubsectionSchema.parse({
        id: "x",
        label: "X",
        order: -1,
        kind: "auto-grouped",
        artifact_type: "slides",
      })
    ).toThrow();
  });
});
