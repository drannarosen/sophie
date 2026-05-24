import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Chrome primitive — pure SSR layout container. Lays out children in a
 * CSS Grid with 1–4 columns. Each child is wrapped in an `<li>`; the
 * root is `<ul>`. NOT a landmark — the `<ul>` / `<li>` pair supplies
 * `role="list"` / `role="listitem"` implicitly (Biome
 * `useSemanticElements` + `noRedundantRoles` precluded the explicit-
 * role-on-div pattern). The R10 non-landmark choice stands:
 * `<section aria-labelledby>` is reserved for named regions; a chrome
 * grid has no inherent name.
 *
 * Strict chrome — no `epistemicRole` (ADR 0058 permits optional
 * omission for non-pedagogy components).
 */
export const GridPropsSchema = z.object({
  /** Number of grid columns (1–4). Responsive collapses to 1 at <640px. */
  cols: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  /** Collapse to one column at <640px viewports. Default `true`. */
  responsive: z.boolean().optional(),
  /** Inter-cell gap. Maps to `--sophie-space-{2|3|4}`. Default `"md"`. */
  gap: z.enum(["sm", "md", "lg"]).optional(),
  /** Optional anchor id; lands on the root element. */
  id: z.string().optional(),
  /** Optional extra class — concatenated with the grid root class. */
  className: z.string().optional(),
  /** Grid cells. Each non-null child becomes an `<li>` (implicit `role="listitem"`). */
  children: z.custom<ReactNode>(),
});

export type GridProps = z.infer<typeof GridPropsSchema>;
