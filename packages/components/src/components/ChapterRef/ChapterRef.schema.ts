import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<ChapterRef chapter="..." />` or `<ChapterRef chapter="...">custom text</ChapterRef>`
 * — inline cross-reference to a reading-shape chapter in the build-
 * time pedagogy index. Hovers / clicks the trigger to show a popover
 * with the section breadcrumb + unit title + (optional) description;
 * clicks navigate to `/units/<chapter>/reading`.
 *
 * W2/D3 graduation per ADR 0067 + W1 design doc D7:
 *
 * - Prop renamed `slug` → `chapter` to match `UnitEntry.chapter` field
 *   name + the inline-ref convention (`<RetrievalPrompt target>`,
 *   `<SpacedReview chapter>`). The value is the reading-artifact id
 *   (which equals the unit id per W2/D4 1:1 convention).
 *
 * - Lookup chain reads from the W2 stores: `artifactStore.lookup(chapter)`
 *   resolves to the `ArtifactEntry[type=reading]`; `unitStore.lookup(unit_id)`
 *   resolves the parent `UnitEntry`; `sectionStore.lookup(section_id)`
 *   resolves the parent `SectionEntry` for the hover-preview breadcrumb.
 *
 * - Unlike `<EquationRef>` / `<FigureRef>`, the self-closing default
 *   renders the unit *title* (not an "Eq. N" / "Fig. N" ordinal).
 *   Chapters reference *concepts* (named by title); equations and
 *   figures reference *positions* (numbered for in-prose lookup).
 *
 * - `chapter` must resolve to an `ArtifactEntry` in the pedagogy
 *   index. Mismatch: graceful fallback (render `children ?? chapter`
 *   as bare prose; no popover, no link; dev `console.warn`). The
 *   audit invariant C1 elevates this to a build-time error.
 *
 * `<LectureRef lecture="…">` is the future analog for slides
 * artifacts; lands in the wedge that ships slides extraction.
 */
export const ChapterRefPropsSchema = z.object({
  /**
   * Reading-artifact id — must resolve to an `ArtifactEntry[type=reading]`
   * in the pedagogy index. Per W2/D4 1:1 convention, this string equals
   * both `UnitEntry.id` and `UnitEntry.chapter` for unit-bound readings.
   */
  chapter: z.string().min(1),
  /**
   * Optional link-text override. When omitted (self-closing
   * `<ChapterRef chapter="X" />`), renders the unit title derived
   * from the index entry. When provided, renders the children
   * verbatim (e.g. `<ChapterRef chapter="hydrostatic-equilibrium">the
   * pressure-gravity balance</ChapterRef>`). Both modes render the
   * same popover.
   */
  children: z.custom<ReactNode>().optional(),
});

export type ChapterRefProps = z.infer<typeof ChapterRefPropsSchema>;
