import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Named-equation content block. Substantive content with framing prose,
 * the equation itself as MDX-rendered KaTeX, variable definitions, and
 * key insights. Distinct from inline `$$...$$` blocks (bare KaTeX) and
 * from Callouts (tangential notes).
 *
 * Content-only: no `course/chapter` props, no persistence, no
 * `client:load` directive in MDX — flows through Astro's static
 * `<Content components={...}>` map.
 *
 * Required `id` for stable hash anchors (`#wiens-law`) and future
 * cross-references ("See Equation: Wien's Law").
 */
export const KeyEquationPropsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  children: z.custom<ReactNode>(),
});

export type KeyEquationProps = z.infer<typeof KeyEquationPropsSchema>;
