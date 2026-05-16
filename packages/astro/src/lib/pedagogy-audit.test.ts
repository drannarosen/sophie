import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AuditFinding,
  ChapterEntry,
  ContractValidationEntry,
  DefinitionEntry,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  InlineRefUsageEntry,
  KeyInsightEntry,
  MisconceptionEntry,
  ModuleEntry,
  ObjectiveEntry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  auditExitCode,
  formatAuditReport,
  runPedagogyAudit,
} from "./pedagogy-audit.ts";

/**
 * Tests for the systematic build-time pedagogy audit pass (PR-C4 Task
 * 8). The audit is a pure function over a snapshotted `PedagogyIndex`:
 * we synthesize an index in each test, call `runPedagogyAudit`, and
 * assert the expected findings (or absence thereof) surface.
 *
 * Invariant codes covered:
 *   ERROR-level  : D4, E4, F1, F2, C1, O1
 *   WARNING-level: D5, F4, O2, M3 (M3 deferred/TODO)
 *   INFO-level   : K1
 */

/** Build an empty PedagogyIndex with all collections at []; tests override per-case. */
function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
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
  };
}

const chFoundations: ChapterEntry = {
  slug: "foundations",
  title: "Foundations",
  module: "core",
  status: "stable",
};

const chSpoiler: ChapterEntry = {
  slug: "spoiler-alerts",
  title: "Spoiler Alerts",
  module: "core",
  order: 1,
  status: "stable",
};

const modCore: ModuleEntry = {
  slug: "core",
  title: "Core",
  order: 1,
};

describe("runPedagogyAudit — clean index", () => {
  it("returns zero findings for an empty index", () => {
    const report = runPedagogyAudit(emptyIndex());
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.info).toEqual([]);
  });

  it("returns zero findings for a fully consistent index", () => {
    const photonDef: DefinitionEntry = {
      term: "Photon",
      slug: "photon",
      body: "<p>A quantum of EM radiation.</p>",
      chapter: "spoiler-alerts",
      anchor: "photon",
    };
    const isq: EquationEntry = {
      slug: "inverse-square-law",
      title: "Inverse-Square Law",
      number: 1,
      tex: "F = L / (4 \\pi r^2)",
      body: "",
      chapter: "spoiler-alerts",
      anchor: "inverse-square-law",
    };
    const fig: FigureRegistryEntry = {
      name: "three-big-questions",
      src: "/img/3q.png",
      alt: "Three questions",
    };
    const figUse: FigureUsageEntry = {
      name: "three-big-questions",
      chapter: "spoiler-alerts",
      anchor: "fig-three-big-questions-1",
      number: 1,
      canonical: true,
    };
    const ki: KeyInsightEntry = {
      body: "<p>Stars are physics labs.</p>",
      chapter: "spoiler-alerts",
      anchor: "ki-1",
    };
    const obj: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "Photons are quanta.",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const objFoundations: ObjectiveEntry = {
      id: "lo-f1",
      verb: "Recognize",
      body: "Foundations objective.",
      chapter: "foundations",
      anchor: "lo-lo-f1",
    };
    const kiFoundations: KeyInsightEntry = {
      body: "<p>Foundations insight.</p>",
      chapter: "foundations",
      anchor: "ki-1",
    };
    const usages: InlineRefUsageEntry[] = [
      { kind: "glossary-term", refKey: "Photon", chapter: "spoiler-alerts" },
      {
        kind: "eq-ref",
        refKey: "inverse-square-law",
        chapter: "spoiler-alerts",
      },
      {
        kind: "figure-ref",
        refKey: "three-big-questions",
        chapter: "spoiler-alerts",
      },
      {
        kind: "chapter-ref",
        refKey: "foundations",
        chapter: "spoiler-alerts",
      },
    ];
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [photonDef],
      equations: [isq],
      keyInsights: [ki, kiFoundations],
      figureRegistry: [fig],
      figureUsages: [figUse],
      objectives: [obj, objFoundations],
      chapters: [chFoundations, chSpoiler],
      modules: [modCore],
      inlineRefUsages: usages,
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});

describe("D4 — undefined <GlossaryTerm name=X>", () => {
  it("emits an ERROR when a glossary-term inline-ref points at no definition", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [],
      inlineRefUsages: [
        {
          kind: "glossary-term",
          refKey: "Dark matter",
          chapter: "spoiler-alerts",
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
      chapter: "spoiler-alerts",
    });
  });

  it("slugifies both sides so casing/whitespace do not matter", () => {
    const def: DefinitionEntry = {
      term: "Dark matter",
      slug: "dark-matter",
      body: "",
      chapter: "spoiler-alerts",
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
          chapter: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
  });
});

describe("D5 — orphan definitions (WARNING)", () => {
  it("emits a WARNING when a definition has zero GlossaryTerm usages anywhere", () => {
    const def: DefinitionEntry = {
      term: "Aphelion",
      slug: "aphelion",
      body: "",
      chapter: "spoiler-alerts",
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
      chapter: "spoiler-alerts",
      anchor: "photon",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [def],
      inlineRefUsages: [
        { kind: "glossary-term", refKey: "Photon", chapter: "spoiler-alerts" },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toEqual([]);
  });
});

describe("E4 — undefined <EqRef slug=X>", () => {
  it("emits an ERROR when an eq-ref points at no equation", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      equations: [],
      inlineRefUsages: [
        {
          kind: "eq-ref",
          refKey: "inverse-square-law",
          chapter: "spoiler-alerts",
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

  it("does not flag an eq-ref that matches an equation slug", () => {
    const eq: EquationEntry = {
      slug: "wiens-law",
      title: "Wien's Law",
      number: 1,
      tex: "\\lambda_{max} T = b",
      body: "",
      chapter: "spoiler-alerts",
      anchor: "wiens-law",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      equations: [eq],
      inlineRefUsages: [
        { kind: "eq-ref", refKey: "wiens-law", chapter: "spoiler-alerts" },
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
      chapter: "spoiler-alerts",
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
      chapter: "spoiler-alerts",
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
          chapter: "spoiler-alerts",
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
          chapter: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
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
      chapter: "spoiler-alerts",
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
          chapter: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings).toEqual([]);
  });
});

describe("C1 — <ChapterRef slug=X> for unknown chapter", () => {
  it("emits an ERROR when a chapter-ref points at no chapter in the chapters collection", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [chFoundations],
      inlineRefUsages: [
        {
          kind: "chapter-ref",
          refKey: "does-not-exist",
          chapter: "spoiler-alerts",
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
      chapters: [chFoundations, chSpoiler],
      inlineRefUsages: [
        {
          kind: "chapter-ref",
          refKey: "foundations",
          chapter: "spoiler-alerts",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors).toEqual([]);
  });
});

describe("O1 — duplicate objective id within a chapter (defense-in-depth)", () => {
  // The extractor already throws on O1 (see extractObjectives), so by the
  // time the audit runs against the index, no duplicates should remain.
  // The audit still parallels the check for defense-in-depth in case the
  // extractor bypass path (e.g. external accumulator population) admits
  // duplicates.
  it("emits an ERROR when two objectives share an id within the same chapter", () => {
    const a: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "first",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const b: ObjectiveEntry = {
      id: "lo-1",
      verb: "Understand",
      body: "second",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      objectives: [a, b],
      chapters: [chSpoiler],
    };
    const report = runPedagogyAudit(index);
    const o1 = report.errors.filter((e) => e.code === "O1");
    expect(o1).toHaveLength(1);
    expect(o1[0]).toMatchObject({ severity: "ERROR", code: "O1" });
    expect(o1[0]?.message).toContain("lo-1");
  });

  it("does not flag the same id across different chapters", () => {
    const a: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "first",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const b: ObjectiveEntry = {
      id: "lo-1",
      verb: "Understand",
      body: "second",
      chapter: "measuring-the-sky",
      anchor: "lo-lo-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      objectives: [a, b],
      chapters: [
        chSpoiler,
        {
          slug: "measuring-the-sky",
          title: "Measuring",
          module: "core",
          status: "stable",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    const o1 = report.errors.filter((e) => e.code === "O1");
    expect(o1).toEqual([]);
  });
});

describe("O2 — chapter with zero objectives (WARNING)", () => {
  it("emits a WARNING for every chapter that has no objectives", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [chSpoiler],
      objectives: [],
    };
    const report = runPedagogyAudit(index);
    const o2 = report.warnings.filter((w) => w.code === "O2");
    expect(o2).toHaveLength(1);
    expect(o2[0]).toMatchObject({ severity: "WARNING", code: "O2" });
    expect(o2[0]?.message).toContain("spoiler-alerts");
  });

  it("does not flag a chapter that has at least one objective", () => {
    const obj: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "body",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [chSpoiler],
      objectives: [obj],
    };
    const report = runPedagogyAudit(index);
    const o2 = report.warnings.filter((w) => w.code === "O2");
    expect(o2).toEqual([]);
  });
});

describe("MG1 — cycle in prerequisite_misconceptions (ADR 0044)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => ({
    body: "<p>x</p>",
    chapter: "ch-a",
    anchor: "default",
    length: "short",
    ...overrides,
  });

  it("emits an ERROR for a two-node cycle (A → B → A)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
        {
          slug: "ch-b",
          title: "B",
          module: "core",
          order: 2,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["beta"],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
    expect(mg1[0]?.message).toMatch(/alpha|beta/);
  });

  it("emits an ERROR for a three-node cycle (A → B → C → A)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
        {
          slug: "ch-b",
          title: "B",
          module: "core",
          order: 2,
          status: "stable" as const,
        },
        {
          slug: "ch-c",
          title: "C",
          module: "core",
          order: 3,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["gamma"],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
        mc({
          chapter: "ch-c",
          anchor: "gamma",
          prerequisite_misconceptions: ["beta"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
    expect(mg1[0]?.message).toMatch(/alpha/);
  });

  it("emits an ERROR for a self-cycle (A → A)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
  });

  it("does not flag a clean DAG", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
        {
          slug: "ch-b",
          title: "B",
          module: "core",
          order: 2,
          status: "stable" as const,
        },
        {
          slug: "ch-c",
          title: "C",
          module: "core",
          order: 3,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
        mc({
          chapter: "ch-c",
          anchor: "gamma",
          prerequisite_misconceptions: ["alpha", "beta"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG1")).toEqual([]);
  });

  it("does not double-report the same cycle reached from multiple start nodes", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
        {
          slug: "ch-b",
          title: "B",
          module: "core",
          order: 2,
          status: "stable" as const,
        },
        {
          slug: "ch-c",
          title: "C",
          module: "core",
          order: 3,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["beta"],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
        mc({
          chapter: "ch-c",
          anchor: "gamma",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
  });
});

describe("MG2 — prerequisite_misconceptions ordering + dangling (ADR 0044)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => ({
    body: "<p>x</p>",
    chapter: "ch-a",
    anchor: "default",
    length: "short",
    ...overrides,
  });

  it("emits an ERROR when a prerequisite references no known misconception (dangling)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["does-not-exist"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg2 = report.errors.filter((e) => e.code === "MG2");
    expect(mg2).toHaveLength(1);
    expect(mg2[0]?.message).toContain("does-not-exist");
    expect(mg2[0]?.message).toContain("no misconception");
  });

  it("emits an ERROR when a prerequisite lives in the same chapter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          chapter: "ch-a",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg2 = report.errors.filter((e) => e.code === "MG2");
    expect(mg2).toHaveLength(1);
    expect(mg2[0]?.message).toMatch(/not introduced in an earlier chapter/i);
  });

  it("emits an ERROR when a prerequisite lives in a LATER chapter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
        {
          slug: "ch-b",
          title: "B",
          module: "core",
          order: 2,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["beta"],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: [],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg2 = report.errors.filter((e) => e.code === "MG2");
    expect(mg2).toHaveLength(1);
  });

  it("does not flag a prerequisite that lives in an earlier chapter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
        {
          slug: "ch-b",
          title: "B",
          module: "core",
          order: 2,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });

  it("does not flag misconceptions with no prerequisite_misconceptions field (pre-ADR-0044 shape)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
      ],
      misconceptions: [mc({ chapter: "ch-a", anchor: "alpha" })],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });

  it("does not flag an empty prerequisite list (declared DAG root)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        {
          slug: "ch-a",
          title: "A",
          module: "core",
          order: 1,
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });

  it("falls back to insertion order when ChapterEntry.order is absent", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [
        { slug: "ch-a", title: "A", module: "core", status: "stable" as const },
        { slug: "ch-b", title: "B", module: "core", status: "stable" as const },
      ],
      misconceptions: [
        mc({
          chapter: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          chapter: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });
});

describe("K1 — chapters with zero <KeyInsight>s (INFO)", () => {
  it("emits an INFO finding for every chapter that has no key-insights", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [chSpoiler],
      keyInsights: [],
    };
    const report = runPedagogyAudit(index);
    const k1 = report.info.filter((i) => i.code === "K1");
    expect(k1).toHaveLength(1);
    expect(k1[0]).toMatchObject({ severity: "INFO", code: "K1" });
    expect(k1[0]?.message).toContain("spoiler-alerts");
  });

  it("does not flag a chapter that has at least one key-insight", () => {
    const ki: KeyInsightEntry = {
      body: "<p>x</p>",
      chapter: "spoiler-alerts",
      anchor: "ki-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [chSpoiler],
      keyInsights: [ki],
    };
    const report = runPedagogyAudit(index);
    expect(report.info.filter((i) => i.code === "K1")).toEqual([]);
  });
});

describe("CS2 — draft chapters excluded from student build (ADR 0051)", () => {
  it("emits no CS2 finding when no draft slugs are passed", () => {
    const report = runPedagogyAudit(emptyIndex());
    expect(report.info.filter((i) => i.code === "CS2")).toEqual([]);
  });

  it("emits no CS2 finding for an empty draft slug array", () => {
    const report = runPedagogyAudit(emptyIndex(), { draftChapterSlugs: [] });
    expect(report.info.filter((i) => i.code === "CS2")).toEqual([]);
  });

  it("emits one INFO per draft chapter slug", () => {
    const report = runPedagogyAudit(emptyIndex(), {
      draftChapterSlugs: ["in-progress", "scratch-chapter"],
    });
    const cs2 = report.info.filter((i) => i.code === "CS2");
    expect(cs2).toHaveLength(2);
    expect(cs2[0]).toMatchObject({ severity: "INFO", code: "CS2" });
    expect(cs2[0]?.message).toContain("in-progress");
    expect(cs2[0]?.location).toMatchObject({ chapter: "in-progress" });
    expect(cs2[1]?.message).toContain("scratch-chapter");
  });

  it("CS2 message mentions student-build exclusion + ADR 0051", () => {
    const report = runPedagogyAudit(emptyIndex(), {
      draftChapterSlugs: ["wip"],
    });
    const cs2 = report.info.find((i) => i.code === "CS2");
    expect(cs2?.message).toMatch(/excluded from the student build/i);
    expect(cs2?.message).toContain("ADR 0051");
  });
});

describe("accumulate-and-report behavior", () => {
  it("surfaces multiple findings together (ERROR + WARNING + INFO in one report)", () => {
    // D4 (ERROR): GlossaryTerm with no matching definition
    // O2 (WARNING): chapter with no objectives
    // K1 (INFO): same chapter with no key insights
    const index: PedagogyIndex = {
      ...emptyIndex(),
      chapters: [chSpoiler],
      inlineRefUsages: [
        {
          kind: "glossary-term",
          refKey: "Undefined-term",
          chapter: "spoiler-alerts",
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
          location: { chapter: "spoiler-alerts" },
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

// ---------------------------------------------------------------------
// Validation audit invariants (V1–V7) — ADR 0056 PR 3.
//
// V0 (parse failure) and V8 (unknown key) are extractor-layer findings
// — see `validation-extractor.test.ts`. V1–V7 here run against already-
// typed `Validation` blocks, mirroring the runtime layer split.
// ---------------------------------------------------------------------

describe("validation audit invariants — V1 (ADR missing validation block)", () => {
  it("emits an ERROR for an ADR without a validation block (promoted in PR 6)", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0001-platform-not-monorepo.md",
      validation: undefined,
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V1")).toBe(true);
    expect(report.errors.find((e) => e.code === "V1")?.message).toContain(
      "docs/website/decisions/0001-platform-not-monorepo.md"
    );
  });

  it("does not fire V1 when the ADR has a validation block", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0001-platform-not-monorepo.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V1")).toBe(false);
  });

  it("does not fire V1 for the decisions template.md file", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/template.md",
      validation: undefined,
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V1")).toBe(false);
  });
});

describe("validation audit invariants — V2 (reference doc missing block)", () => {
  it("emits an ERROR for a reference doc without a validation block (promoted in PR 6)", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/reference/content-schema.md",
      validation: undefined,
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V2")).toBe(true);
    expect(report.errors.find((e) => e.code === "V2")?.message).toContain(
      "docs/website/reference/content-schema.md"
    );
  });

  it("does not fire V2 when the reference doc has a validation block", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/reference/content-schema.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V2")).toBe(false);
  });
});

describe("validation audit invariants — V3 (validated requires date, defense-in-depth)", () => {
  // Defense-in-depth: schema-layer refinement (PR #43) catches this case at
  // parse time, and extractor V0 surfaces parse failures explicitly. V3
  // here fires only on inputs that bypassed both — guards against direct
  // ContractValidationEntry construction (tests, future synthesizers).
  it("emits an ERROR when status=validated but last_validated_date is null", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V3")).toBe(true);
  });

  it("emits an ERROR when status=re-validation-needed but last_validated_date is null", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "re-validation-needed",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V3")).toBe(true);
  });

  it("does not fire V3 when status=validated has a date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V3")).toBe(false);
  });
});

describe("validation audit invariants — V4 (unvalidated must be clean)", () => {
  it("emits an ERROR when status=unvalidated has evidence", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [
          // V4 is about "has evidence" — null ref keeps this focused
          // on V4 without dragging the V5 disk-resolution path in.
          {
            kind: "test",
            ref: null,
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V4")).toBe(true);
  });

  it("emits an ERROR when status=unvalidated has a last_validated_date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "unvalidated",
        last_validated_date: "2026-05-14",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V4")).toBe(true);
  });

  it("does not fire V4 when status=unvalidated is clean", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "unvalidated",
        last_validated_date: null,
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V4")).toBe(false);
  });
});

// V5 runs against a tmp repoRoot so existence checks are deterministic.
describe("validation audit invariants — V5 (evidence ref must resolve)", () => {
  let tmpRoot = "";
  beforeAll(async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), "sophie-v5-"));
    await mkdir(join(tmpRoot, "packages", "components", "src"), {
      recursive: true,
    });
    await writeFile(
      join(tmpRoot, "packages", "components", "src", "Predict.test.tsx"),
      "// fixture"
    );
  });

  it("emits an ERROR when an evidence ref does not exist on disk", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          {
            kind: "test",
            ref: "packages/components/src/DoesNotExist.test.tsx",
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    expect(report.errors.some((e) => e.code === "V5")).toBe(true);
  });

  it("does not fire V5 when the evidence ref exists on disk", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          {
            kind: "test",
            ref: "packages/components/src/Predict.test.tsx",
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    expect(report.errors.some((e) => e.code === "V5")).toBe(false);
  });

  it("does not fire V5 when the evidence ref is null (deferred evidence)", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          { kind: "manual", ref: null, date: "2026-05-14", notes: "TODO" },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    expect(report.errors.some((e) => e.code === "V5")).toBe(false);
  });

  it("fires V5 when the evidence ref is an absolute path (escape guard)", () => {
    // path.resolve(repoRoot, "/etc/hosts") returns "/etc/hosts" — the
    // absolute path overrides repoRoot. Without the escape guard, V5
    // would existence-check against the host system instead of the repo.
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "test", ref: "/etc/hosts", date: "2026-05-14" }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    const v5 = report.errors.find((e) => e.code === "V5");
    expect(v5).toBeDefined();
    expect(v5?.message).toContain("repo-root-relative");
  });

  it("fires V5 when the evidence ref escapes via ../", () => {
    // ../../../etc/passwd resolves outside tmpRoot. The relative path
    // would start with "..", triggering the escape guard.
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [
          {
            kind: "test",
            ref: "../../../etc/passwd",
            date: "2026-05-14",
          },
        ],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index, { repoRoot: tmpRoot });
    const v5 = report.errors.find((e) => e.code === "V5");
    expect(v5).toBeDefined();
    expect(v5?.message).toContain("repo-root-relative");
  });

  afterAll(async () => {
    // tmp dirs from os.tmpdir() are reaped by the OS; no explicit cleanup
    // needed. Variable kept for symmetry with beforeAll's binding.
    void tmpRoot;
  });
});

describe("validation audit invariants — V6 (evidence date must be ISO)", () => {
  it("emits an ERROR for a malformed evidence date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "manual", ref: null, date: "May 14, 2026" }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V6")).toBe(true);
  });

  it("does not fire V6 for a valid ISO date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "manual", ref: null, date: "2026-05-14" }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V6")).toBe(false);
  });

  it("does not fire V6 when the evidence date is null", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2026-05-14",
        evidence: [{ kind: "manual", ref: null, date: null }],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.some((e) => e.code === "V6")).toBe(false);
  });
});

describe("validation audit invariants — V7 (last_validated_date not in future)", () => {
  it("emits a WARNING when last_validated_date is in the future", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2999-01-01",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings.some((w) => w.code === "V7")).toBe(true);
  });

  it("does not fire V7 for a past date", () => {
    const entry: ContractValidationEntry = {
      path: "docs/website/decisions/0042-fake.md",
      validation: {
        status: "validated",
        last_validated_date: "2020-01-01",
        evidence: [],
      },
      lastRevisedDate: null,
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      contractValidations: [entry],
    };
    const report = runPedagogyAudit(index);
    expect(report.warnings.some((w) => w.code === "V7")).toBe(false);
  });
});

describe("validation audit — extractorFindings merge", () => {
  it("merges extractor findings into the audit report by severity", () => {
    const v0Finding: AuditFinding = {
      severity: "ERROR",
      code: "V0",
      message:
        "docs/website/decisions/0099-broken.md: validation block failed schema parse",
      location: { chapter: "docs/website/decisions/0099-broken.md" },
    };
    const v8Finding: AuditFinding = {
      severity: "INFO",
      code: "V8",
      message:
        "docs/website/decisions/0099-typo.md: validation block has unknown key 'last_validation_date'",
      location: { chapter: "docs/website/decisions/0099-typo.md" },
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
