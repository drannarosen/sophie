import type { MisconceptionEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator misconceptions (cross-chapter)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => {
    const unit = overrides.unit ?? "mc-ch-a";
    const anchor = overrides.anchor ?? "default-anchor";
    return {
      body: "",
      unit,
      anchor,
      length: "short",
      slug: `${unit}-${anchor}`,
      ...overrides,
    };
  };

  test("addMisconceptions populates misconceptions collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addMisconceptions([
      mc({
        unit: "mc-pop-a",
        anchor: "alpha",
        label: "Alpha",
        length: "short",
      }),
      mc({
        unit: "mc-pop-b",
        anchor: "beta",
        label: "Beta",
        length: "long",
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const labels = index.misconceptions
      .filter((m) => m.unit === "mc-pop-a" || m.unit === "mc-pop-b")
      .map((m) => m.label)
      .sort();
    expect(labels).toEqual(["Alpha", "Beta"]);
  });

  test("M2 — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-m2-a", anchor: "shared-explicit-id" }),
    ]);

    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/M2 invariant/);
    // Error names BOTH chapter slugs.
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/mc-m2-a/);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/mc-m2-b/);
  });

  test("M2 — explicit id starting with 'misc-' still triggers cross-chapter collision", () => {
    // Regression for tightened predicate: `startsWith("misc-")` would
    // silently let an author-supplied `id="misc-orbital"` bypass M2.
    // The tightened `/^misc-\d+$/` matches only the literal auto-anchor
    // shape, so explicit ids like `misc-orbital` still validate.
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-misc-a", anchor: "misc-orbital" }),
    ]);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-misc-b", anchor: "misc-orbital" }),
      ])
    ).toThrow(/M2 invariant/);
  });

  test("M2 — auto-anchors ('misc-N') do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-auto-a", anchor: "misc-1" }),
    ]);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-auto-b", anchor: "misc-1" }),
      ])
    ).not.toThrow();

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.misconceptions.filter((m) => m.anchor === "misc-1");
    const chapters = shared.map((m) => m.unit).sort();
    expect(chapters).toContain("mc-auto-a");
    expect(chapters).toContain("mc-auto-b");
  });

  test("addMisconceptions validates the whole batch BEFORE mutating", () => {
    // Seed.
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-pre-a", anchor: "seeded-id" }),
    ]);

    // Batch: entry 1 is a fresh non-colliding misconception; entry 2 collides.
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-pre-b", anchor: "fresh-id" }),
        mc({ unit: "mc-pre-b", anchor: "seeded-id" }),
      ])
    ).toThrow(/M2 invariant/);

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.misconceptions.find(
        (m) => m.unit === "mc-pre-b" && m.anchor === "fresh-id"
      )
    ).toBeUndefined();
  });

  test("clearUnit removes misconceptions for the target chapter; other chapters survive", () => {
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-clr-a", anchor: "mc-a-1", label: "A" }),
      mc({ unit: "mc-clr-b", anchor: "mc-b-1", label: "B" }),
    ]);

    indexAccumulator.clearUnit("mc-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.misconceptions.filter((m) => m.unit === "mc-clr-a")
    ).toHaveLength(0);
    expect(index.misconceptions.find((m) => m.unit === "mc-clr-b")?.label).toBe(
      "B"
    );
  });

  test("asPedagogyIndex returns populated misconceptions (was empty `[]` before Task 7)", () => {
    indexAccumulator.addMisconceptions([
      mc({
        unit: "mc-ap-a",
        anchor: "ap-1",
        label: "AP One",
        length: "short",
      }),
      mc({
        unit: "mc-ap-a",
        anchor: "ap-2",
        label: "AP Two",
        length: "long",
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.misconceptions.filter((m) => m.unit === "mc-ap-a");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((m) => m.label).sort()).toEqual(["AP One", "AP Two"]);
  });
});
