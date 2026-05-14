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
  /** Canonical slug = KeyEquation.id prop. Author-explicit, no auto-derivation. */
  slug: Slug,
  /** Human-readable name = KeyEquation.title prop. */
  title: NonEmptyString,
  /** Per-chapter sequential number, assigned by the extractor at appearance order. REQUIRED. */
  number: z.number().int().positive(),
  /** Raw TeX source of the FIRST $$...$$ block in the KeyEquation body. Powers EqRef KaTeX popover, LaTeX export, symbol search, AI dim-analysis. */
  tex: NonEmptyString,
  /** Pre-rendered HTML of the full KeyEquation body (matches DefinitionEntry.body shape). Consumers embed via `set:html`. */
  body: z.string(),
  /** Chapter slug containing the source KeyEquation. */
  chapter: Slug,
  /** DOM id on the source <section>; back-link target. Invariant: anchor === slug for equations. */
  anchor: NonEmptyString,
});
export type EquationEntry = z.infer<typeof EquationEntrySchema>;

/**
 * A key-insight aside (`<Aside kind="key-insight">`) — extracted in
 * PR-C3. Shape locked here.
 */
export const KeyInsightEntrySchema = z.object({
  /** Optional human-readable title (from <Aside title>). NEW in PR-C3. */
  title: z.string().optional(),
  /** Pre-rendered HTML of the aside body. */
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
});
export type KeyInsightEntry = z.infer<typeof KeyInsightEntrySchema>;

/**
 * Registry entry for a figure asset (`<Figure name="..." />` registry
 * mode). The consumer app owns the registry source-of-truth in
 * `src/content/figures.ts`; the extractor never populates this
 * collection — TextbookLayout receives it as a prop and forwards it to
 * the figure-registry SSR setter.
 *
 * Per ADR 0001: figure asset data shape lives in `@sophie/core`. The
 * matching component-runtime types re-export from this module.
 */
export const FigureRegistryEntrySchema = z.object({
  /** Canonical figure name (registry key; flat namespace). */
  name: NonEmptyString,
  /** Image asset URL or local path. */
  src: NonEmptyString,
  /** Alt text for accessibility. */
  alt: NonEmptyString,
  /** Default caption (used when no per-usage override). */
  caption: z.string().optional(),
  /** Attribution / credit text. */
  credit: z.string().optional(),
});
export type FigureRegistryEntry = z.infer<typeof FigureRegistryEntrySchema>;

/**
 * Per-chapter usage record for a registry-mode `<Figure name="...">`.
 * Multi-chapter figures produce N usage entries; exactly one should be
 * canonical (default `false`; the extractor sets `true` when the author
 * passes the `canonical` JSX prop).
 */
export const FigureUsageEntrySchema = z.object({
  /** Registry key — must resolve to a FigureRegistryEntry at SSR merge time. */
  name: NonEmptyString,
  chapter: Slug,
  anchor: NonEmptyString,
  /** Per-chapter sequential number, extractor-assigned at appearance order. */
  number: z.number().int().positive(),
  /** Exactly one usage per name should be canonical. Default false set by extractor (not by schema); author opts in via `<Figure name="X" canonical />`. */
  canonical: z.boolean(),
  /** Optional caption override from `<Figure caption="...">` JSX prop; wins over registry caption. */
  captionOverride: z.string().optional(),
});
export type FigureUsageEntry = z.infer<typeof FigureUsageEntrySchema>;

/**
 * A misconception entry — extracted in PR-C3 from BOTH `<Aside
 * kind="misconception">` (length="short") and `<Callout
 * variant="misconception">` (length="long") source components. The
 * length discriminator is the source-component tag (ADR 0038's
 * role-aggregation principle in concrete form).
 *
 * Both source primitives expose an optional `title` prop; that prop
 * surfaces here as the optional `label` field.
 */
export const MisconceptionEntrySchema = z.object({
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
  /** "short" = from <Aside kind="misconception">; "long" = from <Callout variant="misconception">. */
  length: z.enum(["short", "long"]),
  /** Optional label — from Aside.title OR Callout.title (both source primitives' titles are optional). */
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
  /** Consumer-app-owned asset data, forwarded into the index at SSR-merge time. */
  figureRegistry: z.array(FigureRegistryEntrySchema).readonly(),
  /** Per-chapter usage records, populated by the extractor (renamed from `figures` in PR-C3). */
  figureUsages: z.array(FigureUsageEntrySchema).readonly(),
  misconceptions: z.array(MisconceptionEntrySchema).readonly(),
});
export type PedagogyIndex = z.infer<typeof PedagogyIndexSchema>;
