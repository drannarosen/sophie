import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * EquationBiography schemas per ADR 0046 + 2026-05-17 design hardening.
 *
 * Six artifacts (framework-pure data shapes):
 * - ObservableEntrySchema     — single, optional. Role: "observable".
 * - AssumptionEntrySchema     — list. Role: "assumption". Optional `type` slug.
 * - UnitsEntrySchema          — list. NO role (descriptive metadata per
 *                                ADR 0058 §"chrome").
 * - BreaksWhenEntrySchema     — single, optional. Role: "approximation"
 *                                (validity-domain marker).
 * - CommonMisuseEntrySchema   — list. NO own role; optional cross-ref to a
 *                                misconception-graph node (ADR 0044) which
 *                                carries the "misconception" role.
 * - BiographySchema           — aggregate; each KeyEquation/EquationEntry
 *                                may carry one.
 *
 * Role declarations are `z.literal("<role>")` so the extractor cannot drift
 * away from ADR 0058's eight-role taxonomy. The fixed literal lets the
 * audit + AI authoring + uniform-query layer (design §F5) read a single
 * predictable field per entry without runtime role-validation.
 *
 * Optional `concept_ref` (on prose children) and `citation_doi`/
 * `citation_bibtex` (on CommonMisuse) are v2-reserved seams (design §F3/F6);
 * extractor never populates them at v1.
 */

export const ObservableEntrySchema = z.object({
  body: NonEmptyString,
  epistemicRole: z.literal("observable"),
});

export type ObservableEntry = z.infer<typeof ObservableEntrySchema>;

export const AssumptionEntrySchema = z.object({
  body: NonEmptyString,
  /**
   * Free-form slug at v1 per design §F1 forward-compat. v2 may promote to
   * an `assumption-index.ts` catalog enum (`z.enum([...]).or(z.string())`)
   * once recurring patterns emerge.
   */
  type: Slug.optional(),
  epistemicRole: z.literal("assumption"),
  /**
   * v2-reserved: NotationRegistry concept-id cross-refs per design §F3.
   * Extractor never populates at v1; reserved here so v2 lands non-breakingly.
   */
  concept_ref: z.array(Slug).optional(),
});

export type AssumptionEntry = z.infer<typeof AssumptionEntrySchema>;

export const UnitsEntrySchema = z.object({
  /** TeX-form symbol as it appears in the equation (e.g., `\\lambda_{peak}`). */
  symbol: NonEmptyString,
  /** Unit string in any standard form (e.g., `K`, `cm`, `erg s^-1 cm^-2`). */
  unit: NonEmptyString,
});

export type UnitsEntry = z.infer<typeof UnitsEntrySchema>;

export const BreaksWhenEntrySchema = z.object({
  body: NonEmptyString,
  epistemicRole: z.literal("approximation"),
  /** v2-reserved per design §F3 (mirrors AssumptionEntry). */
  concept_ref: z.array(Slug).optional(),
});

export type BreaksWhenEntry = z.infer<typeof BreaksWhenEntrySchema>;

export const CommonMisuseEntrySchema = z.object({
  body: NonEmptyString,
  /**
   * Cross-ref slug to a misconception-graph node (ADR 0044). The misconception
   * node carries the "misconception" epistemic role; this entry inherits the
   * linked role indirectly rather than declaring one of its own. Optional —
   * the audit E9 invariant (PR-δ) nudges authors toward populating it.
   */
  misconception: Slug.optional(),
  /** v2-reserved: structured DOI citation per design §F6. */
  citation_doi: NonEmptyString.optional(),
  /** v2-reserved: full BibTeX entry per design §F6. */
  citation_bibtex: NonEmptyString.optional(),
});

export type CommonMisuseEntry = z.infer<typeof CommonMisuseEntrySchema>;

/**
 * Aggregate per-equation biography. Observable/BreaksWhen modeled as
 * optional singletons (one each typical); Assumption/Units/CommonMisuse
 * modeled as arrays with `[]` defaults so consumers (audit, render) walk
 * a uniform shape without optional-chain noise.
 *
 * All five slots optional — incremental authoring supported per ADR 0046
 * (E7 INFO nudges toward Observable when biography children exist).
 */
export const BiographySchema = z.object({
  observable: ObservableEntrySchema.optional(),
  assumptions: z.array(AssumptionEntrySchema).default([]),
  units: z.array(UnitsEntrySchema).default([]),
  breaks_when: BreaksWhenEntrySchema.optional(),
  common_misuses: z.array(CommonMisuseEntrySchema).default([]),
});

export type Biography = z.infer<typeof BiographySchema>;
