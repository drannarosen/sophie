import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.ts";

/**
 * Pedagogy index — the build-time extraction surface declared by
 * ADR 0038. PR-C1 ships the `definition` role; other entry shapes
 * are declared up-front so the index's shape is locked across the
 * Bucket C PR sequence (PRs C2–C4 materialize the runtime
 * extractors).
 */

/**
 * A canonical definition extracted from an `<Aside kind="definition"
 * title="...">` block in a chapter MDX source. Powers the chapter +
 * course glossary consumers, the `<GlossaryTerm>` inline reference,
 * and the audit's duplicate-term invariants.
 */
export const DefinitionEntrySchema = z.object({
  /** Canonical term (from <Aside title>). Required by Aside's Zod refinement. */
  term: NonEmptyString,
  /** URL-safe slug. Auto-generated from `term` via @sophie/core/schema/slugify, overridable via explicit <Aside id>. */
  slug: Slug,
  /** Pre-rendered HTML of the aside body. Embedded by consumers via `set:html`. May be empty. */
  body: z.string(),
  /** Chapter slug containing the source aside. */
  chapter: Slug,
  /** DOM id on the source <details> element; back-link target. */
  anchor: NonEmptyString,
});
export type DefinitionEntry = z.infer<typeof DefinitionEntrySchema>;

/**
 * An equation lifted from `<KeyEquation>` blocks (PR-C2). Shape
 * locked here so consumers can declare their `equations` slot;
 * the extractor is implemented in PR-C2.
 */
export const EquationEntrySchema = z.object({
  slug: Slug,
  label: NonEmptyString,
  number: z.number().int().positive().optional(),
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
});
export type EquationEntry = z.infer<typeof EquationEntrySchema>;

/**
 * A key-insight aside (`<Aside kind="key-insight">`) — extracted in
 * PR-C3. Shape locked here.
 */
export const KeyInsightEntrySchema = z.object({
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
});
export type KeyInsightEntry = z.infer<typeof KeyInsightEntrySchema>;

/**
 * A registry-mode figure (`<Figure name="..." />`) — extracted in
 * PR-C3. Shape locked here.
 */
export const FigureEntrySchema = z.object({
  name: NonEmptyString,
  caption: z.string().optional(),
  chapter: Slug,
  anchor: NonEmptyString,
});
export type FigureEntry = z.infer<typeof FigureEntrySchema>;

/**
 * A misconception entry — extracted in PR-C3 from BOTH `<Aside
 * kind="misconception">` (length="short") and `<Callout
 * variant="misconception">` (length="long") source components. The
 * length discriminator is the source-component tag (ADR 0038's
 * role-aggregation principle in concrete form).
 */
export const MisconceptionEntrySchema = z.object({
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
  length: z.enum(["short", "long"]),
  label: z.string().optional(),
});
export type MisconceptionEntry = z.infer<typeof MisconceptionEntrySchema>;

/**
 * The full pedagogy index — one per build. Consumers read it via
 * the `virtual:sophie/pedagogy-index` module exposed by
 * @sophie/astro's Vite plugin.
 */
export const PedagogyIndexSchema = z.object({
  definitions: z.array(DefinitionEntrySchema).readonly(),
  equations: z.array(EquationEntrySchema).readonly(),
  keyInsights: z.array(KeyInsightEntrySchema).readonly(),
  figures: z.array(FigureEntrySchema).readonly(),
  misconceptions: z.array(MisconceptionEntrySchema).readonly(),
});
export type PedagogyIndex = z.infer<typeof PedagogyIndexSchema>;
