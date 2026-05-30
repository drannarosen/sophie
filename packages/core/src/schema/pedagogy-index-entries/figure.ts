import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Figure pedagogy entries — registry declaration + per-chapter usage.
 * Two-tier model (PR-C3 decision #3): consumer-app owns the registry
 * source-of-truth in `src/content/figures.ts`; the extractor walks
 * chapter MDX for `<Figure name="X">` callsites and produces usage
 * records that reference back into the registry at SSR-merge time.
 */

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
  /**
   * Legacy/inline public-URL escape hatch (ADR 0094). Optional: an
   * optimized registry figure resolves its master from
   * `src/figures/<name>.<ext>` by convention (or `file` below) and the
   * platform fills `src` with the build-resolved `_astro/` URL. A
   * literal `src` here is only for `public/`-served images that bypass
   * `astro:assets` optimization.
   */
  src: NonEmptyString.optional(),
  /**
   * Optional explicit source filename under `src/figures/` (ADR 0094),
   * overriding the `<name>.<ext>` convention. Filename only (no path);
   * e.g. `"m51-optical-radio.png"` for a registry key `"m51"`.
   */
  file: NonEmptyString.optional(),
  /** Alt text for accessibility. */
  alt: NonEmptyString,
  /** Default caption (used when no per-usage override). */
  caption: z.string().optional(),
  /** Attribution / credit text. */
  credit: z.string().optional(),
  /** Optional intrinsic image width in CSS pixels. Forwarded to `<img width>` to reserve layout space and reduce CLS. */
  width: z.number().int().positive().optional(),
  /** Optional intrinsic image height in CSS pixels. Forwarded to `<img height>` to reserve layout space and reduce CLS. */
  height: z.number().int().positive().optional(),
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
  /** Parent Unit id (W3 rename from `chapter`). */
  unit: Slug,
  anchor: NonEmptyString,
  /** Per-chapter sequential number, extractor-assigned at appearance order. */
  number: z.number().int().positive(),
  /**
   * Display chapter number from the chapter's `chapter` frontmatter
   * field (Sprint F). Optional. When present, the Figure component
   * and FigureRef render "Figure {chapterNumber}.{number}" /
   * "Fig. {chapterNumber}.{number}"; when absent, they render
   * within-chapter only ("Figure {number}" / "Fig. {number}").
   */
  chapterNumber: z.number().int().positive().optional(),
  /** Exactly one usage per name should be canonical. Default false set by extractor (not by schema); author opts in via `<Figure name="X" canonical />`. */
  canonical: z.boolean(),
  /** Optional caption override from `<Figure caption="...">` JSX prop; wins over registry caption. */
  captionOverride: z.string().optional(),
});
export type FigureUsageEntry = z.infer<typeof FigureUsageEntrySchema>;
