import type {
  EquationCitationEntry,
  EquationEntry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "./pedagogy-audit.ts";

/**
 * Audit invariants R1–R4 per ADR 0060 — registry-ecosystem cross-
 * reference integrity. The R-prefix family fires on relationships
 * between `equations[]` (registry declarations) and
 * `equationCitations[]` (chapter-side callsites) in the pedagogy
 * index:
 *
 *   - R1 ERROR   — citation references a refId that has no registry
 *                  entry.
 *   - R2 WARNING — registry entry has no citations (orphan).
 *   - R3 ERROR   — registry entry fails schema validation (defense
 *                  in depth; extractor catches the typical path).
 *   - R4 WARNING — `related[].refId` points at a non-existent
 *                  registry entry.
 */

function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
    equationCitations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    chapters: [],
    modules: [],
    objectives: [],
    inlineRefUsages: [],
    contractValidations: [],
    extractorFindings: [],
    multiReps: [],
    interventions: [],
  };
}

function makeEquation(overrides: Partial<EquationEntry> = {}): EquationEntry {
  return {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{peak} = b T^{-1}",
    symbols: ["T"],
    ...overrides,
  };
}

function makeCitation(
  overrides: Partial<EquationCitationEntry> = {}
): EquationCitationEntry {
  return {
    chapter: "spoiler-alerts",
    refId: "wiens-law",
    anchor: "wiens-law-citation-1",
    number: 1,
    ...overrides,
  };
}

describe("R1 ERROR — citation references a refId not in the registry", () => {
  it("fires when chapter cites refId X but no registry entry has id X", () => {
    const index = emptyIndex();
    index.equationCitations = [
      makeCitation({ refId: "nonexistent", anchor: "nonexistent-citation-1" }),
    ];
    const report = runPedagogyAudit(index);
    const r1 = report.errors.filter((f) => f.code === "R1");
    expect(r1).toHaveLength(1);
    expect(r1[0]?.message).toContain("nonexistent");
    expect(r1[0]?.message).toContain("spoiler-alerts");
    expect(r1[0]?.location).toMatchObject({
      chapter: "spoiler-alerts",
      anchor: "nonexistent-citation-1",
    });
  });

  it("does NOT fire when the refId resolves to a registry entry", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    index.equationCitations = [makeCitation()];
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((f) => f.code === "R1")).toHaveLength(0);
  });

  it("fires per dangling citation (N citations to bad refIds → N errors)", () => {
    const index = emptyIndex();
    index.equationCitations = [
      makeCitation({ refId: "bad-1", anchor: "bad-1-citation-1" }),
      makeCitation({ refId: "bad-2", anchor: "bad-2-citation-1", number: 2 }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((f) => f.code === "R1")).toHaveLength(2);
  });
});

describe("R2 WARNING — registry entry has no citations (orphan)", () => {
  it("fires when an equation is declared but no chapter cites it", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    // No citations.
    const report = runPedagogyAudit(index);
    const r2 = report.warnings.filter((f) => f.code === "R2");
    expect(r2).toHaveLength(1);
    expect(r2[0]?.message).toContain("wiens-law");
    expect(r2[0]?.location).toMatchObject({ anchor: "wiens-law" });
  });

  it("does NOT fire when at least one chapter cites the equation", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    index.equationCitations = [makeCitation()];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "R2")).toHaveLength(0);
  });

  it("fires per orphan equation across multiple registry entries", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({ id: "alpha", title: "Alpha" }),
      makeEquation({ id: "beta", title: "Beta" }),
      makeEquation({ id: "gamma", title: "Gamma" }),
    ];
    // Only gamma is cited; alpha + beta are orphans.
    index.equationCitations = [
      makeCitation({
        refId: "gamma",
        anchor: "gamma-citation-1",
      }),
    ];
    const report = runPedagogyAudit(index);
    const r2 = report.warnings.filter((f) => f.code === "R2");
    expect(r2).toHaveLength(2);
    const ids = r2.map((f) => f.location?.anchor).sort();
    expect(ids).toEqual(["alpha", "beta"]);
  });
});

describe("R3 ERROR — registry entry fails schema validation (defense in depth)", () => {
  it("does NOT fire when entries are shape-valid (extractor's validation is the production path)", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((f) => f.code === "R3")).toHaveLength(0);
  });

  it("fires when an entry has empty title (defense-in-depth trip)", () => {
    const index = emptyIndex();
    // Cast to EquationEntry to simulate a malformed entry reaching the
    // audit — bypasses the extractor's validation gate.
    index.equations = [
      {
        ...makeEquation(),
        title: "",
      } as EquationEntry,
    ];
    const report = runPedagogyAudit(index);
    const r3 = report.errors.filter((f) => f.code === "R3");
    expect(r3).toHaveLength(1);
    expect(r3[0]?.message).toContain("wiens-law");
  });
});

describe("R4 WARNING — related[].refId points at non-existent entry", () => {
  it("fires when related[].refId has no matching registry entry", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        related: [{ refId: "stefan-boltzmann", kind: "see-also" }],
      }),
    ];
    const report = runPedagogyAudit(index);
    const r4 = report.warnings.filter((f) => f.code === "R4");
    expect(r4).toHaveLength(1);
    expect(r4[0]?.message).toContain("stefan-boltzmann");
    expect(r4[0]?.location).toMatchObject({ anchor: "wiens-law" });
  });

  it("does NOT fire when related[].refId resolves to a registry entry", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        id: "wiens-law",
        related: [{ refId: "stefan-boltzmann", kind: "see-also" }],
      }),
      makeEquation({ id: "stefan-boltzmann", title: "Stefan-Boltzmann" }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "R4")).toHaveLength(0);
  });

  it("fires per broken cross-ref (multiple related entries)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        related: [
          { refId: "missing-a", kind: "see-also" },
          { refId: "missing-b", kind: "derives-from" },
        ],
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "R4")).toHaveLength(2);
  });
});
