import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `ChapterSectionSchema` — a chapter-internal section heading (the
 * H2-anchor concept used by the pedagogy-index extractor for
 * in-page navigation + cross-references). Carries `id` (anchor slug)
 * + `heading` (visible text).
 *
 * Distinct from the course-level [`SectionSchema`](./section.ts)
 * (per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md)),
 * which is a discriminated union over module / phase / track /
 * unit-block / bridge variants and groups Units into the course's
 * content hierarchy.
 *
 * Renamed from the prior `SectionSchema` (Wedge A.5, 2026-05-21) to
 * clear the "Section" name for ADR 0067's meaning.
 */
export const ChapterSectionSchema = z.object({
  id: Slug,
  heading: NonEmptyString,
});

export type ChapterSection = z.infer<typeof ChapterSectionSchema>;
