import type { InterventionLibraryEntry } from "@sophie/core/schema";

/**
 * Canonical intervention library per ADR 0044 + 2026-05-17 design
 * hardening §D1. Twelve entries across four cognitive-science
 * families. Each entry is a literature-grounded
 * misconception-remediation move; chapter authors declare
 * `<Intervention type="<name>">` to invoke one.
 *
 * Families:
 * - **Confrontation** — cognitive dissonance → accommodation.
 * - **Bridging** — scaffold from an existing intuition.
 * - **Restructuring** — ontological / category shift.
 * - **Reinforcement** — consolidate the correct conception.
 *
 * v1 ships `citation` as a plain string (e.g.,
 * "Bransford & Schwartz 1999"). Structured fields
 * `citation_doi` / `citation_bibtex` are reserved per design §F4
 * for v2. The `template_body` slot per design §F5 is reserved for
 * AI authoring scaffolds (ADR 0030).
 *
 * Read via `getInterventionLibrary()` rather than importing the
 * array directly — the loader is the seam ADR 0048's plugin layer
 * will wrap to merge cross-course catalogs (design §F3).
 *
 * ---
 *
 * ### REVISIT WHEN — first-draft placeholder fields
 *
 * Two fields below are **thoughtful first-draft placeholders**
 * confirmed with Anna on 2026-05-17. They will get tightened during
 * later hardening passes, not during PR-β.
 *
 * 1. **`addresses_families` slugs** are free-form authoring hints —
 *    no platform catalog enforces them at v1. Current slugs
 *    (`substance-mistaken-for-process`, `everyday-physics-extrapolation`,
 *    `mental-model-mismatch`, `procedural-misapplication`,
 *    `re-emergent-misconception`, `surface-correctness-only`,
 *    `isolated-correct-fragment`, `symbolic-form-without-grounding`,
 *    `conflicting-mental-models`) seed what a future misconception-
 *    family taxonomy will look like. **Revisit when**: a real
 *    misconception-family catalog is ADR-locked (likely alongside or
 *    after `<MisconceptionGraphPage>` v2 work).
 *
 * 2. **`move:` field values** are placeholders for ADR 0041's future
 *    `move-index.ts`. Each value here is the canonical-move slug we
 *    expect to resolve to. The I4 audit invariant (verifying every
 *    canonical intervention's `move` resolves to a real
 *    `move-index.ts` entry) is deferred until that file ships — see
 *    ADR 0044 §R-MisconceptionGraphPage / §R-I4 deferral notes.
 *    **Revisit when**: ADR 0041 ships `move-index.ts`; tighten this
 *    file's slugs to match the canonical move names, then turn on
 *    I4 (one-function-add change).
 */

const INTERVENTIONS: ReadonlyArray<InterventionLibraryEntry> = [
  // -------------------------------------------------------------------
  // Confrontation family — cognitive dissonance → accommodation
  // -------------------------------------------------------------------
  {
    name: "contrasting-cases",
    family: "confrontation",
    description:
      "Two cases differing only on the key dimension; predict before reveal.",
    citation: "Bransford & Schwartz 1999",
    addresses_families: ["substance-mistaken-for-process"],
    move: "contrasting-cases",
  },
  {
    name: "predict-then-reveal",
    family: "confrontation",
    description:
      "Reader predicts outcome before observation; dissonance engages accommodation.",
    citation: "White & Gunstone 1992",
    addresses_families: ["everyday-physics-extrapolation"],
    move: "predict-observe-explain",
  },
  {
    name: "productive-cognitive-conflict",
    family: "confrontation",
    description:
      "Explicitly stage a discrepancy between student model and observation.",
    citation: "Posner et al. 1982",
    addresses_families: ["conflicting-mental-models"],
    move: "stage-conceptual-conflict",
  },
  // -------------------------------------------------------------------
  // Bridging family — scaffold from existing intuition
  // -------------------------------------------------------------------
  {
    name: "bridging-analogy",
    family: "bridging",
    description:
      "Analogy intuitive to students AND mapping the target concept; declare limits explicitly.",
    citation: "Clement 1993",
    addresses_families: ["mental-model-mismatch"],
    move: "bridging-analogy",
  },
  {
    name: "anchoring-intuition",
    family: "bridging",
    description:
      "Identify a correct existing intuition; build the target on top as scaffold.",
    citation: "Clement 1993",
    addresses_families: ["isolated-correct-fragment"],
    move: "anchor-and-extend",
  },
  {
    name: "concrete-to-abstract-scaffold",
    family: "bridging",
    description:
      "Concrete experience → iconic representation → symbolic form (Bruner's Enactive-Iconic-Symbolic sequence).",
    citation: "Bruner 1966",
    addresses_families: ["symbolic-form-without-grounding"],
    move: "enactive-iconic-symbolic",
  },
  // -------------------------------------------------------------------
  // Restructuring family — ontological shift
  // -------------------------------------------------------------------
  {
    name: "discrepant-event",
    family: "restructuring",
    description:
      "Demonstration violating student expectations motivates restructuring.",
    citation: "Liem 1987",
    addresses_families: ["everyday-physics-extrapolation"],
    move: "discrepant-event",
  },
  {
    name: "conceptual-exchange",
    family: "restructuring",
    description:
      "Walk through abandoning one ontological category for another (e.g., heat as substance → process).",
    citation: "Chi 2008",
    addresses_families: ["substance-mistaken-for-process"],
    move: "ontological-shift",
  },
  {
    name: "worked-example-contrast",
    family: "restructuring",
    description:
      "Worked example where the misconception yields a wrong answer; contrast with correct application.",
    citation: "Chi et al. 1989",
    addresses_families: ["procedural-misapplication"],
    move: "worked-example-with-contrast",
  },
  // -------------------------------------------------------------------
  // Reinforcement family — consolidate the correct conception
  // -------------------------------------------------------------------
  {
    name: "refutation-text",
    family: "reinforcement",
    description: "State the misconception, refute, explain why it's tempting.",
    citation: "Tippett 2010",
    addresses_families: ["everyday-physics-extrapolation"],
    move: "refutation-text",
  },
  {
    name: "spaced-retrieval-with-misconception-probe",
    family: "reinforcement",
    description:
      "Quiz on the misconception at spaced intervals; re-address on re-emergence.",
    citation: "Roediger & Karpicke 2006",
    addresses_families: ["re-emergent-misconception"],
    move: "spaced-retrieval-with-probe",
  },
  {
    name: "self-explanation-against-misconception",
    family: "reinforcement",
    description:
      "Student explains to themselves why the correct answer is correct AND why the misconception was tempting.",
    citation: "Chi et al. 1989",
    addresses_families: ["surface-correctness-only"],
    move: "self-explanation",
  },
];

/**
 * Loader for the canonical intervention library. ADR 0048's plugin
 * layer will wrap this loader (design §F3) to merge cross-course
 * intervention catalogs; consumers should always go through this
 * function, never import `INTERVENTIONS` directly.
 */
export function getInterventionLibrary(): ReadonlyArray<InterventionLibraryEntry> {
  return INTERVENTIONS;
}

/**
 * Lookup by canonical name (linear over the 12-entry catalog at v1).
 * Returns `undefined` when not found — the I2 audit at PR-δ catches
 * misuse at build time; runtime consumers degrade gracefully (the
 * component skips the citation chip when no library entry resolves).
 *
 * If the catalog grows past ~50 entries, back this with a Map built
 * once at module load; at 12 entries the linear scan is faster than
 * a Map allocation.
 */
export function getInterventionByName(
  name: string
): InterventionLibraryEntry | undefined {
  return INTERVENTIONS.find((entry) => entry.name === name);
}
