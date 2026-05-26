import type { OMIFlowEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator omiFlows (cross-chapter)", () => {
  const slot = { title: "x", body: "<p>x</p>" };
  const omi = (overrides: Partial<OMIFlowEntry> = {}): OMIFlowEntry => ({
    unit: "omi-ch-a",
    anchor: "default-anchor",
    observable: slot,
    model: slot,
    inference: slot,
    sourceOrder: ["observable", "model", "inference"],
    ...overrides,
  });

  test("addOMIFlows populates collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addOMIFlows([
      omi({ unit: "omi-pop-a", anchor: "alpha" }),
      omi({ unit: "omi-pop-b", anchor: "beta" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    const anchors = index.omiFlows
      .filter((e) => e.unit === "omi-pop-a" || e.unit === "omi-pop-b")
      .map((e) => e.anchor)
      .sort();
    expect(anchors).toEqual(["alpha", "beta"]);
  });

  test("OF — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addOMIFlows([omi({ unit: "ch-a", anchor: "shared" })]);
    expect(() =>
      indexAccumulator.addOMIFlows([omi({ unit: "ch-b", anchor: "shared" })])
    ).toThrow(/cross-chapter.*OMIFlow/i);
  });

  test("OF — auto-anchors (omi-N) do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addOMIFlows([omi({ unit: "auto-a", anchor: "omi-1" })]);
    expect(() =>
      indexAccumulator.addOMIFlows([omi({ unit: "auto-b", anchor: "omi-1" })])
    ).not.toThrow();
  });

  test("clearUnit drops OMIFlow entries for the chapter", () => {
    indexAccumulator.addOMIFlows([
      omi({ unit: "clr-a", anchor: "a-entry" }),
      omi({ unit: "clr-b", anchor: "b-entry" }),
    ]);
    indexAccumulator.clearUnit("clr-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.omiFlows.filter((e) => e.unit === "clr-a")).toHaveLength(0);
    expect(index.omiFlows.filter((e) => e.unit === "clr-b")).toHaveLength(1);
  });
});
