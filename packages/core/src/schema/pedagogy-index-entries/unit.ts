import type { z } from "zod";
import { NonEmptyString } from "../primitives.ts";
import { UnitSchema } from "../unit.ts";

/**
 * A unit entry — one per `Unit` in the consumer's Astro `units` content
 * collection. Populated at SSR-merge time by `TextbookLayout` from
 * `getCollection('units')`. Per [ADR 0067](../../../../../docs/website/decisions/0067-section-level-artifacts.md).
 *
 * Extends `UnitSchema` with three bindings surfaced for the pedagogy
 * index:
 *
 * - `section_id`: parent ref to the containing `Section`'s `slug`.
 *   Powers PRA-1's "same Section or prior Section" prereq lookup and
 *   `<SpacedReview section="…">` rendering's section→chapters traversal.
 *
 * - `chapter` (D7): slug of the **reading artifact** (the chapter-shaped
 *   reading.mdx). "Chapter" = the reading content students study at
 *   home. In W1 this points at the existing chapter MDX slug; W2 keeps
 *   the field but its string value now points at the moved
 *   `sections/<id>/units/<id>/reading.mdx` artifact.
 *
 * - `lecture?` (D7): slug of the **slides artifact** (the lecture-session
 *   slide deck). "Lecture" = the slides delivered in person. Optional
 *   in W1 (smoke has no slides.mdx yet); becomes the binding to
 *   slides.mdx when slides extraction lands (post-W2).
 *
 * Both `chapter` and `lecture` field NAMES are **permanent** — they
 * persist past W2/W3. Only their string values change as the
 * file-layout migration moves artifacts around.
 */
export const UnitEntrySchema = UnitSchema.extend({
  section_id: NonEmptyString,
  chapter: NonEmptyString,
  lecture: NonEmptyString.optional(),
});
export type UnitEntry = z.infer<typeof UnitEntrySchema>;
