import type { KeyInsightEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator key-insights (cross-chapter)", () => {
  const ki = (overrides: Partial<KeyInsightEntry> = {}): KeyInsightEntry => ({
    title: "Default",
    body: "",
    unit: "ch-a",
    anchor: "default-anchor",
    slug: "default",
    ...overrides,
  });

  test("addKeyInsights populates keyInsights collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addKeyInsights("u", "reading", [
      ki({ title: "Alpha", unit: "ki-ch-a", anchor: "alpha" }),
      ki({ title: "Beta", unit: "ki-ch-b", anchor: "beta" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const titles = index.keyInsights
      .filter((k) => k.unit === "ki-ch-a" || k.unit === "ki-ch-b")
      .map((k) => k.title)
      .sort();
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  test("clearUnitArtifact removes key-insights for the target chapter; other chapters survive", () => {
    indexAccumulator.addKeyInsights("u", "reading", [
      ki({ title: "Insight A", unit: "ki-clear-a", anchor: "insight-a" }),
      ki({ title: "Insight B", unit: "ki-clear-b", anchor: "insight-b" }),
    ]);

    indexAccumulator.clearUnitArtifact("ki-clear-a", "reading");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.keyInsights.filter((k) => k.unit === "ki-clear-a")
    ).toHaveLength(0);
    expect(index.keyInsights.find((k) => k.unit === "ki-clear-b")?.title).toBe(
      "Insight B"
    );
  });

  test("two chapters can share an auto-anchor (e.g. 'ki-1') without collision", () => {
    indexAccumulator.addKeyInsights("u", "reading", [
      ki({ unit: "ki-share-a", anchor: "ki-1" }),
    ]);
    indexAccumulator.addKeyInsights("u", "reading", [
      ki({ unit: "ki-share-b", anchor: "ki-1" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.keyInsights.filter((k) => k.anchor === "ki-1");
    const chapters = shared.map((k) => k.unit).sort();
    expect(chapters).toContain("ki-share-a");
    expect(chapters).toContain("ki-share-b");
  });
});
