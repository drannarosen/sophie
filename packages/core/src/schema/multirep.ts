import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * MultiRep schemas per ADR 0043 + 2026-05-17 design hardening.
 *
 * Three artifacts:
 * - SerializedRepSchema: discriminated union over the per-rep payload
 *   serialized by the remark extractor. v1 kinds: "verbal" | "equation"
 *   | "figure". RepCode deferred to a follow-on sprint (design §D1, §F1)
 *   pending <CodeCell> (ADR 0018) — adding kind: "code" is non-breaking.
 * - MultiRepSchema: the component's prop shape (concept binding + optional
 *   reserved layout/display props).
 * - MultiRepIndexEntrySchema: the pedagogy-index entry (one per <MultiRep>
 *   block, aggregated per chapter), consumed by audit + AI authoring + the
 *   `<ChapterMultiReps>` aggregator at PR-ε.
 *
 * Refs (`refKey` / `refName`) are stored **raw** as authored; resolution
 * (does refKey point to a real `<KeyEquation>`? does refName match a
 * declared `<Figure>`?) happens at audit-time, not extract-time. Keeps the
 * extractor cycle-free and aligns with the LearningObjectives precedent.
 */

const RepVerbalSchema = z.object({
  kind: z.literal("verbal"),
  body: NonEmptyString,
});

const RepEquationSchema = z.object({
  kind: z.literal("equation"),
  /** The referenced `<KeyEquation>`'s `eqKey`. */
  refKey: NonEmptyString,
  /** Which symbol in the equation represents this concept. */
  symbol: NonEmptyString,
  /**
   * Optional: declares this equation is a variable-substitution-equivalent
   * form of another `<KeyEquation>` or `<RepEquation>` (per ADR 0043
   * 2026-05-14 hardening — MR6 audit checks resolution within the chapter).
   */
  equivalent_to: NonEmptyString.optional(),
  /**
   * Names the substitution that bridges the two equations (e.g.,
   * "planck-substitution", "unit-system-conversion",
   * "non-dimensionalization", "small-z-limit"). Free-form slug at v1;
   * no platform catalog.
   */
  via: NonEmptyString.optional(),
});

const RepFigureSchema = z.object({
  kind: z.literal("figure"),
  /** The referenced `<Figure>`'s `name`. */
  refName: NonEmptyString,
  /** Optional symbol label that appears in the figure (for alignment checks). */
  symbolLabel: NonEmptyString.optional(),
});

export const SerializedRepSchema = z.discriminatedUnion("kind", [
  RepVerbalSchema,
  RepEquationSchema,
  RepFigureSchema,
]);

export type SerializedRep = z.infer<typeof SerializedRepSchema>;

/**
 * Reader-facing layout hints. v1 ships responsive grid uniformly; `layout`
 * is reserved on the component prop schema so v2 alternative modes
 * (`stack`, future `toggle`/`tabbed`) land without a breaking change
 * (design §F7).
 */
export const MultiRepLayoutSchema = z.enum(["grid", "stack"]);

export const MultiRepSchema = z.object({
  /** Registered concept `id` from `notation-registry.yaml`. */
  concept: Slug,
  /** Anchor id (auto-generated from concept slug if omitted). */
  id: Slug.optional(),
  /** Reader UI hint (v1 renderer ignores; reserved for v2 modes). */
  layout: MultiRepLayoutSchema.optional(),
  /** Reserved for v2 alternative display modes; v1 renderer ignores. */
  display: z.string().optional(),
});

export type MultiRep = z.infer<typeof MultiRepSchema>;

export const MultiRepIndexEntrySchema = z.object({
  /** The bound concept's `id` (matches a NotationRegistry concept entry). */
  concept: NonEmptyString,
  /** Anchor id (`mr-<concept-slug>` by default). */
  id: NonEmptyString,
  /** Chapter slug or path (matches the chapter content-collection entry). */
  chapter: NonEmptyString,
  /**
   * Serialized rep payloads from `<MultiRep>` children. At least one rep is
   * required; binding-of-one is meaningful (e.g., a chapter introducing
   * only the verbal handle of a concept before the equation lands).
   */
  reps: z.array(SerializedRepSchema).min(1),
  /** Optional reader UI layout hint copied from `<MultiRep layout>` if set. */
  layout: MultiRepLayoutSchema.optional(),
  /** Optional display-mode passthrough from `<MultiRep display>` if set. */
  display: z.string().optional(),
  /**
   * v2-reserved forward-compat slots (design §F5). Declared at v1 so the
   * AI-authoring ledger (ADR 0042), cross-chapter equivalent tracking, and
   * authoring-provenance fields land non-breakingly.
   */
  bindingNotes: z.string().optional(),
  crossChapterEquivalents: z.array(NonEmptyString).optional(),
  aiAuthoredBy: z.string().optional(),
  lastReviewedDate: z.string().optional(),
});

export type MultiRepIndexEntry = z.infer<typeof MultiRepIndexEntrySchema>;
