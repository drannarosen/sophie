import type { ReactNode } from "react";
import { z } from "zod";

/**
 * `<GlossaryTerm name="...">term</GlossaryTerm>` — inline reference
 * to a definition in the build-time pedagogy index. Hovers / clicks
 * the trigger show a popover with the definition body; clicks
 * navigate to the canonical aside in its source chapter (per ADR
 * 0038's role-aggregation principle + the locked Bucket C overview).
 *
 * `name` is matched to a `DefinitionEntry.slug` via `slugify(name)`.
 * Mismatch in PR-C1: graceful fallback (render bare prose, no
 * popover, no link, console.warn in dev). PR-C4 elevates this to a
 * build-time error (audit invariant #4).
 */
export const GlossaryTermPropsSchema = z.object({
  /** Canonical term name; matched to a definition by `slugify(name)`. */
  name: z.string().min(1),
  /** The displayed term text in the surrounding prose. Often
   * identical to `name`, but may differ to handle plurals or
   * inflected forms (e.g. name="Parallax", children="parallaxes"). */
  children: z.custom<ReactNode>(),
});
export type GlossaryTermProps = z.infer<typeof GlossaryTermPropsSchema>;
