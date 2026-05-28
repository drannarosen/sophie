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
 * being re-extracted. Auto-anchors are artifact-namespaced
 * (`reading-form-1` vs `practice-form-1`) so consumers can tell which
 * artifact authored an entry.
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
      formative(unit, "reading-form-1"),
    ]);
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "practice-form-1"),
      formative(unit, "practice-form-2"),
    ]);

    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit.map((f) => f.anchor).sort()).toEqual([
      "practice-form-1",
      "practice-form-2",
      "reading-form-1",
    ]);
  });

  test("(b) clearUnitArtifact(unit, 'reading') drops only reading's entries", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "reading-form-1"),
    ]);
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "practice-form-1"),
    ]);

    indexAccumulator.clearUnitArtifact(unit, "reading");

    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit.map((f) => f.anchor)).toEqual(["practice-form-1"]);
  });

  test("(b') re-extracting an artifact (clear + re-add) is idempotent and leaves siblings intact", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "reading-form-1"),
    ]);
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "practice-form-1", { prompt: "v1" }),
    ]);

    // Simulate an HMR re-parse of practice.mdx only.
    indexAccumulator.clearUnitArtifact(unit, "practice");
    indexAccumulator.addFormatives(unit, "practice", [
      formative(unit, "practice-form-1", { prompt: "v2" }),
    ]);

    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit).toHaveLength(2);
    expect(inUnit.find((f) => f.anchor === "practice-form-1")?.prompt).toBe(
      "v2"
    );
    expect(inUnit.find((f) => f.anchor === "reading-form-1")).toBeDefined();
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

  test("(d) artifact-namespaced auto-anchors from two artifacts do NOT collide", () => {
    const unit = "chrome-primitives-demo";
    indexAccumulator.addFormatives(unit, "reading", [
      formative(unit, "reading-form-1"),
    ]);
    // `practice-form-1` is a DISTINCT auto-anchor — the artifact prefix
    // is what keeps the two positional `form-1`s apart symbolically.
    expect(() =>
      indexAccumulator.addFormatives(unit, "practice", [
        formative(unit, "practice-form-1"),
      ])
    ).not.toThrow();
    const inUnit = indexAccumulator
      .asPedagogyIndex()
      .formatives.filter((f) => f.unit === unit);
    expect(inUnit).toHaveLength(2);
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
