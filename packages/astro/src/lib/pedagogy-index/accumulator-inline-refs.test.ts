import type { InlineRefUsageEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator inlineRefUsages (cross-chapter)", () => {
  const usage = (
    overrides: Partial<InlineRefUsageEntry> = {}
  ): InlineRefUsageEntry => ({
    kind: "glossary-term",
    refKey: "Parallax",
    unit: "iru-ch-a",
    ...overrides,
  });

  test("addInlineRefUsages appends entries; same (kind, refKey) duplicates coexist", () => {
    indexAccumulator.addInlineRefUsages([
      usage({ unit: "iru-multi" }),
      usage({ unit: "iru-multi" }),
      usage({ kind: "eq-ref", refKey: "wiens-law", unit: "iru-multi" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.inlineRefUsages.filter((u) => u.unit === "iru-multi");
    expect(inCh).toHaveLength(3);
    const glossary = inCh.filter((u) => u.kind === "glossary-term");
    expect(glossary).toHaveLength(2);
  });

  test("clearUnit removes inlineRefUsages for that chapter; others survive", () => {
    indexAccumulator.addInlineRefUsages([
      usage({ unit: "iru-clr-a", refKey: "term-a" }),
      usage({ unit: "iru-clr-b", refKey: "term-b" }),
    ]);

    indexAccumulator.clearUnit("iru-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.inlineRefUsages.filter((u) => u.unit === "iru-clr-a")
    ).toHaveLength(0);
    expect(
      index.inlineRefUsages.find((u) => u.unit === "iru-clr-b")?.refKey
    ).toBe("term-b");
  });
});
