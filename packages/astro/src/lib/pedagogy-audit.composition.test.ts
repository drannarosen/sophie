import type {
  EquationEntry,
  InterventionEntry,
  MisconceptionEntry,
  MultiRepIndexEntry,
  NotationRegistry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "./pedagogy-audit.ts";

/**
 * Cross-family composition integration test (P2-1; Phase B Reasoning
 * OS core audit §4.1).
 *
 * Exercises the four pedagogical-core families that landed across
 * Sessions 1–3 — MultiRep (ADR 0043), Misconception graph +
 * Intervention library (ADR 0044), Equation Biography (ADR 0046) — as
 * a single composite scenario against a populated PedagogyIndex
 * snapshot. The per-family test files
 * (`pedagogy-audit.multirep.test.ts`,
 * `pedagogy-audit.intervention.test.ts`,
 * `pedagogy-audit.biography.test.ts`) cover each family's invariants
 * in isolation; this file locks the **interaction**: when a
 * `<KeyEquation>` declares `symbols` AND carries a `<CommonMisuse
 * misconception="X">`, and the same `X` is declared as a misconception
 * Aside paired with an `<Intervention addresses="this">`, AND a
 * `<MultiRep concept="Y">` binds the equation's symbol to a registry
 * concept — do all the cross-cutting invariants (E10, I1, MG3, MR1,
 * NR2) line up?
 *
 * PR-7's chapter capstone consumes this exact composition; locking
 * the audit-layer integration here so a regression bites a unit test
 * rather than a chapter render.
 *
 * Single composite scenario rather than a suite — the audit recommends
 * "one integration test that exercises each via a smoke-fixture
 * chapter MDX with a deliberately-broken registry/equation combo"
 * (audit §4.1). The positive composition is the equivalent
 * happy-path lock here.
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

describe("cross-family composition — KeyEquation ↔ MultiRep ↔ Aside ↔ Intervention", () => {
  it("happy-path: all 4 families compose without cross-cutting audit fire", () => {
    // Scenario (mirrors the wiens-law-fixture cross-cuts described in
    // audit §2.7). A single chapter contains:
    //
    //   <KeyEquation id="wiens-law" symbols={["T", "\\lambda_{peak}"]}>
    //     observable + assumption + units + breaks_when + common_misuse
    //     CommonMisuse misconception="wiens-law-absorption-spectra"
    //   </KeyEquation>
    //
    //   <MultiRep concept="peak-wavelength">
    //     <RepEquation refKey="wiens-law" symbol="\\lambda_{peak}" />
    //   </MultiRep>
    //
    //   <Aside kind="misconception" name="wiens-law-absorption-spectra">
    //     <Intervention type="contrasting-cases" addresses="this">…</Intervention>
    //   </Aside>
    //
    // Plus a NotationRegistry that registers both T and λ_peak.
    //
    // Expected: no cross-cutting invariants fire. Specifically:
    //   - E10 (broken CommonMisuse cross-ref) silent — misconception declared
    //   - E9  (missing CommonMisuse cross-ref) silent — cross-ref populated
    //   - I1  (unresolved addresses) silent — "this" resolved to the
    //     enclosing Aside's slugified name (anchor precedence per ADR
    //     0044 §R7)
    //   - MG3 (orphan misconception) silent — intervention paired
    //   - MR1 (unregistered concept) silent — peak-wavelength registered
    //   - NR2 (orphan registry concept) silent — both concepts referenced
    //     (peak-wavelength via MultiRep; temperature via KeyEquation.symbols
    //     per PR-δ NR2 modification)

    const chapter = "01-foundations/wiens-law-fixture";

    const wiensLaw: EquationEntry = {
      slug: "wiens-law",
      title: "Wien's Law",
      number: 1,
      tex: "\\lambda_{peak} = b T^{-1}",
      body: "<p>body</p>",
      chapter,
      anchor: "wiens-law",
      symbols: ["T", "\\lambda_{peak}"],
      biography: {
        observable: {
          body: "Peak wavelength.",
          epistemicRole: "observable",
        },
        assumptions: [
          {
            body: "Local thermodynamic equilibrium.",
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
            body: "Applied to absorption-line spectra.",
            misconception: "wiens-law-absorption-spectra",
          },
        ],
        derivation_steps: [],
      },
    };

    const peakWavelengthMultiRep: MultiRepIndexEntry = {
      concept: "peak-wavelength",
      id: "mr-peak-wavelength",
      chapter,
      reps: [
        {
          kind: "equation",
          refKey: "wiens-law",
          symbol: "\\lambda_{peak}",
        },
      ],
    };

    const misconception: MisconceptionEntry = {
      body: "<p>Wien's law applied to absorption-line spectra.</p>",
      chapter,
      anchor: "wiens-law-absorption-spectra",
      length: "short",
    };

    const intervention: InterventionEntry = {
      type: "contrasting-cases",
      // PR-δ extractor rewrites addresses="this" to the enclosing
      // misconception name's slug; this test simulates the post-
      // extraction shape that the audit consumes.
      addresses: ["wiens-law-absorption-spectra"],
      body: "<p>Compare a thermal continuum to an absorption-line spectrum.</p>",
      depth: "substantial",
      chapter,
      anchor: "intervention-contrasting-cases-1",
    };

    const registry: NotationRegistry = {
      version: "1",
      course: "smoke",
      last_updated: "2026-05-18",
      concepts: [
        {
          id: "temperature",
          verbal_label: "temperature",
          canonical_symbol: "T",
          latex: "T",
          units: "K",
        },
        {
          id: "peak-wavelength",
          verbal_label: "peak wavelength",
          canonical_symbol: "\\lambda_{peak}",
          latex: "\\lambda_{peak}",
          units: "cm",
        },
      ],
    };

    const index = emptyIndex();
    index.equations = [wiensLaw];
    index.multiReps = [peakWavelengthMultiRep];
    index.misconceptions = [misconception];
    index.interventions = [intervention];

    const report = runPedagogyAudit(index, { notationRegistry: registry });

    // ─── EquationBiography family (ADR 0046) ──────────────────────────
    // Observable populated → no E7 nudge.
    expect(report.info.filter((f) => f.code === "E7")).toHaveLength(0);
    // CommonMisuse has misconception cross-ref → no E9 nudge.
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(0);
    // Cross-ref slug IS declared course-wide → no E10 warning.
    expect(report.warnings.filter((f) => f.code === "E10")).toHaveLength(0);
    // Units symbols match registry → no E8 warning.
    expect(report.warnings.filter((f) => f.code === "E8")).toHaveLength(0);

    // ─── NotationRegistry family (ADR 0043) ──────────────────────────
    // All declared symbols registered → no NR1 warning.
    expect(report.warnings.filter((f) => f.code === "NR1")).toHaveLength(0);
    // Both concepts referenced (peak-wavelength via MultiRep;
    // temperature via KeyEquation.symbols per PR-δ NR2 modification)
    // → no NR2 orphans.
    expect(report.info.filter((f) => f.code === "NR2")).toHaveLength(0);
    // No symbol collisions in registry → no NR3 error.
    expect(report.errors.filter((f) => f.code === "NR3")).toHaveLength(0);
    // Both registry symbols have <Units> children → no NR4 warning.
    expect(report.warnings.filter((f) => f.code === "NR4")).toHaveLength(0);

    // ─── MultiRep family (ADR 0043) ──────────────────────────────────
    // peak-wavelength is registered → no MR1 error.
    expect(report.errors.filter((f) => f.code === "MR1")).toHaveLength(0);
    // RepEquation symbol matches registry canonical_symbol → no MR2.
    expect(report.warnings.filter((f) => f.code === "MR2")).toHaveLength(0);

    // ─── Misconception graph + Intervention library (ADR 0044) ──────
    // Misconception has an intervention paired course-wide → no MG3.
    expect(report.warnings.filter((f) => f.code === "MG3")).toHaveLength(0);
    // Intervention's "this" was resolved to the declared misconception
    // anchor before audit-time → no I1 warning.
    expect(report.warnings.filter((f) => f.code === "I1")).toHaveLength(0);
    // contrasting-cases is in the canonical library → no I2 error.
    expect(report.errors.filter((f) => f.code === "I2")).toHaveLength(0);
  });

  it("breaks gracefully: misconception cross-ref typo fires E10 AND I1 (cross-family failure mode)", () => {
    // Same composition as the happy-path test above, but with two
    // intentional typos:
    //   - CommonMisuse cites `wiens-law-misuse` (NOT declared) → E10
    //   - Intervention addresses `wiens-law-misuse` instead of the
    //     declared `wiens-law-absorption-spectra` → I1
    //
    // This exercises the SHARED `declaredMisconceptionAnchors` set
    // (consumed by E10 + I1 + MG3) to confirm both invariants surface
    // the same kind of regression independently — proving the single-
    // source-of-truth shape is wired into both audit branches.
    const chapter = "01-foundations/broken-composition";

    const index = emptyIndex();
    index.equations = [
      {
        slug: "wiens-law",
        title: "Wien's Law",
        number: 1,
        tex: "\\lambda_{peak} = b T^{-1}",
        body: "<p>body</p>",
        chapter,
        anchor: "wiens-law",
        symbols: [],
        biography: {
          assumptions: [],
          units: [],
          common_misuses: [
            {
              body: "broken cross-ref",
              misconception: "wiens-law-misuse",
            },
          ],
          derivation_steps: [],
        },
      },
    ];
    index.misconceptions = [
      {
        body: "<p>real misconception</p>",
        chapter,
        anchor: "wiens-law-absorption-spectra",
        length: "short",
      },
    ];
    index.interventions = [
      {
        type: "contrasting-cases",
        addresses: ["wiens-law-misuse"], // typo: doesn't match declared anchor
        body: "<p>intervention</p>",
        depth: "light",
        chapter,
        anchor: "intervention-contrasting-cases-1",
      },
    ];

    const report = runPedagogyAudit(index);

    // E10 fires on the CommonMisuse cross-ref typo.
    const e10 = report.warnings.filter((f) => f.code === "E10");
    expect(e10).toHaveLength(1);
    expect(e10[0]?.message).toContain("wiens-law-misuse");

    // I1 fires on the Intervention's addresses typo — SAME slug,
    // different audit branch. Single source of truth (the
    // declaredMisconceptionAnchors set built once at audit-time)
    // serves both.
    const i1 = report.warnings.filter((f) => f.code === "I1");
    expect(i1).toHaveLength(1);
    expect(i1[0]?.message).toContain("wiens-law-misuse");

    // MG3 also fires: the legitimately-declared
    // `wiens-law-absorption-spectra` misconception has NO matching
    // intervention paired course-wide (the only intervention addresses
    // the typo'd slug).
    const mg3 = report.warnings.filter((f) => f.code === "MG3");
    expect(mg3).toHaveLength(1);
    expect(mg3[0]?.message).toContain("wiens-law-absorption-spectra");

    // Boundary lock between E9 (missing cross-ref) and E10 (broken
    // cross-ref): the broken-composition equation HAS a CommonMisuse
    // with `misconception` populated (the typo), so E9 must NOT fire.
    // Catches a future refactor that conflates the two predicates.
    expect(report.info.filter((f) => f.code === "E9")).toHaveLength(0);
  });
});
