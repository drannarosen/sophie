import { EpistemicRoleSchema } from "@sophie/core/schema";
import { z } from "zod";

/**
 * Props for `<Figure>` — the root chrome primitive of `@sophie/figures-kit`.
 *
 * Wraps `<figure>` with the universal layout slot contract:
 *   FigureTitle? → FigureControls? → FigureBody? → FigureFooter? → FigureCaption?
 *
 * Per ADR 0058, the optional `role` prop carries the epistemic role for
 * the figure as a whole; it surfaces in the DOM as
 * `data-epistemic-role="<role>"` so downstream CSS (and pedagogy-audit
 * per ADR 0038) can key on it without depending on inner panels.
 *
 * Accessibility: every `<Figure>` MUST be labelled — either via an
 * `aria-labelledby` prop pointing at a heading id inside the figure,
 * or (in Phase B.2 onward) automatically by composing `<FigureTitle>`
 * or `<FigureCaption>` as children.
 */
export const FigurePropsSchema = z.object({
  /** DOM id for the `<figure>` element. Must be non-empty. */
  id: z.string().min(1),

  /**
   * Optional epistemic role for the figure as a whole (ADR 0058).
   * Surfaces as `data-epistemic-role` on the rendered `<figure>`.
   *
   * Named `epistemicRole` (not `role`) to avoid a JSX-prop collision
   * with the standard ARIA `role` attribute — both biome's
   * `a11y/useValidAriaRole` lint rule and human readers would
   * otherwise misread `role="model"` as an attempted ARIA role.
   * The convention extends to `<FigurePanel>` and `<Readout>` in
   * later Phase B / C commits.
   */
  epistemicRole: EpistemicRoleSchema.optional(),
});

export type FigureProps = z.infer<typeof FigurePropsSchema>;
