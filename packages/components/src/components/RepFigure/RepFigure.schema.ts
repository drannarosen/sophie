import { z } from "zod";

/**
 * RepFigure — figure-reference representation child of `<MultiRep>`
 * per ADR 0043 + the 2026-05-17 design hardening.
 *
 * `refName` points at an existing `<Figure>` (from the figureRegistry
 * collection) declared elsewhere in the chapter. Optional
 * `symbolLabel` declares the symbol that appears IN the figure (axis
 * label, diagram annotation, etc.) — used by the MR4 INFO audit to
 * check the figure's alt text mentions the concept's `verbal_label`
 * or `canonical_symbol`.
 */
export const RepFigurePropsSchema = z.object({
  /** The referenced `<Figure>`'s `name`. */
  refName: z.string().min(1),
  /** Optional: the symbol label that appears in the figure (for alignment checks). */
  symbolLabel: z.string().min(1).optional(),
});

export type RepFigureProps = z.infer<typeof RepFigurePropsSchema>;
