import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<FigureRef name="..." />` or `<FigureRef name="...">custom text</FigureRef>`
 * — inline cross-reference to a `<Figure name="...">` in the
 * build-time pedagogy index. Hovers / clicks the trigger to show a
 * popover with a thumbnail + caption; clicks navigate to the
 * canonical figure usage in its source chapter (per ADR 0038's
 * role-aggregation principle + PR-C3 design decisions #3 and #6).
 *
 * `name` matches a `FigureRegistryEntry.name` directly (flat
 * registry namespace; no slugify pass). Mismatch in PR-C3:
 * graceful fallback (render `children` as bare prose, no popover,
 * no link, dev `console.warn`). PR-C4 elevates this to a build-time
 * error.
 */
export const FigureRefPropsSchema = z.object({
  /** Registry key — must resolve to a FigureRegistryEntry. */
  name: z.string().min(1),
  /**
   * Optional link-text override. When omitted (self-closing
   * `<FigureRef name="X" />`), renders `Fig. <number>` derived
   * from the canonical usage's per-chapter number. When provided,
   * renders the children verbatim (e.g.
   * `<FigureRef name="m51">this comparison</FigureRef>`). Both
   * modes render the same popover.
   */
  children: z.custom<ReactNode>().optional(),
});

export type FigureRefProps = z.infer<typeof FigureRefPropsSchema>;
