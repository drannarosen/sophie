import type {
  FigureRegistryEntry,
  FigureUsageEntry,
} from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator figures (cross-chapter)", () => {
  const fu = (overrides: Partial<FigureUsageEntry> = {}): FigureUsageEntry => ({
    name: "decoder-ring",
    unit: "ch-a",
    anchor: "fig-decoder-ring-1",
    number: 1,
    canonical: false,
    ...overrides,
  });

  // T31
  test("addFigureUsages throws on F3 (multiple canonical for same name across chapters)", () => {
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "decoder-ring",
        unit: "fig-a",
        anchor: "fig-decoder-ring-1",
        canonical: true,
      }),
    ]);

    expect(() =>
      indexAccumulator.addFigureUsages("u", "reading", [
        fu({
          name: "decoder-ring",
          unit: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/F3 invariant/);
    // Error message names BOTH chapter slugs.
    expect(() =>
      indexAccumulator.addFigureUsages("u", "reading", [
        fu({
          name: "decoder-ring",
          unit: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/fig-a/);
    expect(() =>
      indexAccumulator.addFigureUsages("u", "reading", [
        fu({
          name: "decoder-ring",
          unit: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/fig-b/);
  });

  test("addFigureUsages detects multiple canonical within a SINGLE batch", () => {
    // Both entries in the same call, both canonical, different chapters.
    expect(() =>
      indexAccumulator.addFigureUsages("u", "reading", [
        fu({
          name: "spectrum",
          unit: "fig-batch-a",
          anchor: "fig-spectrum-1",
          canonical: true,
        }),
        fu({
          name: "spectrum",
          unit: "fig-batch-b",
          anchor: "fig-spectrum-1",
          canonical: true,
        }),
      ])
    ).toThrow(/F3 invariant/);
  });

  test("addFigureUsages allows multi-chapter usages when only ONE is canonical", () => {
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "hr-diagram",
        unit: "fig-ok-a",
        anchor: "fig-hr-diagram-1",
        canonical: true,
      }),
    ]);
    expect(() =>
      indexAccumulator.addFigureUsages("u", "reading", [
        fu({
          name: "hr-diagram",
          unit: "fig-ok-b",
          anchor: "fig-hr-diagram-1",
          canonical: false,
        }),
      ])
    ).not.toThrow();

    const index = indexAccumulator.asPedagogyIndex();
    const usages = index.figureUsages.filter((u) => u.name === "hr-diagram");
    expect(usages).toHaveLength(2);
    expect(usages.filter((u) => u.canonical)).toHaveLength(1);
  });

  test("addFigureUsages validates the whole batch BEFORE mutating (canonical-collision in entry 2 leaves entry 1 unwritten)", () => {
    // Seed: chapter "fig-pre-a" has a canonical usage of "x".
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "x",
        unit: "fig-pre-a",
        anchor: "fig-x-1",
        canonical: true,
      }),
    ]);

    // Batch: entry 1 is a fresh non-colliding usage; entry 2 collides
    // canonically. The whole batch must throw with entry 1 unwritten.
    expect(() =>
      indexAccumulator.addFigureUsages("u", "reading", [
        fu({
          name: "fresh-fig",
          unit: "fig-pre-b",
          anchor: "fig-fresh-fig-1",
          canonical: false,
        }),
        fu({
          name: "x",
          unit: "fig-pre-b",
          anchor: "fig-x-1",
          canonical: true,
        }),
      ])
    ).toThrow(/F3 invariant/);

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.figureUsages.find((u) => u.name === "fresh-fig")
    ).toBeUndefined();
  });

  test('two <Figure name="X"> in one chapter produce two distinct usages (no clobber)', () => {
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "hr-diagram",
        unit: "ch-fig-dupe",
        anchor: "fig-hr-diagram-1",
        canonical: false,
      }),
      fu({
        name: "hr-diagram",
        unit: "ch-fig-dupe",
        anchor: "fig-hr-diagram-2",
        number: 2,
        canonical: false,
      }),
    ]);
    const usages = indexAccumulator
      .asPedagogyIndex()
      .figureUsages.filter(
        (u) => u.unit === "ch-fig-dupe" && u.name === "hr-diagram"
      );
    expect(usages).toHaveLength(2);
    expect(usages.map((u) => u.anchor).sort()).toEqual([
      "fig-hr-diagram-1",
      "fig-hr-diagram-2",
    ]);
  });

  // T32
  test("clearUnitArtifact removes figureUsages for that chapter; other chapters survive", () => {
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "fig-a",
        unit: "fig-clr-a",
        anchor: "fig-fig-a-1",
        canonical: false,
      }),
      fu({
        name: "fig-b",
        unit: "fig-clr-b",
        anchor: "fig-fig-b-1",
        canonical: false,
      }),
    ]);

    indexAccumulator.clearUnitArtifact("fig-clr-a", "reading");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.figureUsages.filter((u) => u.unit === "fig-clr-a")
    ).toHaveLength(0);
    expect(index.figureUsages.find((u) => u.unit === "fig-clr-b")?.name).toBe(
      "fig-b"
    );
  });

  test("asPedagogyIndex returns populated figureUsages (was empty `[]` in earlier PRs)", () => {
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "fig-1",
        unit: "fig-ap-a",
        anchor: "fig-fig-1-1",
        canonical: false,
      }),
      fu({
        name: "fig-2",
        unit: "fig-ap-a",
        anchor: "fig-fig-2-2",
        number: 2,
        canonical: false,
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inChApA = index.figureUsages.filter((u) => u.unit === "fig-ap-a");
    expect(inChApA).toHaveLength(2);
    expect(inChApA.map((u) => u.name).sort()).toEqual(["fig-1", "fig-2"]);
  });

  test("asPedagogyIndex leaves figureRegistry as [] (extractor never populates it; SSR merge does)", () => {
    indexAccumulator.addFigureUsages("u", "reading", [
      fu({
        name: "anything",
        unit: "fig-reg-a",
        anchor: "fig-anything-1",
        canonical: false,
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.figureRegistry).toEqual([]);
  });
});

describe("indexAccumulator setFigureRegistry / figureRegistry", () => {
  // PR-C3 two-tier model: registry comes from consumer frontmatter
  // (set globally via `setFigureRegistry`), usages come from per-chapter
  // `<Figure>` walks. These tests lock in the registry-side semantics
  // so future refactors of the accumulator can't silently break them.

  test("setFigureRegistry overwrites prior entries (last-write-wins)", () => {
    const entryA: FigureRegistryEntry = {
      name: "set-fr-a",
      src: "/a.png",
      alt: "A",
    };
    const entryB: FigureRegistryEntry = {
      name: "set-fr-b",
      src: "/b.png",
      alt: "B",
    };
    const entryC: FigureRegistryEntry = {
      name: "set-fr-c",
      src: "/c.png",
      alt: "C",
    };

    indexAccumulator.setFigureRegistry([entryA, entryB]);
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([
      entryA,
      entryB,
    ]);

    indexAccumulator.setFigureRegistry([entryC]);
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([entryC]);
  });

  test("clearUnitArtifact does NOT touch figureRegistry (consumer-global, not per-chapter)", () => {
    const entry: FigureRegistryEntry = {
      name: "clr-fr-x",
      src: "/x.png",
      alt: "X",
    };
    indexAccumulator.setFigureRegistry([entry]);

    indexAccumulator.clearUnitArtifact("some-chapter", "reading");
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([entry]);
  });
});
