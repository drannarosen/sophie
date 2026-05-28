import type { DeepDiveEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator deepDives (cross-chapter)", () => {
  const dd = (overrides: Partial<DeepDiveEntry> = {}): DeepDiveEntry => ({
    unit: "dd-ch-a",
    anchor: "default-anchor",
    title: "Default Title",
    body: "<p>body</p>",
    ...overrides,
  });

  test("addDeepDives populates deepDives collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addDeepDives("u", "reading", [
      dd({ unit: "dd-pop-a", anchor: "alpha", title: "Alpha" }),
      dd({ unit: "dd-pop-b", anchor: "beta", title: "Beta" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const titles = index.deepDives
      .filter((d) => d.unit === "dd-pop-a" || d.unit === "dd-pop-b")
      .map((d) => d.title)
      .sort();
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  test("D2 — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addDeepDives("u", "reading", [
      dd({ unit: "dd-d2-a", anchor: "shared-explicit-id" }),
    ]);

    expect(() =>
      indexAccumulator.addDeepDives("u", "reading", [
        dd({ unit: "dd-d2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/D2 invariant/);
    expect(() =>
      indexAccumulator.addDeepDives("u", "reading", [
        dd({ unit: "dd-d2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/dd-d2-a/);
    expect(() =>
      indexAccumulator.addDeepDives("u", "reading", [
        dd({ unit: "dd-d2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/dd-d2-b/);
  });

  test("D2 — auto-anchors ('dd-N') do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addDeepDives("u", "reading", [
      dd({ unit: "dd-auto-a", anchor: "dd-1" }),
    ]);
    expect(() =>
      indexAccumulator.addDeepDives("u", "reading", [
        dd({ unit: "dd-auto-b", anchor: "dd-1" }),
      ])
    ).not.toThrow();
    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.deepDives.filter(
        (d) => d.unit === "dd-auto-a" || d.unit === "dd-auto-b"
      )
    ).toHaveLength(2);
  });

  test("D2 — explicit id 'dd-orbital' (non-numeric) DOES trigger cross-chapter collision", () => {
    indexAccumulator.addDeepDives("u", "reading", [
      dd({ unit: "dd-explicit-a", anchor: "dd-orbital" }),
    ]);
    expect(() =>
      indexAccumulator.addDeepDives("u", "reading", [
        dd({ unit: "dd-explicit-b", anchor: "dd-orbital" }),
      ])
    ).toThrow(/D2 invariant/);
  });

  test("clearUnitArtifact drops deep-dive entries for the chapter", () => {
    indexAccumulator.addDeepDives("u", "reading", [
      dd({ unit: "dd-clear-a", anchor: "a-entry" }),
      dd({ unit: "dd-clear-b", anchor: "b-entry" }),
    ]);
    indexAccumulator.clearUnitArtifact("dd-clear-a", "reading");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.deepDives.filter((d) => d.unit === "dd-clear-a")).toHaveLength(
      0
    );
    expect(index.deepDives.filter((d) => d.unit === "dd-clear-b")).toHaveLength(
      1
    );
  });
});
