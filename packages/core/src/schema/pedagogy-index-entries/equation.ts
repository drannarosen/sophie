import { z } from "zod";
import { BiographySchema } from "../equation-biography.ts";
import { EquationRegistryEntrySchema } from "../equation-registry.ts";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Equation pedagogy entries per ADR 0060 — declaration + chapter
 * citations. Co-located here so the two halves of the equation
 * surface (registry-sourced declaration + chapter-side citation) are
 * authored, audited, and templated against each other in one place.
 */

/**
 * An equation entry in the pedagogy index per ADR 0060. Mirrors the
 * registry frontmatter contract (`EquationRegistryEntrySchema`) — one
 * declaration per equation, sourced from `src/content/equations/<id>.mdx`.
 * Chapter-side data (which chapter cites this equation, in what order,
 * with what framing prose) lives on `EquationCitationEntrySchema` instead.
 *
 * The optional `biography` field is populated by the registry-body walker
 * (ADR 0046 §R8). Pre-ADR-0060, biographies were authored inline at
 * chapter `<KeyEquation>` callsites; post-ADR-0060, biographies live in
 * the registry MDX body and are extracted once per equation.
 */
export const EquationEntrySchema = EquationRegistryEntrySchema.extend({
  /**
   * Optional EquationBiography per ADR 0046 + 2026-05-17 design hardening.
   * Per-equation opt-in; audit invariants E7/E8/E9 only fire when
   * biography children are present. Surfaces the queryable epistemic layer
   * (`epistemicRole` on every prose sub-entry) that ADR 0058 §2 underwrites.
   * Storage moves from chapter-inline to registry MDX body per ADR 0046 §R8.
   */
  biography: BiographySchema.optional(),
}).strict();
export type EquationEntry = z.infer<typeof EquationEntrySchema>;

/**
 * A chapter-side citation of an equation registry entry per ADR 0060.
 * One entry per `<KeyEquation refId="..." />` callsite in chapter MDX.
 * Multiple citations of the same equation across chapters produce N entries;
 * the per-chapter `number` is assigned by the extractor at appearance order.
 *
 * The `framingHtml` field carries optional chapter-specific framing prose
 * from `<KeyEquation refId="...">` children — pre-rendered so the aggregator
 * can embed via `set:html`. The biography itself never lives on a citation;
 * it's resolved from the registry entry at render time via `refId`.
 */
export const EquationCitationEntrySchema = z
  .object({
    /** Chapter slug containing the citation. */
    chapter: Slug,
    /** Registry entry id this citation resolves to (R1 audit target). */
    refId: Slug,
    /** DOM id on the chapter-side `<section>`; back-link target. */
    anchor: NonEmptyString,
    /** Per-chapter sequential number, extractor-assigned at appearance order. */
    number: z.number().int().positive(),
    /** Pre-rendered chapter-specific framing prose from `<KeyEquation>` children. */
    framingHtml: z.string().optional(),
  })
  .strict();
export type EquationCitationEntry = z.infer<typeof EquationCitationEntrySchema>;
