import type {
  DefinitionEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * Tests for the orphan invariants implemented in `orphans.ts`. Split
 * out of `runner.test.ts` per A+ Phase E (ADR 0061 Rule 3).
 *
 * Invariant codes covered:
 *   D5 (WARNING)  definition with zero <GlossaryTerm> usages
 *   F4 (WARNING)  registry figure with zero <Figure>+<FigureRef> usages
 */

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

describe("D5 — orphan definitions (WARNING)", () => {
  it("emits a WARNING when a definition has zero GlossaryTerm usages anywhere", () => {
    const def: DefinitionEntry = {
      term: "Aphelion",
      slug: "aphelion",
      body: "",
      unit: "spoiler-alerts",
      anchor: "aphelion",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [def],
      inlineRefUsages: [],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toMatchObject({
      severity: "WARNING",
      code: "D5",
    });
    expect(report.warnings[0]?.message).toContain("Aphelion");
  });

  it("does not flag a definition that has at least one GlossaryTerm usage", () => {
    const def: DefinitionEntry = {
      term: "Photon",
      slug: "photon",
      body: "",
      unit: "spoiler-alerts",
      anchor: "photon",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [def],
      inlineRefUsages: [
        { kind: "glossary-term", refKey: "Photon", unit: "spoiler-alerts" },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toEqual([]);
  });
});

describe("F4 — registry figure with zero usages (WARNING)", () => {
  it("emits a WARNING when a figureRegistry entry has zero <Figure> and zero <FigureRef> usages", () => {
    const fig: FigureRegistryEntry = {
      name: "lonely-figure",
      src: "/x.png",
      alt: "x",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      figureRegistry: [fig],
      figureUsages: [],
      inlineRefUsages: [],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toMatchObject({
      severity: "WARNING",
      code: "F4",
    });
    expect(report.warnings[0]?.message).toContain("lonely-figure");
  });

  it("does not flag a figureRegistry entry that has a <Figure> usage", () => {
    const fig: FigureRegistryEntry = {
      name: "used-figure",
      src: "/x.png",
      alt: "x",
    };
    const use: FigureUsageEntry = {
      name: "used-figure",
      unit: "spoiler-alerts",
      anchor: "fig-used-figure-1",
      number: 1,
      canonical: false,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      figureRegistry: [fig],
      figureUsages: [use],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toEqual([]);
  });

  it("does not flag a figureRegistry entry that has a <FigureRef> usage but no <Figure> usage", () => {
    const fig: FigureRegistryEntry = {
      name: "ref-only-figure",
      src: "/x.png",
      alt: "x",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      figureRegistry: [fig],
      figureUsages: [],
      inlineRefUsages: [
        {
          kind: "figure-ref",
          refKey: "ref-only-figure",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toEqual([]);
  });
});
