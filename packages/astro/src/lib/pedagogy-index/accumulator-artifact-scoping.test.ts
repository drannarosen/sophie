import type { FormativeEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

/**
 * Task 7 artifact-scoped pedagogy-index refactor (2026-05-27). A single
 * Unit composes multiple chapter-pass MDX artifacts (`reading.mdx`,
 * `practice.mdx`, future `slides.mdx`) that each contribute pedagogy
 * entries to the same `unitId`. The accumulator keys by
 * `${unit}#${artifactId}#${anchor}` so the artifacts don't clobber each
 * other; `clearUnitArtifact(unit, artifact)` only drops the artifact
 * being re-extracted.
 *
 * The artifact id lives ONLY in the internal storage key, never in the
 * serialized `entry.anchor`. Positional auto-anchors stay in their clean
 * chapter-scoped form (`form-1`): two artifacts of one unit can each
 * carry a `form-1` auto-anchor and coexist via their distinct internal
 * keys (`${unit}#reading#form-1` vs `${unit}#practice#form-1`) while
 * sharing the same serialized `entry.anchor`. Page URLs are already
 * artifact-scoped (`/units/X/reading#form-1` vs `/units/X/practice#form-1`
 * are different pages), so no anchor disambiguation is needed.
 *
 * These tests use formatives as the representative entry type (the
 * motivating case: chrome-primitives-demo's `practice.mdx` formatives
 * were being clobbered by `reading.mdx` under the old `clearUnit`);
 * the keying scheme is shared across all Map-backed collections.
 */
beforeEach(() => {
  resetIndexAccumulator();
});

const formative = (
  unit: string,
  anchor: string,
  overrides: Partial<FormativeEntry> = {}
): FormativeEntry => ({
  unit,
  anchor,
  kind: "quickcheck",
  prompt: "p",
  answer: { type: "solution-only" },
  hasSolution: true,
  hintCount: 0,
  ...overrides,
});

describe("artifact-scoped accumulation (Task 7)", () => {
  test("(a) two artifacts add distinct formatives to one unit — both survive", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "intro-check"),
    ]);
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "drill-1"),
      formative(unit, "drill-2"),
    ]);

    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit.map((f) => f.anchor).sort()).toEqual([
      "drill-1",
      "drill-2",
      "intro-check",
    ]);
  });

  test("(b) clearUnitArtifact(unit, 'reading') drops only reading's entries", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "intro-check"),
    ]);
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "drill-1"),
    ]);

    indexAccumulator.clearUnitArtifact(unit, "reading");

    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit.map((f) => f.anchor)).toEqual(["drill-1"]);
  });

  test("(b') re-extracting an artifact (clear + re-add) is idempotent and leaves siblings intact", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "intro-check"),
    ]);
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "drill-1", { prompt: "v1" }),
    ]);

    // Simulate an HMR re-parse of practice.mdx only.
    indexAccumulator.clearUnitArtifact(unit, "practice");
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "drill-1", { prompt: "v2" }),
    ]);

    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit).toHaveLength(2);
    expect(inUnit.find((f) => f.anchor === "drill-1")?.prompt).toBe("v2");
    expect(inUnit.find((f) => f.anchor === "intro-check")).toBeDefined();
  });

  test("(c) intra-unit cross-artifact collision on an explicit anchor throws", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "photon-budget"),
    ]);
    expect(() =>
      indexAccumulator.addFormatives(unit, "practice", [
        formative(unit, "photon-budget"),
      ])
    ).toThrow(/two artifacts of unit/i);
    expect(() =>
      indexAccumulator.addFormatives(unit, "practice", [
        formative(unit, "photon-budget"),
      ])
    ).toThrow(/photon-budget/);
  });

  test("(d) clean positional auto-anchors from two artifacts coexist (no-clobber via internal key)", () => {
    const unit = "chrome-primitives-demo";
    // Both artifacts produce the SAME clean auto-anchor `form-1`; the
    // artifact lives only in the internal storage key, so the two
    // entries coexist rather than clobber — and the auto-anchor shape
    // is exempt from the explicit-collision throw.
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "form-1"),
    ]);
    expect(() =>
      indexAccumulator.addFormatives(unit, "practice", [
        formative(unit, "form-1"),
      ])
    ).not.toThrow();
    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit).toHaveLength(2);
    // Both survive serialization and share the clean `entry.anchor`.
    expect(inUnit.map((f) => f.anchor)).toEqual(["form-1", "form-1"]);
  });

  test("cross-unit same explicit anchor across artifacts still throws (M2-style)", () => {
    // Two DIFFERENT units, same explicit anchor — the original cross-
    // chapter invariant is unchanged by the artifact-scope split.
    indexAccumulator.addFormatives("unit-a", "reading", [
      formative("unit-a", "shared-explicit"),
    ]);
    expect(() =>
      indexAccumulator.addFormatives("unit-b", "reading", [
        formative("unit-b", "shared-explicit"),
      ])
    ).toThrow(/multiple chapters/i);
  });
});
