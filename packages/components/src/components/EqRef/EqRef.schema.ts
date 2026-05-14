import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<EqRef slug="..." />` or `<EqRef slug="...">custom text</EqRef>` —
 * inline cross-reference to a `<KeyEquation>` in the build-time
 * pedagogy index. Hovers / clicks the trigger to show a popover
 * with the equation's title + KaTeX-rendered display math; clicks
 * navigate to the canonical KeyEquation in its source chapter
 * (per ADR 0038's role-aggregation principle + the locked PR-C2
 * overview).
 *
 * `slug` matches an `EquationEntry.slug` directly (no slugify pass;
 * authors write semantic ids that the extractor preserves). Mismatch
 * in PR-C2: graceful fallback (render `children` as bare prose, no
 * popover, no link, dev `console.warn`). PR-C4 elevates this to a
 * build-time error (audit invariant E4).
 */
export const EqRefPropsSchema = z.object({
  /** Canonical slug — matches an `EquationEntry.slug` in the pedagogy index. */
  slug: z.string().min(1),
  /**
   * Optional link-text override. When omitted (self-closing
   * `<EqRef slug="X" />`), renders `Eq. <number>` derived from the
   * index entry's per-chapter number. When provided, renders the
   * children verbatim (e.g. `<EqRef slug="wiens-law">Wien's
   * law</EqRef>`). Both modes render the same popover.
   */
  children: z.custom<ReactNode>().optional(),
});

export type EqRefProps = z.infer<typeof EqRefPropsSchema>;
