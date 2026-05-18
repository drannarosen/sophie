import type { EpistemicRole } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<DerivationStep>` — a biography
 * child of the equation registry's MDX body per ADR 0046 §R9 (added
 * by the ADR 0060 registry-ecosystem brainstorm, 2026-05-18).
 *
 * Authoring shape (inside `src/content/equations/<id>.mdx` body):
 *
 * ```mdx
 * <DerivationStep label="Differentiate and set to zero">
 *   Solve $\partial B_\lambda / \partial \lambda = 0$ for the peak.
 * </DerivationStep>
 * ```
 *
 * Multiple `<DerivationStep>` children compose an equation's
 * derivation. Each step has prose body + optional short `label` (the
 * step's title — e.g., "Start from Planck's law"). Renders as a
 * Tier-3 chrome card inside a collapsible accordion at the consumer
 * end; chapter authors force-expand via `<KeyEquation refId="..."
 * showDerivation />`.
 */
export const DerivationStepPropsSchema = z.object({
  /** Optional short label rendered next to "Step" in the card header. */
  label: z.string().min(1).optional(),
  children: z.custom<ReactNode>(),
});

export type DerivationStepProps = z.infer<typeof DerivationStepPropsSchema>;

/**
 * Hardcoded epistemic role per ADR 0046 §R9 + ADR 0058 §2 pattern 3.
 * The derivation IS part of the model-construction trace; each step
 * extends the model toward its final form, so the role binding is
 * `"model"` (locked via `as const satisfies EpistemicRole` so a
 * future taxonomy edit that removes the value fails type-check
 * before the build runs).
 */
export const DERIVATION_STEP_EPISTEMIC_ROLE =
  "model" as const satisfies EpistemicRole;
