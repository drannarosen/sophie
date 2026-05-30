import type {
  AuditFinding,
  DefinitionEntry,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  InlineRefUsageEntry,
  KeyInsightEntry,
  ObjectiveEntry,
  PedagogyIndex,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { auditExitCode, formatAuditReport, runPedagogyAudit } from "./index.ts";
import { buildPedagogyIndex } from "./test-helpers.ts";

/**
 * Orchestration-level tests for `runPedagogyAudit` + `formatAuditReport`
 * + `auditExitCode`. Per-invariant tests live in
 * `invariants/<name>.test.ts` (A+ Phase E split, ADR 0061 Rule 3).
 *
 * The audit is a pure function over a snapshotted `PedagogyIndex`:
 * tests synthesize an index, call `runPedagogyAudit`, and assert on
 * the aggregate report shape. Individual invariant codes (D4/D5/E4/
 * F1/F2/F4/C1/O1/O2/MG1/MG2/K1/CS2/V1–V7) are exercised in their
 * sibling `invariants/<name>.test.ts` suites.
 */

/** Build an empty PedagogyIndex with all collections at []; tests override per-case. */
function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

// W2/D2 graduation: fixtures construct UnitEntry (was ChapterEntry).
// u.id == chapter slug (W2/D4 1:1 convention); u.section_id == prior
// ChapterEntry.module field. Modules collection deleted in Task 10/20.
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

describe("runPedagogyAudit — clean index", () => {
  it("returns zero errors/warnings for an empty index (only the always-on RC2 + MA-* coverage INFOs)", () => {
    const report = runPedagogyAudit(emptyIndex());
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    // Two invariants always emit an INFO tail on any corpus:
    //   RC2 (ADR 0058) — the role-coverage scope note (emitted once).
    //   MA-2..4 (ADR 0089 B5) — math-speech coverage summary + tails.
    // An empty index has no units, so RC1 (per-chapter) emits nothing.
    expect(report.info.map((f) => f.code)).toEqual([
      "RC2",
      "MA-2",
      "MA-3",
      "MA-4",
    ]);
  });

  it("returns zero findings for a fully consistent index", () => {
    const photonDef: DefinitionEntry = {
      term: "Photon",
      slug: "photon",
      body: "<p>A quantum of EM radiation.</p>",
      unit: "spoiler-alerts",
      anchor: "photon",
    };
    const isq: EquationEntry = {
      id: "inverse-square-law",
      title: "Inverse-Square Law",
      tex: "F = L / (4 \\pi r^2)",
      symbols: ["F"],
    };
    const fig: FigureRegistryEntry = {
      name: "three-big-questions",
      src: "/img/3q.png",
      alt: "Three questions",
    };
    const figUse: FigureUsageEntry = {
      name: "three-big-questions",
      unit: "spoiler-alerts",
      anchor: "fig-three-big-questions-1",
      number: 1,
      canonical: true,
    };
    const ki: KeyInsightEntry = {
      body: "<p>Stars are physics labs.</p>",
      unit: "spoiler-alerts",
      anchor: "ki-1",
      slug: "spoiler-alerts-ki-1",
    };
    const obj: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "Photons are quanta.",
      unit: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const objFoundations: ObjectiveEntry = {
      id: "lo-f1",
      verb: "Recognize",
      body: "Foundations objective.",
      unit: "foundations",
      anchor: "lo-lo-f1",
    };
    const kiFoundations: KeyInsightEntry = {
      body: "<p>Foundations insight.</p>",
      unit: "foundations",
      anchor: "ki-1",
      slug: "foundations-ki-1",
    };
    const usages: InlineRefUsageEntry[] = [
      { kind: "glossary-term", refKey: "Photon", unit: "spoiler-alerts" },
      {
        kind: "eq-ref",
        refKey: "inverse-square-law",
        unit: "spoiler-alerts",
      },
      {
        kind: "figure-ref",
        refKey: "three-big-questions",
        unit: "spoiler-alerts",
      },
      {
        kind: "chapter-ref",
        refKey: "foundations",
        unit: "spoiler-alerts",
      },
    ];
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [photonDef],
      equations: [isq],
      // Cite the registry entry from a chapter so R2 (orphan) stays silent.
      equationCitations: [
        {
          unit: "spoiler-alerts",
          refId: "inverse-square-law",
          anchor: "inverse-square-law-citation-1",
          number: 1,
        },
      ],
      keyInsights: [ki, kiFoundations],
      figureRegistry: [fig],
      figureUsages: [figUse],
      objectives: [obj, objFoundations],
      units: [unitFoundations, unitSpoiler],
      inlineRefUsages: usages,
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});

describe("accumulate-and-report behavior", () => {
  it("surfaces multiple findings together (ERROR + WARNING + INFO in one report)", () => {
    // D4 (ERROR): GlossaryTerm with no matching definition
    // O2 (WARNING): chapter with no objectives
    // K1 (INFO): same chapter with no key insights
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitSpoiler],
      inlineRefUsages: [
        {
          kind: "glossary-term",
          refKey: "Undefined-term",
          unit: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "D4")).toBe(true);
    expect(report.warnings.some((w) => w.code === "O2")).toBe(true);
    expect(report.info.some((i) => i.code === "K1")).toBe(true);
  });

  it("does not mutate the input index", () => {
    const index = emptyIndex();
    const before = JSON.stringify(index);
    runPedagogyAudit(index);
    expect(JSON.stringify(index)).toBe(before);
  });
});

describe("formatAuditReport", () => {
  it("formats an empty report as a clean zero-summary string", () => {
    const out = formatAuditReport({ errors: [], warnings: [], info: [] });
    expect(out).toContain("0 errors");
    expect(out).toContain("0 warnings");
  });

  it("formats populated findings line-by-line with severity + code + message", () => {
    const out = formatAuditReport({
      errors: [
        {
          severity: "ERROR",
          code: "D4",
          message: 'Undefined glossary term "Foo".',
          location: { unit: "spoiler-alerts" },
        },
      ],
      warnings: [
        {
          severity: "WARNING",
          code: "F4",
          message: 'Registry figure "x" has zero usages.',
        },
      ],
      info: [],
    });
    expect(out).toContain("ERROR");
    expect(out).toContain("D4");
    expect(out).toContain("Undefined glossary term");
    expect(out).toContain("WARNING");
    expect(out).toContain("F4");
    expect(out).toContain("1 error");
    expect(out).toContain("1 warning");
    // Chapter-scoped findings still render the chapter slug.
    expect(out).toContain("chapter: spoiler-alerts");
  });

  it("renders V0–V8 findings with the new location.path (not chapter)", () => {
    const out = formatAuditReport({
      errors: [
        {
          severity: "ERROR",
          code: "V1",
          message: "V1: ADR is missing a validation block",
          location: { path: "docs/website/decisions/0099-fake.md" },
        },
      ],
      warnings: [],
      info: [
        {
          severity: "INFO",
          code: "V8",
          message:
            "V8: validation block has unknown key 'last_validation_date'",
          location: { path: "docs/website/decisions/0099-typo.md" },
        },
      ],
    });
    // Contract-scoped findings use `path:` not `chapter:`
    expect(out).toContain("path: docs/website/decisions/0099-fake.md");
    expect(out).toContain("path: docs/website/decisions/0099-typo.md");
    expect(out).not.toContain("chapter: docs/website/");
  });
});

describe("auditExitCode", () => {
  it("returns 0 when there are no errors", () => {
    expect(
      auditExitCode({
        errors: [],
        warnings: [{ severity: "WARNING", code: "F4", message: "x" }],
        info: [{ severity: "INFO", code: "K1", message: "x" }],
      })
    ).toBe(0);
  });

  it("returns 1 when there is at least one error", () => {
    expect(
      auditExitCode({
        errors: [{ severity: "ERROR", code: "D4", message: "x" }],
        warnings: [],
        info: [],
      })
    ).toBe(1);
  });
});

describe("validation audit — extractorFindings merge", () => {
  it("merges extractor findings into the audit report by severity", () => {
    const v0Finding: AuditFinding = {
      severity: "ERROR",
      code: "V0",
      message:
        "docs/website/decisions/0099-broken.md: validation block failed schema parse",
      location: { path: "docs/website/decisions/0099-broken.md" },
    };
    const v8Finding: AuditFinding = {
      severity: "INFO",
      code: "V8",
      message:
        "docs/website/decisions/0099-typo.md: validation block has unknown key 'last_validation_date'",
      location: { path: "docs/website/decisions/0099-typo.md" },
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      extractorFindings: [v0Finding, v8Finding],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V0")).toBe(true);
    expect(report.info.some((i) => i.code === "V8")).toBe(true);
  });
});
