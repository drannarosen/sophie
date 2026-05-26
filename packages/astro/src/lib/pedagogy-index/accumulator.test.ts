import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

/**
 * Cross-entry-type orchestration tests for `indexAccumulator`.
 *
 * Per-entry-type collection semantics (add/clear/last-write-wins) live in
 * sibling `accumulator-<entry-type>.test.ts` files (Phase E megafile split,
 * see ADR 0061 Rule 6). This file keeps the tests that exercise the
 * accumulator's MULTI-collection orchestration — i.e. when multiple
 * entry-type methods fan out into a single `asPedagogyIndex()` snapshot.
 */
beforeEach(() => {
  resetIndexAccumulator();
});

describe("asPedagogyIndex (W2/D3 collections)", () => {
  test("returns sections + units + objectives + inlineRefUsages populated", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "mod-1", title: "Module 1", order: 0 },
    ]);
    indexAccumulator.setUnits([
      {
        id: "ch-x",
        type: "lecture",
        title: "X",
        order: 0,
        prereqs: [],
        section_id: "mod-1",
        chapter: "ch-x",
        status: "stable",
      },
    ]);
    indexAccumulator.addObjectives([
      {
        id: "lo-1",
        verb: "Recognize",
        body: "<p>body</p>",
        unit: "ch-x",
        anchor: "lo-lo-1",
      },
    ]);
    indexAccumulator.addInlineRefUsages([
      { kind: "chapter-ref", refKey: "ch-x", unit: "ch-y" },
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toHaveLength(1);
    expect(index.units).toHaveLength(1);
    expect(index.objectives).toHaveLength(1);
    expect(index.inlineRefUsages).toHaveLength(1);
  });
});
