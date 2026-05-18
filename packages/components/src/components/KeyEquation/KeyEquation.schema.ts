import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Named-equation content block per ADR 0060.
 *
 * Renders a Tier-1 card with the full visual hierarchy for a registry-
 * declared equation: framing prose → title bar → `$$tex$$` → biography
 * cards (Observable / Assumption(s) / BreaksWhen / CommonMisuse(s)) →
 * derivation accordion (collapsed by default) → related-equations
 * footer. All canonical data comes from the registry entry resolved
 * by `refId`; chapters only contribute optional framing prose.
 *
 * Post-ADR-0060 schema shape: the old `{ id, title, symbols, children-
 * as-body }` shape is gone. Authors no longer inline equation tex,
 * symbols, or biography children in chapter MDX — those live in
 * `src/content/equations/<id>.mdx`. Chapter side declares one prop
 * (`refId`) plus two render flags (`showDerivation`, `hideRelated`)
 * and optionally chapter-specific framing prose as children.
 */
export const KeyEquationPropsSchema = z.object({
  /** Registry entry id — matches an `EquationEntry.id` in the pedagogy index. */
  refId: z.string().min(1),
  /**
   * Force-expand the derivation-step accordion at render. Default
   * collapsed (most chapters don't need the derivation surfaced).
   * Chapters can opt-in per-callsite via
   * `<KeyEquation refId="..." showDerivation />`.
   */
  showDerivation: z.boolean().optional(),
  /**
   * Suppress the related-equations footer at render. Useful for
   * chapter-internal contexts where cross-refs add noise. Default
   * shows related equations when the registry entry declares any.
   */
  hideRelated: z.boolean().optional(),
  /**
   * Optional chapter-specific framing prose. Renders at the TOP of the
   * card, before the title bar — gives chapter authors a place to set
   * up the equation's role in this specific chapter's argument (e.g.,
   * "We've seen Wien's law before; in this chapter we apply it to
   * dust thermal emission..."). The canonical biography lives in the
   * registry entry, not here.
   */
  children: z.custom<ReactNode>().optional(),
});

export type KeyEquationProps = z.infer<typeof KeyEquationPropsSchema>;
