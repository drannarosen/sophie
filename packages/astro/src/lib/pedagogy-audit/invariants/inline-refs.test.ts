import type {
  DefinitionEntry,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  PedagogyIndex,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * Tests for the inline-ref invariants implemented in
 * `inline-refs.ts`. Split out of `runner.test.ts` per A+ Phase E
 * (ADR 0061 Rule 3: tests split alongside source).
 *
 * Invariant codes covered:
 *   D4 (ERROR)  undefined <GlossaryTerm name=X>
 *   E4 (ERROR)  undefined <EquationRef refId=X>
 *   F1 (ERROR)  <Figure name=X> with X not in registry
 *   F2 (ERROR)  <FigureRef name=X> for X not in registry
 *   C1 (ERROR)  <ChapterRef slug=X> for unknown chapter
 *
 * D5 (orphan definitions) + F4 (registry figure with zero usages) live
 * in `orphans.test.ts` because they audit the orphans invariant family.
 */

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

const unitFoundations: UnitEntry = {
  id: "foundations",
  type: "lecture",
  title: "Foundations",
  order: 0,
  prereqs: [],
  section_id: "core",
  chapter: "foundations",
  status: "stable",
};

const unitSpoiler: UnitEntry = {
  id: "spoiler-alerts",
  type: "lecture",
  title: "Spoiler Alerts",
  order: 1,
  prereqs: [],
  section_id: "core",
  chapter: "spoiler-alerts",
  status: "stable",
};

describe("D4 — undefined <GlossaryTerm name=X>", () => {
  it("emits an ERROR when a glossary-term inline-ref points at no definition", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [],
      inlineRefUsages: [
        {
          kind: "glossary-term",
          refKey: "Dark matter",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "D4",
    });
    expect(report.errors[0]?.message).toContain("Dark matter");
    expect(report.errors[0]?.location).toMatchObject({
      unit: "spoiler-alerts",
    });
  });

  it("slugifies both sides so casing/whitespace do not matter", () => {
    const def: DefinitionEntry = {
      term: "Dark matter",
      slug: "dark-matter",
      body: "",
      unit: "spoiler-alerts",
      anchor: "dark-matter",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [def],
      inlineRefUsages: [
        // Author wrote "DARK MATTER" — should still resolve to slug "dark-matter".
        {
          kind: "glossary-term",
          refKey: "DARK MATTER",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
  });
});

describe("E4 — undefined <EquationRef refId=X>", () => {
  it("emits an ERROR when an eq-ref points at no equation", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      equations: [],
      inlineRefUsages: [
        {
          kind: "eq-ref",
          refKey: "inverse-square-law",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "E4",
    });
    expect(report.errors[0]?.message).toContain("inverse-square-law");
  });

  it("does not flag an eq-ref that matches an equation id", () => {
    const eq: EquationEntry = {
      id: "wiens-law",
      title: "Wien's Law",
      tex: "\\lambda_{max} T = b",
      symbols: ["T"],
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      equations: [eq],
      inlineRefUsages: [
        { kind: "eq-ref", refKey: "wiens-law", unit: "spoiler-alerts" },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
  });
});

describe("F1 — <Figure name=X> with X not in registry", () => {
  it("emits an ERROR when a figureUsage references a name not in figureRegistry", () => {
    const figUse: FigureUsageEntry = {
      name: "missing-from-registry",
      unit: "spoiler-alerts",
      anchor: "fig-missing-from-registry-1",
      number: 1,
      canonical: false,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      figureRegistry: [],
      figureUsages: [figUse],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "F1",
    });
    expect(report.errors[0]?.message).toContain("missing-from-registry");
    expect(report.errors[0]?.location).toMatchObject({
      unit: "spoiler-alerts",
    });
  });
});

describe("F2 — <FigureRef name=X> for X not in registry", () => {
  it("emits an ERROR when a figure-ref inline-ref points at a name not in figureRegistry", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      figureRegistry: [],
      inlineRefUsages: [
        {
          kind: "figure-ref",
          refKey: "phantom-figure",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "F2",
    });
    expect(report.errors[0]?.message).toContain("phantom-figure");
  });

  it("does not flag a FigureRef whose name appears in figureRegistry (even with no Figure usage)", () => {
    // F2 catches FigureRefs pointing at unregistered names. A registered
    // figure with no <Figure> usage is the F4 case (WARNING), not F2.
    const fig: FigureRegistryEntry = {
      name: "registered-only",
      src: "/x.png",
      alt: "x",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      figureRegistry: [fig],
      inlineRefUsages: [
        {
          kind: "figure-ref",
          refKey: "registered-only",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
  });
});

describe("C1 — <ChapterRef slug=X> for unknown chapter", () => {
  it("emits an ERROR when a chapter-ref points at no chapter in the chapters collection", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitFoundations],
      inlineRefUsages: [
        {
          kind: "chapter-ref",
          refKey: "does-not-exist",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "C1",
    });
    expect(report.errors[0]?.message).toContain("does-not-exist");
  });

  it("does not flag a chapter-ref pointing at a known chapter slug", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitFoundations, unitSpoiler],
      inlineRefUsages: [
        {
          kind: "chapter-ref",
          refKey: "foundations",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
  });
});
