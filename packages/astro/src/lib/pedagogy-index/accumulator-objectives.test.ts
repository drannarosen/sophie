import type { ObjectiveEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator objectives (cross-chapter)", () => {
  const objective = (
    overrides: Partial<ObjectiveEntry> = {}
  ): ObjectiveEntry => ({
    id: "lo-1",
    verb: "Recognize",
    body: "<p>body</p>",
    unit: "obj-ch-a",
    anchor: "lo-lo-1",
    ...overrides,
  });

  test("addObjectives keyed by chapter+anchor; two chapters can each declare 'lo-1'", () => {
    indexAccumulator.addObjectives("u", "reading", [
      objective({ id: "lo-1", unit: "obj-share-a", anchor: "lo-lo-1" }),
    ]);
    indexAccumulator.addObjectives("u", "reading", [
      objective({ id: "lo-1", unit: "obj-share-b", anchor: "lo-lo-1" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.objectives.filter((o) => o.id === "lo-1");
    const chapters = shared.map((o) => o.unit).sort();
    expect(chapters).toContain("obj-share-a");
    expect(chapters).toContain("obj-share-b");
  });

  test("addObjectives — multiple objectives within one chapter coexist", () => {
    indexAccumulator.addObjectives("u", "reading", [
      objective({ id: "lo-1", unit: "obj-multi", anchor: "lo-lo-1" }),
      objective({ id: "lo-2", unit: "obj-multi", anchor: "lo-lo-2" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.objectives.filter((o) => o.unit === "obj-multi");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((o) => o.id).sort()).toEqual(["lo-1", "lo-2"]);
  });

  test("clearUnitArtifact removes objectives for the target chapter; other chapters survive", () => {
    indexAccumulator.addObjectives("u", "reading", [
      objective({ id: "lo-a", unit: "obj-clr-a", anchor: "lo-lo-a" }),
    ]);
    indexAccumulator.addObjectives("u", "reading", [
      objective({ id: "lo-b", unit: "obj-clr-b", anchor: "lo-lo-b" }),
    ]);

    indexAccumulator.clearUnitArtifact("obj-clr-a", "reading");

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.objectives.filter((o) => o.unit === "obj-clr-a")).toHaveLength(
      0
    );
    expect(index.objectives.find((o) => o.unit === "obj-clr-b")?.id).toBe(
      "lo-b"
    );
  });
});
