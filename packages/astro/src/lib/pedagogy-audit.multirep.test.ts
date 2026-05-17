import type {
  EquationEntry,
  FigureRegistryEntry,
  MultiRepIndexEntry,
  NotationRegistry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "./pedagogy-audit.ts";

/**
 * Tests for the NR/MR audit invariants added in PR-δ per the
 * 2026-05-17 MultiRep design hardening + ADR 0043.
 *
 * Invariants covered:
 *   MR1 (ERROR)   — <MultiRep concept="X"> for X not in registry
 *   MR2 (WARNING) — <RepEquation symbol> doesn't match canonical_symbol
 *   MR4 (INFO)    — <RepFigure> alt text doesn't mention verbal_label/canonical_symbol
 *   MR6 (INFO)    — equivalent_to doesn't resolve in chapter/MultiRep
 *   NR2 (INFO)    — registry concept declared but no MultiRep references it
 *
 * Gating: all invariants require `extras.notationRegistry` to be
 * non-null (consumer opt-in via pedagogy-contract.yaml per ADR 0042).
 */

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
    multiReps: [],
    interventions: [],
  };
}

function makeRegistry(
  overrides: Partial<NotationRegistry> = {}
): NotationRegistry {
  return {
    version: "1",
    course: "test",
    last_updated: "2026-05-17",
    concepts: [
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
    ],
    ...overrides,
  };
}

const mrWithVerbal = (
  concept: string,
  chapter: string,
  id?: string
): MultiRepIndexEntry => ({
  concept,
  id: id ?? `mr-${concept}`,
  chapter,
  reps: [{ kind: "verbal", body: "<p>body</p>" }],
});

describe("opt-in gate", () => {
  it("skips ALL NR/MR invariants when notationRegistry is absent", () => {
    const index = emptyIndex();
    // Author a <MultiRep> binding a concept that doesn't exist in any
    // registry — but pass no registry, so MR1 should NOT fire.
    index.multiReps = [mrWithVerbal("unregistered-concept", "ch")];
    const report = runPedagogyAudit(index);
    const nrMrFindings = [
      ...report.errors,
      ...report.warnings,
      ...report.info,
    ].filter((f) => f.code.startsWith("MR") || f.code.startsWith("NR"));
    expect(nrMrFindings).toHaveLength(0);
  });

  it("skips ALL NR/MR invariants when notationRegistry is explicitly null", () => {
    const index = emptyIndex();
    index.multiReps = [mrWithVerbal("unregistered", "ch")];
    const report = runPedagogyAudit(index, { notationRegistry: null });
    const nrMrFindings = [
      ...report.errors,
      ...report.warnings,
      ...report.info,
    ].filter((f) => f.code.startsWith("MR") || f.code.startsWith("NR"));
    expect(nrMrFindings).toHaveLength(0);
  });
});

describe("MR1 — <MultiRep concept='X'> for X not in registry", () => {
  it("fires ERROR when concept not in registry", () => {
    const index = emptyIndex();
    index.multiReps = [mrWithVerbal("unknown-concept", "module-01/lecture-01")];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    const mr1 = report.errors.filter((f) => f.code === "MR1");
    expect(mr1).toHaveLength(1);
    expect(mr1[0]?.message).toContain("unknown-concept");
    expect(mr1[0]?.location?.chapter).toBe("module-01/lecture-01");
  });

  it("does NOT fire when concept is in registry", () => {
    const index = emptyIndex();
    index.multiReps = [mrWithVerbal("orbital-radius", "ch")];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.errors.filter((f) => f.code === "MR1")).toHaveLength(0);
  });

  it("fires once per offending MultiRep, not per rep child", () => {
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "unknown",
        id: "mr-unknown",
        chapter: "ch",
        reps: [
          { kind: "verbal", body: "<p>1</p>" },
          { kind: "equation", refKey: "k", symbol: "r" },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.errors.filter((f) => f.code === "MR1")).toHaveLength(1);
  });
});

describe("MR2 — <RepEquation symbol> doesn't match concept canonical_symbol", () => {
  it("fires WARNING when symbol doesn't match canonical", () => {
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          { kind: "verbal", body: "<p>body</p>" },
          // canonical_symbol is "r"; rep declares "R" (the stellar radius
          // confusion case).
          { kind: "equation", refKey: "kepler-3rd-law", symbol: "R" },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    const mr2 = report.warnings.filter((f) => f.code === "MR2");
    expect(mr2).toHaveLength(1);
    expect(mr2[0]?.message).toContain("canonical_symbol");
    expect(mr2[0]?.message).toContain('"R"');
    expect(mr2[0]?.message).toContain('"r"');
  });

  it("does NOT fire when symbol matches canonical_symbol", () => {
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [{ kind: "equation", refKey: "k", symbol: "r" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.warnings.filter((f) => f.code === "MR2")).toHaveLength(0);
  });

  it("doesn't fire on figure or verbal reps (MR2 is equation-specific)", () => {
    const index = emptyIndex();
    index.figureRegistry = [
      { name: "fig", src: "/f.png", alt: "Diagram showing orbital radius r" },
    ];
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          { kind: "verbal", body: "<p>body</p>" },
          { kind: "figure", refName: "fig", symbolLabel: "wrong-symbol" },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.warnings.filter((f) => f.code === "MR2")).toHaveLength(0);
  });

  it("skips check when MR1 already fires (concept not in registry)", () => {
    // No MR2 on a concept that doesn't exist in the registry — MR1 is
    // the primary error and MR2 would be a noisy duplicate.
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "unknown",
        id: "mr-unknown",
        chapter: "ch",
        reps: [{ kind: "equation", refKey: "k", symbol: "anything" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.errors.filter((f) => f.code === "MR1")).toHaveLength(1);
    expect(report.warnings.filter((f) => f.code === "MR2")).toHaveLength(0);
  });

  it("fires once per offending equation rep (per-rep semantics, not per-MultiRep)", () => {
    // MR2's loop is `for (const rep of mr.reps)` — two equation reps
    // in one MultiRep that BOTH mismatch the canonical symbol should
    // emit two separate MR2 warnings (vs MR1's per-MultiRep
    // emit-once semantics tested separately above).
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          { kind: "equation", refKey: "kepler-3rd-law", symbol: "R" },
          { kind: "equation", refKey: "kepler-3rd-law-au", symbol: "D" },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    const mr2 = report.warnings.filter((f) => f.code === "MR2");
    expect(mr2).toHaveLength(2);
    const messages = mr2.map((f) => f.message).join("\n");
    expect(messages).toContain("kepler-3rd-law");
    expect(messages).toContain("kepler-3rd-law-au");
  });
});

describe("MR4 — <RepFigure> alt text silent on concept", () => {
  it("fires INFO when alt text mentions neither verbal_label nor canonical_symbol", () => {
    const index = emptyIndex();
    index.figureRegistry = [
      // alt text deliberately avoids the substring "r" (canonical_symbol)
      // AND "orbital radius" (verbal_label, case-insensitive) — so MR4 fires.
      { name: "orbit", src: "/o.png", alt: "Annotated visual" },
    ];
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [{ kind: "figure", refName: "orbit" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    const mr4 = report.info.filter((f) => f.code === "MR4");
    expect(mr4).toHaveLength(1);
    expect(mr4[0]?.message).toContain("orbital radius");
  });

  it("does NOT fire when alt mentions verbal_label (case-insensitive)", () => {
    const index = emptyIndex();
    index.figureRegistry = [
      {
        name: "orbit",
        src: "/o.png",
        alt: "Diagram of Orbital Radius geometry",
      },
    ];
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [{ kind: "figure", refName: "orbit" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.info.filter((f) => f.code === "MR4")).toHaveLength(0);
  });

  it("does NOT fire when alt mentions canonical_symbol (case-sensitive)", () => {
    // The symbol check is case-sensitive — r and R are different concepts
    // (orbital radius vs stellar radius). Alt text must use the exact symbol.
    const index = emptyIndex();
    index.figureRegistry = [
      { name: "orbit", src: "/o.png", alt: "Plot showing r against time" },
    ];
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [{ kind: "figure", refName: "orbit" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.info.filter((f) => f.code === "MR4")).toHaveLength(0);
  });

  it("skips check when the figure isn't in the registry (F1/F2 handle that)", () => {
    const index = emptyIndex();
    // No figureRegistry entry for "missing-figure".
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [{ kind: "figure", refName: "missing-figure" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.info.filter((f) => f.code === "MR4")).toHaveLength(0);
  });
});

describe("MR6 — equivalent_to doesn't resolve", () => {
  it("fires INFO when equivalent_to doesn't resolve in chapter or MultiRep", () => {
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          {
            kind: "equation",
            refKey: "kepler-3rd-law",
            symbol: "r",
            equivalent_to: "nonexistent-equation",
            via: "some-substitution",
          },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    const mr6 = report.info.filter((f) => f.code === "MR6");
    expect(mr6).toHaveLength(1);
    expect(mr6[0]?.message).toContain("nonexistent-equation");
  });

  it("resolves to a <KeyEquation> in the same chapter", () => {
    const index = emptyIndex();
    const kepler: EquationEntry = {
      slug: "kepler-3rd-law",
      title: "Kepler's 3rd Law",
      number: 1,
      tex: "T^2 = a^3",
      body: "<p>body</p>",
      chapter: "ch",
      anchor: "kepler-3rd-law",
    };
    index.equations = [kepler];
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          {
            kind: "equation",
            refKey: "kepler-3rd-law-au-form",
            symbol: "r",
            equivalent_to: "kepler-3rd-law",
            via: "natural-units-substitution",
          },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.info.filter((f) => f.code === "MR6")).toHaveLength(0);
  });

  it("resolves to another <RepEquation> in the same MultiRep", () => {
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          { kind: "equation", refKey: "kepler-cgs", symbol: "r" },
          {
            kind: "equation",
            refKey: "kepler-natural",
            symbol: "r",
            equivalent_to: "kepler-cgs",
            via: "unit-system-conversion",
          },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.info.filter((f) => f.code === "MR6")).toHaveLength(0);
  });

  it("does NOT resolve cross-chapter (chapter-scoped at v1 per design §D6)", () => {
    const index = emptyIndex();
    // Equation in a DIFFERENT chapter.
    index.equations = [
      {
        slug: "kepler-3rd-law",
        title: "Kepler",
        number: 1,
        tex: "T",
        body: "<p>x</p>",
        chapter: "other-chapter",
        anchor: "kepler-3rd-law",
      },
    ];
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [
          {
            kind: "equation",
            refKey: "kepler-3rd-law-au-form",
            symbol: "r",
            equivalent_to: "kepler-3rd-law",
          },
        ],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    // Cross-chapter resolution is a v2 audit-pass flip — at v1, MR6 fires.
    expect(report.info.filter((f) => f.code === "MR6")).toHaveLength(1);
  });

  it("doesn't fire when equivalent_to is absent", () => {
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "orbital-radius",
        id: "mr-orbital-radius",
        chapter: "ch",
        reps: [{ kind: "equation", refKey: "k", symbol: "r" }],
      },
    ];
    const report = runPedagogyAudit(index, {
      notationRegistry: makeRegistry(),
    });
    expect(report.info.filter((f) => f.code === "MR6")).toHaveLength(0);
  });
});

describe("NR2 — registry concept never referenced", () => {
  it("fires INFO per orphan registry concept", () => {
    const index = emptyIndex();
    // Two concepts in registry; only one is bound by a MultiRep.
    index.multiReps = [mrWithVerbal("orbital-radius", "ch")];
    const registry = makeRegistry({
      concepts: [
        {
          id: "orbital-radius",
          verbal_label: "orbital radius",
          canonical_symbol: "r",
          latex: "r",
        },
        {
          id: "absolute-magnitude",
          verbal_label: "absolute magnitude",
          canonical_symbol: "M",
          latex: "M",
        },
        {
          id: "stellar-radius",
          verbal_label: "stellar radius",
          canonical_symbol: "R",
          latex: "R",
        },
      ],
    });
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const nr2 = report.info.filter((f) => f.code === "NR2");
    expect(nr2).toHaveLength(2);
    const messages = nr2.map((f) => f.message).join("\n");
    expect(messages).toContain("absolute-magnitude");
    expect(messages).toContain("stellar-radius");
    expect(messages).not.toContain("orbital-radius");
  });

  it("doesn't fire when every registry concept is referenced", () => {
    const index = emptyIndex();
    index.multiReps = [
      mrWithVerbal("orbital-radius", "ch"),
      mrWithVerbal("absolute-magnitude", "ch", "mr-am"),
    ];
    const registry = makeRegistry({
      concepts: [
        {
          id: "orbital-radius",
          verbal_label: "orbital radius",
          canonical_symbol: "r",
          latex: "r",
        },
        {
          id: "absolute-magnitude",
          verbal_label: "absolute magnitude",
          canonical_symbol: "M",
          latex: "M",
        },
      ],
    });
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.info.filter((f) => f.code === "NR2")).toHaveLength(0);
  });
});

describe("integration — full smoke fixture scenario", () => {
  it("audit-clean for a registry-aligned MultiRep binding (smoke chapter shape)", () => {
    // Mirrors the smoke chapter shape post-PR-γ: apparent-magnitude
    // concept in registry; MultiRep with RepVerbal + RepEquation;
    // RepEquation symbol matches canonical_symbol "m".
    const index = emptyIndex();
    index.multiReps = [
      {
        concept: "apparent-magnitude",
        id: "mr-apparent-magnitude",
        chapter: "01-foundations/measuring-the-sky",
        reps: [
          { kind: "verbal", body: "<p>Apparent magnitude m is log-scale.</p>" },
          { kind: "equation", refKey: "pogson-magnitude", symbol: "m" },
        ],
      },
    ];
    const registry = makeRegistry({
      concepts: [
        {
          id: "apparent-magnitude",
          verbal_label: "apparent magnitude",
          canonical_symbol: "m",
          latex: "m",
          epistemic_role: "observable",
        },
      ],
    });
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    // MR1 + MR2 should both pass.
    expect(report.errors.filter((f) => f.code === "MR1")).toHaveLength(0);
    expect(report.warnings.filter((f) => f.code === "MR2")).toHaveLength(0);
    // No equivalent_to in this binding → no MR6.
    expect(report.info.filter((f) => f.code === "MR6")).toHaveLength(0);
    // No figure rep → no MR4 against the registry.
    expect(report.info.filter((f) => f.code === "MR4")).toHaveLength(0);
    // The single registry concept IS referenced → no NR2.
    expect(report.info.filter((f) => f.code === "NR2")).toHaveLength(0);
  });
});

// Suppress unused imports if linter flags them.
void ({} as FigureRegistryEntry);
