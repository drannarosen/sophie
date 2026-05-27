import { describe, expect, test } from "vitest";
import { type ArtifactEntryLike, getAvailableUnitViews } from "./unit-views.ts";

// Build a minimal fixture sufficient for the path-based filter in
// `getAvailableUnitViews`. Helper only reads `id`.
function mkEntry(pathId: string): ArtifactEntryLike {
  return { id: pathId };
}

describe("getAvailableUnitViews — view-kind enumeration from artifact paths", () => {
  test("reading-only artifact yields [reading]", () => {
    const artifacts = [mkEntry("foundations/units/intro/reading")];
    expect(getAvailableUnitViews({ unit: "intro", artifacts })).toEqual([
      "reading",
    ]);
  });

  test("reading + practice yields [reading, practice]", () => {
    const artifacts = [
      mkEntry("foundations/units/intro/reading"),
      mkEntry("foundations/units/intro/practice"),
    ];
    expect(getAvailableUnitViews({ unit: "intro", artifacts })).toEqual([
      "reading",
      "practice",
    ]);
  });

  test("reading + slides + practice yields [reading, slides, practice] (locked order)", () => {
    const artifacts = [
      mkEntry("foundations/units/intro/reading"),
      mkEntry("foundations/units/intro/slides"),
      mkEntry("foundations/units/intro/practice"),
    ];
    expect(getAvailableUnitViews({ unit: "intro", artifacts })).toEqual([
      "reading",
      "slides",
      "practice",
    ]);
  });

  test("practice without reading yields [practice]", () => {
    const artifacts = [mkEntry("foundations/units/intro/practice")];
    expect(getAvailableUnitViews({ unit: "intro", artifacts })).toEqual([
      "practice",
    ]);
  });

  test("draft unit excluded — returns []", () => {
    const artifacts = [
      mkEntry("foundations/units/intro/reading"),
      mkEntry("foundations/units/intro/practice"),
    ];
    const draftUnitIds = new Set(["intro"]);
    expect(
      getAvailableUnitViews({ unit: "intro", artifacts, draftUnitIds })
    ).toEqual([]);
  });

  test("non-matching unit id yields []", () => {
    const artifacts = [mkEntry("foundations/units/other-unit/reading")];
    expect(getAvailableUnitViews({ unit: "intro", artifacts })).toEqual([]);
  });

  test("empty artifacts array yields []", () => {
    expect(getAvailableUnitViews({ unit: "intro", artifacts: [] })).toEqual([]);
  });

  test("order is reading → slides → practice regardless of artifact-array order", () => {
    const artifacts = [
      mkEntry("foundations/units/intro/practice"),
      mkEntry("foundations/units/intro/slides"),
      mkEntry("foundations/units/intro/reading"),
    ];
    expect(getAvailableUnitViews({ unit: "intro", artifacts })).toEqual([
      "reading",
      "slides",
      "practice",
    ]);
  });
});
