import { z } from "zod";
import { EpistemicRoleSchema } from "./epistemic-role.js";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * EquationBiography schemas per ADR 0046 + 2026-05-17 design hardening.
 * Authoritative design: `docs/plans/2026-05-17-equation-biography-design.md`.
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
 * Role declarations use `EpistemicRoleSchema.extract([...])` rather than bare
 * `z.literal("...")` strings — this grounds biography roles in the canonical
 * 8-role taxonomy (`epistemic-role.ts`) at compile time. A typo like
 * `"observabel"` fails type-check + parse-time rather than silently shipping
 * a drifted role that breaks the queryable epistemic surface (design §F5,
 * ADR 0058 §3).
 *
 * Every schema is `.strict()` — unknown keys fail parse rather than being
 * silently stripped. This enforces the "Units / CommonMisuse carry NO
 * epistemicRole" property structurally (ADR 0058 §"chrome") rather than only
 * descriptively, and catches extractor-side typos (e.g., singular
 * `assumption` for plural `assumptions`).
 *
 * Optional `concept_ref` (on prose children) and `citation_doi`/
 * `citation_bibtex` (on CommonMisuse) are v2-reserved seams (design §F3/F6);
 * extractor never populates them at v1.
 */

export const ObservableEntrySchema = z
  .object({
    body: NonEmptyString,
    epistemicRole: EpistemicRoleSchema.extract(["observable"]),
  })
  .strict();

export type ObservableEntry = z.infer<typeof ObservableEntrySchema>;

export const AssumptionEntrySchema = z
  .object({
    body: NonEmptyString,
    /**
     * Free-form slug at v1 per design §F1 forward-compat. v2 may promote to
     * an `assumption-index.ts` catalog enum (`z.enum([...]).or(z.string())`)
     * once recurring patterns emerge.
     */
    type: Slug.optional(),
    epistemicRole: EpistemicRoleSchema.extract(["assumption"]),
    /**
     * v2-reserved: NotationRegistry concept-id cross-refs per design §F3.
     * Extractor never populates at v1; reserved here so v2 lands non-breakingly.
     */
    concept_ref: z.array(Slug).optional(),
  })
  .strict();

export type AssumptionEntry = z.infer<typeof AssumptionEntrySchema>;

export const UnitsEntrySchema = z
  .object({
    /** TeX-form symbol as it appears in the equation (e.g., `\\lambda_{peak}`). */
    symbol: NonEmptyString,
    /** Unit string in any standard form (e.g., `K`, `cm`, `erg s^-1 cm^-2`). */
    unit: NonEmptyString,
  })
  .strict();

export type UnitsEntry = z.infer<typeof UnitsEntrySchema>;

export const BreaksWhenEntrySchema = z
  .object({
    body: NonEmptyString,
    epistemicRole: EpistemicRoleSchema.extract(["approximation"]),
    /** v2-reserved per design §F3 (mirrors AssumptionEntry). */
    concept_ref: z.array(Slug).optional(),
  })
  .strict();

export type BreaksWhenEntry = z.infer<typeof BreaksWhenEntrySchema>;

export const CommonMisuseEntrySchema = z
  .object({
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
  })
  .strict();

export type CommonMisuseEntry = z.infer<typeof CommonMisuseEntrySchema>;

/**
 * Aggregate per-equation biography. Observable/BreaksWhen modeled as
 * optional singletons (one each typical); Assumption/Units/CommonMisuse
 * modeled as arrays with `[]` defaults so consumers (audit, render) walk
 * a uniform shape without optional-chain noise.
 *
 * All five slots optional — incremental authoring supported per ADR 0046
 * (E7 INFO nudges toward Observable when biography children exist).
 *
 * `.strict()` catches singular-vs-plural typos (e.g., `assumption` instead
 * of `assumptions`) before they reach the audit.
 */
export const BiographySchema = z
  .object({
    observable: ObservableEntrySchema.optional(),
    assumptions: z.array(AssumptionEntrySchema).default([]),
    units: z.array(UnitsEntrySchema).default([]),
    breaks_when: BreaksWhenEntrySchema.optional(),
    common_misuses: z.array(CommonMisuseEntrySchema).default([]),
  })
  .strict();

export type Biography = z.infer<typeof BiographySchema>;
