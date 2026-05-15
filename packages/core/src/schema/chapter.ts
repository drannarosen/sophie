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
 * `status: draft` exclusion mechanism lives in
 * `@sophie/astro/lib/get-student-chapters.ts` (`getStudentChapters`).
 */
export const ChapterStatus = z.enum(["draft", "review", "stable"]);
export type ChapterStatus = z.infer<typeof ChapterStatus>;

export const ChapterSchema = z.object({
  title: NonEmptyString,
  slug: Slug,
  // Every chapter belongs to exactly one module (PR 3 design doc).
  module: Slug,
  // Within-module ordering. When omitted, chapters fall back to
  // `title.localeCompare` (see `chaptersForModule`).
  order: z.number().int().nonnegative().optional(),
  // Chapter maturity. Required per ADR 0051. `draft` chapters are
  // excluded entirely from the student build (no route, no indices,
  // no cross-chapter audit roll-ups); `review` chapters render with a
  // "Under review" badge; `stable` is the steady state.
  status: ChapterStatus,
  lang: LangTag.optional(),
  description: z.string().optional(),
  tags: z.array(NonEmptyString).optional(),
  figures: z.record(Slug, FigureSchema).optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;
