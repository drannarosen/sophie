import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<EquationRef refId="..." />` or
 * `<EquationRef refId="...">custom text</EquationRef>` — inline cross-
 * reference to a `<KeyEquation>` declared in the equation registry
 * (`src/content/equations/<id>.mdx`). Hovers / clicks the trigger to
 * show a popover with the equation's title + KaTeX-rendered display
 * math + optional biography summary; clicks navigate to the registry
 * page at `/equations/<id>` (per ADR 0060's registry-route convention).
 *
 * Renamed from `<EqRef>` in Batch 5 (PR-A) per ADR 0060: the registry
 * ecosystem's reference primitive is `<XxxRef refId>`, consistently
 * named for every registry type (equations, figures, etc.). The
 * `slug` field renamed to `refId` for symmetry with `<KeyEquation
 * refId>` and the brainstorm-locked `<RegistryRef collection refId>`
 * pattern.
 *
 * `refId` matches an `EquationEntry.id` directly (no slugify pass;
 * authors write semantic ids that the registry validates). Mismatch
 * surfaces as a dev `console.warn` plus a bare-prose fallback; build-
 * time audit invariant R1 elevates this to an error in a later batch.
 */
export const EquationRefPropsSchema = z.object({
  /** Registry entry id — matches an `EquationEntry.id` in the pedagogy index. */
  refId: z.string().min(1),
  /**
   * Optional link-text override. When omitted (self-closing
   * `<EquationRef refId="X" />`), renders the equation's `title` from
   * the registry entry. When provided, renders the children verbatim
   * (e.g. `<EquationRef refId="wiens-law">Wien's law</EquationRef>`).
   * Both modes render the same popover.
   */
  children: z.custom<ReactNode>().optional(),
});

export type EquationRefProps = z.infer<typeof EquationRefPropsSchema>;
