import { NonEmptyString } from "@sophie/core/schema";
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
 *
 * Optional `symbols` per ADR 0043 §R5 + 2026-05-17 design hardening
 * §"PR-δ' bundle": author-declared canonical TeX-form symbol list (not
 * heuristic-extracted from TeX). Surfaces the registry-alignment hook
 * NR1/NR3/NR4 (PR-δ) and the NR2 reference-signal aggregation. v1
 * extractor (PR-γ) passes the prop through to
 * `EquationEntry.symbols`; consumers (audit, AI authoring) read the
 * pedagogy-index field directly. v1 renderer ignores the prop.
 */
export const KeyEquationPropsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  symbols: z.array(NonEmptyString).optional(),
  children: z.custom<ReactNode>(),
});

export type KeyEquationProps = z.infer<typeof KeyEquationPropsSchema>;
