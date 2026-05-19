import type {
  Biography,
  EquationEntry,
  MisconceptionEntry,
  NotationRegistry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "./pedagogy-audit/index.ts";

/**
 * Tests for the EquationBiography audit invariants added in PR-δ per
 * ADR 0046 + ADR 0043 §R5 + 2026-05-17 design hardening §"Audit
 * invariants."
 *
 * Six invariants covered:
 *   E7  (INFO)     <KeyEquation> has biography but lacks <Observable>
 *   E8  (WARNING)  <Units symbol> not in registry  (NR-gated)
 *   E9  (INFO)     <CommonMisuse> lacks misconception= cross-ref
 *   NR1 (WARNING)  <KeyEquation symbols=[...]> declares unregistered symbol  (NR-gated)
 *   NR3 (ERROR)    registry: same symbol bound to multiple concept.ids  (NR-gated)
 *   NR4 (WARNING)  symbol has NO units anywhere (per ADR 0046 §R10)  (NR-gated)
 *
 * Plus the NR2 modification: KeyEquation.symbols entries promote the
 * matching concept out of orphan status.
 *
 * E7/E9 are universal (fire whenever biography children exist).
 * E8/NR1/NR3/NR4 are gated on the consumer's NR opt-in
 * (`pedagogy-contract.yaml.math_and_units_standards.notation_registry`).
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

// Post-ADR-0060: EquationEntry is registry-shaped (id / title / tex /
// symbols + optional biography). The old chapter/anchor/number/body/slug
// fields moved to EquationCitationEntry; tests use a separate fixture
// helper for those.
function makeEquation(overrides: Partial<EquationEntry> = {}): EquationEntry {
  return {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{peak} = b T^{-1}",
    symbols: ["T"],
    ...overrides,
  };
}

function makeBiography(overrides: Partial<Biography> = {}): Biography {
  return {
    assumptions: [],
    units: [],
    common_misuses: [],
    derivation_steps: [],
    ...overrides,
  };
}

function makeRegistry(
  concepts: NotationRegistry["concepts"] = []
): NotationRegistry {
  return {
    version: "1",
    course: "test",
    last_updated: "2026-05-17",
    concepts,
  };
}

function makeMisconception(
  overrides: Partial<MisconceptionEntry> = {}
): MisconceptionEntry {
  return {
    body: "<p>x</p>",
    chapter: "ch",
    anchor: "wiens-law-absorption-spectra",
    length: "short",
    ...overrides,
  };
}

// =====================================================================
// E7 — biography children present but missing <Observable>
// =====================================================================

describe("E7 INFO — biography lacks <Observable>", () => {
  it("fires when biography has Assumption but no Observable", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          assumptions: [{ body: "LTE", epistemicRole: "assumption" }],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    const e7 = report.info.filter((f) => f.code === "E7");
    expect(e7).toHaveLength(1);
    expect(e7[0]?.message).toContain("wiens-law");
    expect(e7[0]?.message).toContain("lacks an <Observable>");
    // Post-ADR-0060: registry-sourced equation; location points at the
    // registry route via `anchor: eq.id` with no chapter (the entry
    // lives in the global registry, not a specific chapter).
    expect(e7[0]?.location).toMatchObject({
      anchor: "wiens-law",
    });
    expect(e7[0]?.location?.chapter).toBeUndefined();
  });

  it("does NOT fire when biography includes Observable", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          observable: { body: "peak", epistemicRole: "observable" },
          assumptions: [{ body: "LTE", epistemicRole: "assumption" }],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E7")).toHaveLength(0);
  });

  it("does NOT fire when equation has no biography at all (per-equation opt-in)", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E7")).toHaveLength(0);
  });

  it("fires when biography has ONLY <BreaksWhen> (matrix completion — every non-Observable child trips E7)", () => {
    // Reviewer test gap 6b: the matrix tests assumptions / units /
    // common_misuses but didn't pin the breaks_when-only case. E7
    // fires whenever biography is defined and Observable is absent,
    // regardless of which other slot is populated.
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          breaks_when: {
            body: "non-thermal.",
            epistemicRole: "approximation",
          },
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E7")).toHaveLength(1);
  });

  it("fires per equation (multiple incomplete biographies)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        id: "eq-a",
        biography: makeBiography({
          units: [{ symbol: "T", unit: "K" }],
        }),
      }),
      makeEquation({
        id: "eq-b",
        biography: makeBiography({
          common_misuses: [{ body: "misuse." }],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E7")).toHaveLength(2);
  });
});

// =====================================================================
// E9 — <CommonMisuse> lacks misconception= cross-ref
// =====================================================================

describe("E9 INFO — <CommonMisuse> lacks misconception= cross-ref", () => {
  it("fires when CommonMisuse has no misconception slug", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          observable: { body: "x", epistemicRole: "observable" },
          common_misuses: [{ body: "uncrossed misuse." }],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    const e9 = report.info.filter((f) => f.code === "E9");
    expect(e9).toHaveLength(1);
    expect(e9[0]?.message).toContain("wiens-law");
    expect(e9[0]?.message).toContain("misconception graph");
  });

  it("does NOT fire when CommonMisuse has a misconception slug", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            {
              body: "misuse.",
              misconception: "wiens-law-absorption-spectra",
            },
          ],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(0);
  });

  it("does NOT fire when equation has no biography", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(0);
  });

  it("fires per uncrossed misuse (mixed populated / unpopulated)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            { body: "ok.", misconception: "wiens-law-absorption-spectra" },
            { body: "uncrossed-1." },
            { body: "uncrossed-2." },
          ],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(2);
  });
});

// =====================================================================
// E10 — <CommonMisuse misconception="…"> references undeclared slug
// =====================================================================

describe("E10 WARNING — <CommonMisuse misconception=…> references undeclared slug", () => {
  it("fires when the cross-ref slug is not in misconceptions[]", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            { body: "misuse.", misconception: "wiens-law-absorption-spectra" },
          ],
        }),
      }),
    ];
    // No misconceptions declared anywhere course-wide.
    const report = runPedagogyAudit(index);
    const e10 = report.warnings.filter((f) => f.code === "E10");
    expect(e10).toHaveLength(1);
    expect(e10[0]?.message).toContain("wiens-law-absorption-spectra");
    expect(e10[0]?.message).toContain("wiens-law");
  });

  it("does NOT fire when the cross-ref slug IS declared (same chapter)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            { body: "ok.", misconception: "wiens-law-absorption-spectra" },
          ],
        }),
      }),
    ];
    index.misconceptions = [
      makeMisconception({ anchor: "wiens-law-absorption-spectra" }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(0);
  });

  it("does NOT fire when the cross-ref slug is declared in ANOTHER chapter (course-wide set)", () => {
    // Mirrors I1's course-wide check — a CommonMisuse can legitimately
    // cross-link to a misconception declared elsewhere in the course.
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            { body: "ok.", misconception: "wiens-law-absorption-spectra" },
          ],
        }),
      }),
    ];
    index.misconceptions = [
      makeMisconception({
        chapter: "ch-1",
        anchor: "wiens-law-absorption-spectra",
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(0);
  });

  it("does NOT fire when CommonMisuse has no misconception slug (E9 handles that)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [{ body: "uncrossed misuse." }],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(0);
    // E9 fires instead (the "missing cross-ref" nudge).
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(1);
  });

  it("does NOT fire when equation has no biography", () => {
    const index = emptyIndex();
    index.equations = [makeEquation()];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(0);
  });

  it("fires per unresolved misuse (mixed declared / undeclared)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            { body: "ok.", misconception: "wiens-law-absorption-spectra" },
            { body: "broken-1.", misconception: "typo-misconception-1" },
            { body: "broken-2.", misconception: "typo-misconception-2" },
          ],
        }),
      }),
    ];
    index.misconceptions = [
      makeMisconception({ anchor: "wiens-law-absorption-spectra" }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(2);
  });

  it("fires independently of E9 (broken cross-ref + missing cross-ref coexist)", () => {
    // Mixed case: one misuse has a broken cross-ref → E10; another has
    // no cross-ref at all → E9. Both fire, each on its respective entry.
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          common_misuses: [
            { body: "broken.", misconception: "typo-misconception" },
            { body: "missing." }, // no cross-ref
          ],
        }),
      }),
    ];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(1);
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(1);
  });
});

// =====================================================================
// E8 — <Units symbol> not in registry (NR-gated)
// =====================================================================

describe("E8 WARNING — <Units symbol> not in registry (NR-gated)", () => {
  it("fires when Units symbol has no matching registry concept", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          units: [{ symbol: "Q", unit: "K" }],
        }),
      }),
    ];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const e8 = report.warnings.filter((f) => f.code === "E8");
    expect(e8).toHaveLength(1);
    expect(e8[0]?.message).toContain("Q");
    expect(e8[0]?.message).toContain("wiens-law");
  });

  it("does NOT fire when Units symbol matches a registry concept", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          units: [{ symbol: "T", unit: "K" }],
        }),
      }),
    ];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.warnings.filter((f) => f.code === "E8")).toHaveLength(0);
  });

  it("is silent when registry is not opted-in (gate)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        biography: makeBiography({
          units: [{ symbol: "Q", unit: "K" }],
        }),
      }),
    ];
    // No registry passed → entire NR block skipped.
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "E8")).toHaveLength(0);
  });
});

// =====================================================================
// NR1 — KeyEquation.symbols declares unregistered symbol (NR-gated)
// =====================================================================

describe("NR1 WARNING — KeyEquation.symbols declares unregistered symbol (NR-gated)", () => {
  it("fires per symbol that has no matching registry concept", () => {
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["T", "X", "Y"] })];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const nr1 = report.warnings.filter((f) => f.code === "NR1");
    expect(nr1).toHaveLength(2);
    expect(nr1.map((f) => f.message).join(" ")).toMatch(/"X"/);
    expect(nr1.map((f) => f.message).join(" ")).toMatch(/"Y"/);
  });

  it("does NOT fire when every symbol matches a registry concept", () => {
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["T"] })];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.warnings.filter((f) => f.code === "NR1")).toHaveLength(0);
  });

  it("is silent when registry is not opted-in (gate)", () => {
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["UNREGISTERED"] })];
    const report = runPedagogyAudit(index);
    expect(report.warnings.filter((f) => f.code === "NR1")).toHaveLength(0);
  });
});

// =====================================================================
// NR3 — registry: same symbol bound to multiple concept.ids (NR-gated)
// =====================================================================

describe("NR3 ERROR — registry symbol-collision across concept.ids (NR-gated)", () => {
  it("fires once per collision (two concepts sharing canonical_symbol)", () => {
    const index = emptyIndex();
    const registry = makeRegistry([
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
      {
        id: "stellar-radius",
        verbal_label: "stellar radius",
        canonical_symbol: "r",
        latex: "R",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const nr3 = report.errors.filter((f) => f.code === "NR3");
    expect(nr3).toHaveLength(1);
    expect(nr3[0]?.message).toContain('"r"');
    expect(nr3[0]?.message).toContain("orbital-radius");
    expect(nr3[0]?.message).toContain("stellar-radius");
  });

  it("does NOT fire when every symbol is bound to exactly one concept", () => {
    const index = emptyIndex();
    const registry = makeRegistry([
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.errors.filter((f) => f.code === "NR3")).toHaveLength(0);
  });

  it("fires once per distinct colliding symbol (not per pair)", () => {
    const index = emptyIndex();
    const registry = makeRegistry([
      // Three-way collision on "r" → still one NR3 finding.
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
      {
        id: "stellar-radius",
        verbal_label: "stellar radius",
        canonical_symbol: "r",
        latex: "R",
      },
      {
        id: "ratio",
        verbal_label: "ratio",
        canonical_symbol: "r",
        latex: "\\rho",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.errors.filter((f) => f.code === "NR3")).toHaveLength(1);
  });

  it("is silent when registry is not opted-in (gate)", () => {
    const index = emptyIndex();
    // Even though we'd "have" a colliding registry, no registry passed
    // = NR block skipped entirely.
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((f) => f.code === "NR3")).toHaveLength(0);
  });

  it("STILL fires NR3 AND adds all colliding concepts to referencedConceptIds (no NR2 for either)", () => {
    // Reviewer test gap 6a: lock the behavior where a collision (NR3
    // error) doesn't suppress the NR2-promote logic. The current
    // implementation iterates `symbolToConcepts.get(symbol)` and
    // adds EVERY matching concept.id to referencedConceptIds — that
    // way both concepts get the orphan-status promotion even though
    // the collision separately fires NR3. Locks against a future
    // "be conservative when colliding" refactor that would suppress
    // both concepts' promotion and incorrectly emit two NR2 findings.
    const index = emptyIndex();
    // An equation references the colliding symbol.
    index.equations = [makeEquation({ symbols: ["r"] })];
    const registry = makeRegistry([
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
      {
        id: "stellar-radius",
        verbal_label: "stellar radius",
        canonical_symbol: "r",
        latex: "R",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    // NR3 still fires — the collision is independent of references.
    expect(report.errors.filter((f) => f.code === "NR3")).toHaveLength(1);
    // Both concepts promoted out of orphan status — neither fires NR2.
    expect(report.info.filter((f) => f.code === "NR2")).toHaveLength(0);
  });
});

// =====================================================================
// NR4 — symbol has no units anywhere (registry OR <Units>); ADR 0046 §R10
// =====================================================================

describe("NR4 WARNING — symbol has no units anywhere (per ADR 0046 §R10) (NR-gated)", () => {
  it("fires when registry concept lacks `units` AND equation lacks a matching <Units>", () => {
    // Per ADR 0046 §R10: NR4 fires only when neither source of truth
    // exists. Registry knows the concept (so NR1 stays silent) but
    // doesn't declare units, and the equation didn't fill the gap.
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        symbols: ["T"],
        biography: makeBiography({
          observable: { body: "x", epistemicRole: "observable" },
        }),
      }),
    ];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        // No `units` — and no <Units> child below — so NR4 fires.
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const nr4 = report.warnings.filter((f) => f.code === "NR4");
    expect(nr4).toHaveLength(1);
    expect(nr4[0]?.message).toContain('"T"');
    expect(nr4[0]?.message).toMatch(/no units are declared anywhere/);
  });

  it("does NOT fire when the registry concept declares `units` (§R10: registry is the source of truth)", () => {
    // Pre-§R10 NR4 nagged here ("you have units in the registry, you
    // should ALSO add a <Units> child"). §R10 inverts this: the registry
    // path is preferred and a duplicate <Units> child is now noise.
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["T"] })];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        units: "K",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.warnings.filter((f) => f.code === "NR4")).toHaveLength(0);
  });

  it("does NOT fire when equation declares a matching <Units> (regardless of registry units)", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        symbols: ["T"],
        biography: makeBiography({
          units: [{ symbol: "T", unit: "K" }],
        }),
      }),
    ];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        // No `units` on the registry side — but the <Units> child
        // covers it, so NR4 stays silent.
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.warnings.filter((f) => f.code === "NR4")).toHaveLength(0);
  });

  it("does NOT fire when symbol is unregistered (NR1 already covers that case)", () => {
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["UNREGISTERED"] })];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        units: "K",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    // NR1 fires; NR4 does not (duplicate nudge would be noise).
    expect(report.warnings.filter((f) => f.code === "NR4")).toHaveLength(0);
    expect(report.warnings.filter((f) => f.code === "NR1")).toHaveLength(1);
  });

  it("fires per (equation, symbol) — two equations sharing a registered-but-unitless symbol produce 2 findings", () => {
    // Per-instance counting: NR4 should surface once per missing pair
    // so both edit sites are visible to the author. Each fix removes
    // one finding.
    const index = emptyIndex();
    index.equations = [
      makeEquation({ id: "eq-a", symbols: ["T"] }),
      makeEquation({ id: "eq-b", symbols: ["T"] }),
    ];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        // No `units` — neither equation provides a <Units> child either.
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const nr4 = report.warnings.filter((f) => f.code === "NR4");
    expect(nr4).toHaveLength(2);
    expect(nr4[0]?.location?.anchor).toBe("eq-a");
    expect(nr4[1]?.location?.anchor).toBe("eq-b");
  });
});

// =====================================================================
// NR2 modification — KeyEquation.symbols promote concept out of orphan
// =====================================================================

describe("NR2 modification — KeyEquation.symbols promotes concept out of orphan (NR-gated)", () => {
  it("does NOT fire NR2 when an equation's symbols references the registry concept", () => {
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["T"] })];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    const nr2 = report.info.filter((f) => f.code === "NR2");
    expect(nr2).toHaveLength(0);
  });

  it("fires NR2 when neither MultiRep nor equation symbols references the concept", () => {
    const index = emptyIndex();
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    expect(report.info.filter((f) => f.code === "NR2")).toHaveLength(1);
  });

  it("does NOT fire NR2 when one of several concepts is referenced via symbols", () => {
    const index = emptyIndex();
    index.equations = [makeEquation({ symbols: ["T"] })];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
      },
      {
        id: "orbital-radius",
        verbal_label: "orbital radius",
        canonical_symbol: "r",
        latex: "r",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    // Only "orbital-radius" still orphan; NR2 fires once.
    const nr2 = report.info.filter((f) => f.code === "NR2");
    expect(nr2).toHaveLength(1);
    expect(nr2[0]?.message).toContain("orbital-radius");
  });
});

// =====================================================================
// Integration — full smoke scenario exercising every invariant
// =====================================================================

describe("integration — full smoke scenario", () => {
  it("Wien's-law-shaped equation with full biography produces no E7 nor E9; NR opt-in produces no NR1/NR4 when properly wired", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        symbols: ["T", "\\lambda_{peak}"],
        biography: {
          observable: {
            body: "Peak wavelength.",
            epistemicRole: "observable",
          },
          assumptions: [
            {
              body: "LTE.",
              type: "thermal-equilibrium",
              epistemicRole: "assumption",
            },
          ],
          units: [
            { symbol: "T", unit: "K" },
            { symbol: "\\lambda_{peak}", unit: "cm" },
          ],
          breaks_when: {
            body: "Non-thermal emission.",
            epistemicRole: "approximation",
          },
          common_misuses: [
            {
              body: "Absorption spectra.",
              misconception: "wiens-law-absorption-spectra",
            },
          ],
          derivation_steps: [],
        },
      }),
    ];
    index.misconceptions = [
      makeMisconception({ anchor: "wiens-law-absorption-spectra" }),
    ];
    const registry = makeRegistry([
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        units: "K",
      },
      {
        id: "wavelength-peak",
        verbal_label: "peak wavelength",
        canonical_symbol: "\\lambda_{peak}",
        latex: "\\lambda_{peak}",
        units: "cm",
      },
    ]);
    const report = runPedagogyAudit(index, { notationRegistry: registry });
    // Biography is complete → E7/E9 silent.
    expect(report.info.filter((f) => f.code === "E7")).toHaveLength(0);
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(0);
    // Symbols + Units fully aligned to registry → NR1/NR4/E8 silent.
    expect(report.warnings.filter((f) => f.code === "NR1")).toHaveLength(0);
    expect(report.warnings.filter((f) => f.code === "NR4")).toHaveLength(0);
    expect(report.warnings.filter((f) => f.code === "E8")).toHaveLength(0);
    // No symbol collisions in registry → NR3 silent.
    expect(report.errors.filter((f) => f.code === "NR3")).toHaveLength(0);
    // Both registry concepts referenced via symbols → no NR2 orphans.
    expect(report.info.filter((f) => f.code === "NR2")).toHaveLength(0);
  });

  // P3-1 — failing-case fixture exercising NR1 + NR3 + NR4 together
  // (Phase B audit §4.3). Belt-and-suspenders complement to the
  // synthetic-AST isolation tests above: this is the "what if a chapter
  // ships with a deliberately-broken registry/equation combo" scenario.
  // Mirrors the positive test's shape so the contrast is explicit.
  // Post-§R10: the NR4 trigger requires registry concepts WITHOUT
  // `units` (since registry-with-units is now the source of truth and
  // no longer prompts NR4). The collision scenario below has neither
  // concept declaring units.
  it("deliberately-broken Wien's-law fixture fires NR1 + NR3 + NR4 together", () => {
    const index = emptyIndex();
    index.equations = [
      makeEquation({
        // Triggers NR1: "X_unregistered" is not in the registry.
        // "T" IS in the registry but neither colliding concept declares
        // `units`, and the biography below has NO <Units symbol="T">
        // child → triggers NR4 (no source of truth for T's units).
        symbols: ["T", "X_unregistered"],
        biography: makeBiography({
          observable: {
            body: "Peak wavelength.",
            epistemicRole: "observable",
          },
          // Note: NO units entry for T, and the registry doesn't
          // declare units either → NR4 fires for T.
        }),
      }),
    ];
    const registry = makeRegistry([
      // Triggers NR3: both concepts bind to canonical_symbol "T" —
      // declaration collision; symbol resolution ambiguous.
      {
        id: "temperature",
        verbal_label: "temperature",
        canonical_symbol: "T",
        latex: "T",
        // No `units` (forces NR4 to fire per §R10).
      },
      {
        id: "time-of-flight",
        verbal_label: "time of flight",
        canonical_symbol: "T",
        latex: "T",
        // No `units` either.
      },
    ]);

    const report = runPedagogyAudit(index, { notationRegistry: registry });

    // NR1 WARNING — unregistered symbol declared on KeyEquation.
    const nr1 = report.warnings.filter((f) => f.code === "NR1");
    expect(nr1).toHaveLength(1);
    expect(nr1[0]?.message).toMatch(/X_unregistered/);

    // NR3 ERROR — registry symbol "T" bound to multiple concept.ids.
    const nr3 = report.errors.filter((f) => f.code === "NR3");
    expect(nr3).toHaveLength(1);
    expect(nr3[0]?.message).toMatch(/"T".*multiple concepts/);

    // NR4 WARNING — symbol "T" has no units anywhere (no registry
    // units, no <Units> child). Fires once per (equation, symbol)
    // pair — here that's one finding for the single equation +
    // single unitless symbol "T".
    const nr4 = report.warnings.filter((f) => f.code === "NR4");
    expect(nr4.length).toBeGreaterThanOrEqual(1);
    expect(nr4[0]?.message).toMatch(/"T"/);

    // Sanity: NR2 doesn't ALSO fire on the collision concepts —
    // they're promoted out of orphan because "T" matches via the
    // KeyEquation.symbols reference path (PR-δ NR2 modification).
    const nr2 = report.info.filter(
      (f) =>
        f.code === "NR2" &&
        (f.message.includes("temperature") ||
          f.message.includes("time-of-flight"))
    );
    expect(nr2).toHaveLength(0);
  });
});
