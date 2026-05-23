import { z } from "zod";
import { FigureSchema } from "./figure.js";
import { LangTag, NonEmptyString, Slug } from "./primitives.js";

/**
 * Chapter maturity (ADR 0051). Required frontmatter field — the source-
 * of-truth signal for whether a chapter ships to students.
 *
 * | Value    | Meaning                            | Student build       |
 * | -------- | ---------------------------------- | ------------------- |
 * | `draft`  | In progress; structurally rough.   | EXCLUDED entirely.  |
 * | `review` | Structurally complete; reviewing.  | Included; badge.    |
 * | `stable` | Reviewed; ready for students.      | Included; no badge. |
 *
 * The CS1 audit invariant ERRORs when `status` is missing — enforced
 * at the Zod layer here (the schema-layer rejection produces the same
 * build-failure shape as an audit ERROR, one layer upstream). CS2
 * INFO surfaces `status: draft` chapters in the audit report so
 * authors see what's been excluded from the student build.
 *
 * `status: draft` exclusion mechanism (post-W2/D2 graduation):
 * `status` now lives on `UnitEntry`; the route-level filter
 * (`examples/smoke/src/pages/units/[unit]/reading.astro:19-26`)
 * drops draft Units from the student build. The W1-era
 * `getStudentChapters` helper was deleted with `ChapterEntrySchema`
 * in W2/D3.
 */
export const ChapterStatus = z.enum(["draft", "review", "stable"]);
export type ChapterStatus = z.infer<typeof ChapterStatus>;

/**
 * Chapter pedagogical framing (ADR 0063 §OF-2 + accepted-features
 * §A8). Declares the scientific-reasoning structure the chapter
 * exposes. v1 ships only `OMI` (observable → model → inference); the
 * enum is reserved for forward-compat with `PMI` (predict-model-
 * infer) and `custom` framings as those graduate with their own
 * audit invariants.
 *
 * The OF-2 chapter-level audit invariant fires when a chapter
 * declares `framing: 'OMI'` but renders zero `<OMIFlow>` callsites.
 * Trivially satisfied by one OMIFlow per chapter.
 */
export const ChapterFraming = z.enum(["OMI"]);
export type ChapterFraming = z.infer<typeof ChapterFraming>;

/**
 * Reading-time estimate (Sprint I-A). Author-declared range in
 * minutes. Optional — chapters without `reading` simply omit the
 * meta strip's reading-time chip. The pair is range-form rather
 * than a single number because skim-vs-careful reading times of a
 * science chapter (with math + figures + worked examples) diverge
 * by a factor of ~2; surfacing both honestly helps students budget.
 */
export const ReadingEstimate = z
  .object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
  })
  .refine((r) => r.max >= r.min, {
    message: "Reading-estimate `max` must be >= `min`",
  });
export type ReadingEstimate = z.infer<typeof ReadingEstimate>;

/**
 * AI-contribution disclosure per ADR 0042 (Sprint I-D). Public-by-
 * default surface in the chapter footer. `visibility` lets chapters
 * opt out of public disclosure when an instructor's authoring policy
 * requires it (rare; the platform default is transparency).
 */
export const AIContribution = z.object({
  visibility: z.enum(["public", "private"]).default("public"),
  models: z.array(NonEmptyString).optional(),
  review_depth: z
    .enum([
      "minor-edit",
      "structural-and-line-edit",
      "co-authored",
      "ai-drafted-human-reviewed",
    ])
    .optional(),
});
export type AIContribution = z.infer<typeof AIContribution>;

export const ChapterSchema = z.object({
  title: NonEmptyString,
  /**
   * Optional editorial subtitle / deck (Sprint K). Renders below the
   * auto-prefixed "Lecture N" and the title in italic Fraunces serif —
   * "magazine deck" voice for one-line chapter framing that doesn't
   * fit in the meta strip. When omitted, no subtitle slot renders.
   */
  subtitle: NonEmptyString.optional(),
  slug: Slug,
  // Every chapter belongs to exactly one module (PR 3 design doc).
  module: Slug,
  // Within-module ordering. When omitted, chapters fall back to
  // `title.localeCompare` (see `chaptersForModule`).
  order: z.number().int().nonnegative().optional(),
  /**
   * Display chapter number (Sprint F). Drives the "Figure 3.2" and
   * "Eq. 3.1" prefixes on numbered figures + key equations. Decoupled
   * from `order` so display number stays stable when sort order
   * changes. Optional — chapters without `chapter` get unprefixed
   * "Figure 2", "Eq. 1" labels (within-chapter only).
   */
  chapter: z.number().int().positive().optional(),
  /** Author-declared reading-time estimate (Sprint I-A). */
  reading: ReadingEstimate.optional(),
  /**
   * Difficulty track marker (Sprint I-A). ASTR 201 has Track A (core)
   * and Track B (extended) paths through some chapters; surfacing the
   * marker in the meta strip lets students choose consciously.
   */
  track: z.enum(["A", "B"]).optional(),
  /**
   * Author byline (Sprint I-D). Rendered in the chapter footer.
   * Array form supports collaboratively-authored chapters; single
   * author is just `["Anna Rosen"]`.
   */
  authors: z.array(NonEmptyString).optional(),
  /**
   * Last-revised date (Sprint I-D). ISO 8601 date string. Optional —
   * absent dates fall back to "Last revised: unknown" or git mtime.
   */
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "updated must be an ISO date (YYYY-MM-DD)")
    .optional(),
  /** AI-contribution disclosure per ADR 0042 (Sprint I-D). */
  ai_contribution: AIContribution.optional(),
  // Chapter maturity. Required per ADR 0051. `draft` chapters are
  // excluded entirely from the student build (no route, no indices,
  // no cross-chapter audit roll-ups); `review` chapters render with a
  // "Under review" badge; `stable` is the steady state.
  status: ChapterStatus,
  /**
   * Optional pedagogical framing declaration (ADR 0063). When set to
   * `"OMI"`, the OF-2 audit invariant requires the chapter to render
   * at least one `<OMIFlow>` callsite.
   */
  framing: ChapterFraming.optional(),
  lang: LangTag.optional(),
  description: z.string().optional(),
  tags: z.array(NonEmptyString).optional(),
  figures: z.record(Slug, FigureSchema).optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;
