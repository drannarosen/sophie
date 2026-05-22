import { describe, expect, it } from "vitest";
import {
  type ArtifactCollectionEntryLike,
  artifactFromCollectionEntry,
  artifactsFromCollection,
} from "./artifacts-from-collection.ts";

// Build a minimal entry-shaped fixture sufficient for the path-
// derivation helper. Uses the structural ArtifactCollectionEntryLike
// type so the test stays decoupled from `astro:content`.
function mkEntry(
  pathId: string,
  data: { id: string; title: string; references?: Record<string, string[]> }
): ArtifactCollectionEntryLike {
  return { id: pathId, data };
}

describe("artifactFromCollectionEntry — W2/D1 path derivation", () => {
  it("derives unit-scope ArtifactEntry from sections/<sec>/units/<unit>/reading.mdx", () => {
    const result = artifactFromCollectionEntry(
      mkEntry("stars/units/spectra-and-composition/reading", {
        id: "spectra-and-composition",
        title: "Spectra & Composition",
      })
    );
    expect(result.scope).toBe("unit");
    expect(result.type).toBe("reading");
    if (result.scope === "unit") {
      expect(result.unit_id).toBe("spectra-and-composition");
    }
    expect(result.section_id).toBe("stars");
    expect(result.id).toBe("spectra-and-composition");
    expect(result.source_path).toBe(
      "src/content/sections/stars/units/spectra-and-composition/reading.mdx"
    );
  });

  it("derives section-scope ArtifactEntry from sections/<sec>/intro.mdx", () => {
    const result = artifactFromCollectionEntry(
      mkEntry("stars/intro", {
        id: "stars-intro",
        title: "Stars module intro",
      })
    );
    expect(result.scope).toBe("section");
    expect(result.type).toBe("intro");
    expect(result.section_id).toBe("stars");
    expect(result.id).toBe("stars-intro");
    expect(result.source_path).toBe("src/content/sections/stars/intro.mdx");
  });

  it("populates references default {} when frontmatter omits it", () => {
    const result = artifactFromCollectionEntry(
      mkEntry("foundations/units/measuring-the-sky/reading", {
        id: "measuring-the-sky",
        title: "Measuring the Sky",
      })
    );
    expect(result.references).toEqual({});
  });

  it("passes through non-empty references when provided", () => {
    const result = artifactFromCollectionEntry(
      mkEntry("stars/units/spectra-and-composition/reading", {
        id: "spectra-and-composition",
        title: "Spectra & Composition",
        references: { units: ["measuring-the-sky"] },
      })
    );
    expect(result.references).toEqual({ units: ["measuring-the-sky"] });
  });

  it("derives type from the file basename (artifact-type)", () => {
    const slides = artifactFromCollectionEntry(
      mkEntry("stars/units/spectra-and-composition/slides", {
        id: "spectra-and-composition-slides",
        title: "Spectra slides",
      })
    );
    expect(slides.type).toBe("slides");
    expect(slides.scope).toBe("unit");

    const synthesis = artifactFromCollectionEntry(
      mkEntry("stars/synthesis", {
        id: "stars-synthesis",
        title: "Stars module synthesis",
      })
    );
    expect(synthesis.type).toBe("synthesis");
    expect(synthesis.scope).toBe("section");
  });

  it("throws on malformed path (no section segment)", () => {
    expect(() =>
      artifactFromCollectionEntry(mkEntry("", { id: "x", title: "x" }))
    ).toThrow(/malformed/);
  });

  it("throws on path that doesn't match the ADR 0067 layout", () => {
    expect(() =>
      artifactFromCollectionEntry(
        mkEntry("sec/some/random/depth/path", { id: "x", title: "x" })
      )
    ).toThrow(/ADR 0067 layout/);
  });
});

describe("artifactsFromCollection — batch helper", () => {
  it("maps a list of entries via artifactFromCollectionEntry", () => {
    const result = artifactsFromCollection([
      mkEntry("foundations/units/measuring-the-sky/reading", {
        id: "measuring-the-sky",
        title: "Measuring the Sky",
      }),
      mkEntry("stars/intro", {
        id: "stars-intro",
        title: "Stars module intro",
      }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.scope).toBe("unit");
    expect(result[1]?.scope).toBe("section");
  });
});
