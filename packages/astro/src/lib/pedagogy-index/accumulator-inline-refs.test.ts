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
    indexAccumulator.addInlineRefUsages("u", "reading", [
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

  test("clearUnitArtifact removes inlineRefUsages for that chapter; others survive", () => {
    indexAccumulator.addInlineRefUsages("u", "reading", [
      usage({ unit: "iru-clr-a", refKey: "term-a" }),
      usage({ unit: "iru-clr-b", refKey: "term-b" }),
    ]);

    indexAccumulator.clearUnitArtifact("iru-clr-a", "reading");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.inlineRefUsages.filter((u) => u.unit === "iru-clr-a")
    ).toHaveLength(0);
    expect(
      index.inlineRefUsages.find((u) => u.unit === "iru-clr-b")?.refKey
    ).toBe("term-b");
  });

  test("clearUnitArtifact is artifact-scoped within one unit: clearing 'practice' keeps the same unit's 'reading' usages (append-only over-clear shield)", () => {
    indexAccumulator.addInlineRefUsages("iru-multi-art", "reading", [
      usage({ unit: "iru-multi-art", refKey: "from-reading" }),
    ]);
    indexAccumulator.addInlineRefUsages("iru-multi-art", "practice", [
      usage({ unit: "iru-multi-art", refKey: "from-practice" }),
    ]);

    indexAccumulator.clearUnitArtifact("iru-multi-art", "practice");

    const index = indexAccumulator.asPedagogyIndex();
    const refs = index.inlineRefUsages.filter(
      (u) => u.unit === "iru-multi-art"
    );
    expect(refs).toHaveLength(1);
    expect(refs[0]?.refKey).toBe("from-reading");
  });
});
