import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<ChapterRef slug="..." />` or `<ChapterRef slug="...">custom text</ChapterRef>`
 * — inline cross-reference to a chapter in the build-time pedagogy
 * index (PR-C4). Hovers / clicks the trigger to show a popover with
 * the module-breadcrumb + chapter title + (optional) description;
 * clicks navigate to `/chapters/<slug>`.
 *
 * Unlike `<EquationRef>` / `<FigureRef>`, the self-closing default renders
 * the chapter *title* (not an "Eq. N" / "Fig. N" ordinal). Chapters
 * reference *concepts* (named by title); equations and figures
 * reference *positions* (numbered for in-prose lookup). Locked by
 * PR-C4 brainstorm Q6.
 *
 * `slug` matches a `ChapterEntry.slug` directly. Mismatch in PR-C4:
 * graceful fallback (render `children ?? slug` as bare prose; no
 * popover, no link; dev `console.warn`). PR-C4's audit invariant C1
 * elevates this to a build-time error.
 */
export const ChapterRefPropsSchema = z.object({
  /** Chapter slug — must resolve to a `ChapterEntry` in the pedagogy index. */
  slug: z.string().min(1),
  /**
   * Optional link-text override. When omitted (self-closing
   * `<ChapterRef slug="X" />`), renders the chapter title derived
   * from the index entry. When provided, renders the children
   * verbatim (e.g. `<ChapterRef slug="hydrostatic-equilibrium">the
   * pressure-gravity balance</ChapterRef>`). Both modes render the
   * same popover. Locked by PR-C4 brainstorm Q8 (dual-mode parity
   * with EquationRef / FigureRef).
   */
  children: z.custom<ReactNode>().optional(),
});

export type ChapterRefProps = z.infer<typeof ChapterRefPropsSchema>;
