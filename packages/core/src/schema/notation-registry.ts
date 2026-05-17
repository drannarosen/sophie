import { z } from "zod";
import { EpistemicRoleSchema } from "./epistemic-role.ts";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * Notation Registry per ADR 0043 + 2026-05-17 design hardening §D3.
 *
 * Each `concepts[]` entry is the canonical declaration of one course
 * concept — its verbal label, committed symbol, units, code alias,
 * common confusions, and (optional) epistemic role per ADR 0058.
 *
 * The registry is the canonical concept-catalog for ALL Reasoning OS
 * components. `<MultiRep concept="…">` and future composites
 * (`<OMIFlow>`, `<UncertaintyLens>`, `<AssumptionStack>`) all resolve
 * concept metadata via this schema.
 *
 * v1 ships per-course registry only; ADR 0048 plugin layer wraps the
 * loader for cross-course catalog inheritance at v2 (no schema change).
 */

/**
 * A single common-confusion entry on a concept — a symbol students
 * often conflate with this concept's `canonical_symbol`.
 */
export const CommonConfusionSchema = z.object({
  /** The confusable symbol (e.g., "R" when concept's canonical is "r"). */
  symbol: NonEmptyString,
  /** What the confusable symbol actually means. */
  meaning: NonEmptyString,
  /**
   * Optional link to the confusable concept's own registry entry if
   * one exists. Lets the registry encode a small semantic graph of
   * commonly-conflated concepts.
   */
  concept_ref: Slug.optional(),
});

export type CommonConfusion = z.infer<typeof CommonConfusionSchema>;

export const ConceptSchema = z.object({
  /** Stable identifier; referenced by `<MultiRep concept="…">`. Kebab-case. */
  id: Slug,
  /** Plain-language name rendered to readers ("orbital radius"). */
  verbal_label: NonEmptyString,
  /** The course's committed symbol ("r"). */
  canonical_symbol: NonEmptyString,
  /** LaTeX rendering of the symbol (e.g., "r", "R_\\odot", "\\mathcal{M}"). */
  latex: NonEmptyString,
  /** Unit specification (CGS primary; display units optional). */
  units: z.string().optional(),
  /** Variable name convention for `<CodeCell>` references (e.g., "r_au"). */
  code_alias: z.string().optional(),
  /** Symbols students commonly conflate with this concept's canonical symbol. */
  common_confusions: z.array(CommonConfusionSchema).optional(),
  /** Where the concept is introduced — e.g., "module-02/lecture-04". */
  introduced_in: z.string().optional(),
  /** Sibling concepts for cross-reference; each must be a registered concept id. */
  related_concepts: z.array(Slug).optional(),
  /** Free-form authoring notes (not rendered to students). */
  notes: z.string().optional(),
  /**
   * Optional ADR 0058 epistemic role binding (2026-05-17 design §D3).
   * The registry concept declaration is the single source of truth for
   * a concept's role across all Reasoning OS components; lifting role
   * here avoids per-MultiRep re-declaration and unlocks role-aware
   * queries across the pedagogy index.
   */
  epistemic_role: EpistemicRoleSchema.optional(),
});

export type Concept = z.infer<typeof ConceptSchema>;

export const NotationRegistrySchema = z.object({
  /** Schema version (currently "1"). */
  version: NonEmptyString,
  /** Course slug; matches `pedagogy-contract.yaml.course.slug`. */
  course: NonEmptyString,
  /** Most-recent revision date (ISO 8601). */
  last_updated: z.iso.date(),
  /** Concept entries. May be empty (registry-stub case). */
  concepts: z.array(ConceptSchema),
  /**
   * Optional course-specific custom fields. Passthrough mode for
   * forward-compatibility; v1 doesn't validate the inner shape.
   */
  extensions: z.record(z.string(), z.unknown()).optional(),
});

export type NotationRegistry = z.infer<typeof NotationRegistrySchema>;
