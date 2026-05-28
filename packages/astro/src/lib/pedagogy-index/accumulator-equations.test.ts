import type { EquationCitationEntry, EquationEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator equations (registry-sourced per ADR 0060)", () => {
  const makeEq = (overrides: Partial<EquationEntry> = {}): EquationEntry => ({
    id: "default-id",
    title: "Default Title",
    tex: "x = 1",
    symbols: ["x"],
    ...overrides,
  });

  test("addEquations stores entries keyed by id (registry-sourced; last-write-wins)", () => {
    indexAccumulator.addEquations([makeEq({ id: "alpha", title: "Alpha" })]);
    indexAccumulator.addEquations([makeEq({ id: "beta", title: "Beta" })]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(2);
    const ids = index.equations.map((e) => e.id).sort();
    expect(ids).toEqual(["alpha", "beta"]);
  });

  test("re-adding an entry with the same id overwrites (last-write-wins)", () => {
    indexAccumulator.addEquations([
      makeEq({ id: "wiens-law", title: "First" }),
    ]);
    indexAccumulator.addEquations([
      makeEq({ id: "wiens-law", title: "Second" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(1);
    expect(index.equations[0]?.title).toBe("Second");
  });

  test("clearEquations() wipes the registry slot wholesale", () => {
    indexAccumulator.addEquations([makeEq({ id: "a" }), makeEq({ id: "b" })]);
    indexAccumulator.clearEquations();
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toEqual([]);
  });

  test("clearUnitArtifact does NOT touch the registry equations slot", () => {
    // Post-ADR-0060: equations are registry-global; chapter clears only
    // touch chapter-keyed collections + equationCitations.
    indexAccumulator.addEquations([makeEq({ id: "wiens-law" })]);
    indexAccumulator.clearUnitArtifact("any-chapter", "reading");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(1);
  });
});

describe("indexAccumulator equationCitations (per-chapter)", () => {
  const makeCitation = (
    overrides: Partial<EquationCitationEntry> = {}
  ): EquationCitationEntry => ({
    unit: "ch-a",
    refId: "wiens-law",
    anchor: "wiens-law-citation-1",
    number: 1,
    ...overrides,
  });

  test("addEquationCitations appends citations from any chapter", () => {
    indexAccumulator.addEquationCitations("u", "reading", [
      makeCitation({ unit: "ch-a", refId: "wiens-law" }),
    ]);
    indexAccumulator.addEquationCitations("u", "reading", [
      makeCitation({ unit: "ch-b", refId: "stefan-boltzmann", number: 1 }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equationCitations).toHaveLength(2);
  });

  test("clearUnitArtifact removes only that (unit, artifact)'s citations", () => {
    indexAccumulator.addEquationCitations("u", "reading", [
      makeCitation({ unit: "ch-a", refId: "alpha" }),
      makeCitation({
        unit: "ch-a",
        refId: "beta",
        number: 2,
        anchor: "beta-citation-2",
      }),
    ]);
    indexAccumulator.addEquationCitations("u", "reading", [
      makeCitation({
        unit: "ch-b",
        refId: "gamma",
        anchor: "gamma-citation-1",
      }),
    ]);

    indexAccumulator.clearUnitArtifact("ch-a", "reading");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equationCitations).toHaveLength(1);
    expect(index.equationCitations[0]?.unit).toBe("ch-b");
  });

  test("clearUnitArtifact also clears that artifact's citations", () => {
    indexAccumulator.addEquationCitations("u", "reading", [
      makeCitation({ unit: "ch-a", refId: "alpha" }),
      makeCitation({
        unit: "ch-b",
        refId: "beta",
        anchor: "beta-citation-1",
      }),
    ]);
    indexAccumulator.clearUnitArtifact("ch-a", "reading");
    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.equationCitations.filter((c) => c.unit === "ch-a")
    ).toHaveLength(0);
    expect(
      index.equationCitations.filter((c) => c.unit === "ch-b")
    ).toHaveLength(1);
  });
});
