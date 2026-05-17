import type { EpistemicRole } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<BreaksWhen>` per ADR 0046 +
 * 2026-05-17 design hardening §D1. Optional singleton (one per
 * equation typical); marks the equation's validity-domain boundary —
 * the conditions under which it stops being a useful approximation.
 *
 * Authoring shape:
 *
 * ```mdx
 * <KeyEquation id="wiens-law" title="Wien's Law">
 *   $$\lambda_{peak} = b \, T^{-1}$$
 *
 *   <BreaksWhen>
 *     Non-thermal emission (synchrotron, masers, line emission);
 *     optically-thin sources without thermal coupling.
 *   </BreaksWhen>
 * </KeyEquation>
 * ```
 *
 * Role `"approximation"` per ADR 0058 — `<BreaksWhen>` marks a domain
 * boundary, which is exactly the approximation contract: the equation
 * is an idealization that holds within named conditions.
 */
export const BreaksWhenPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});

export type BreaksWhenProps = z.infer<typeof BreaksWhenPropsSchema>;

/**
 * Hardcoded epistemic role per ADR 0058 §2 pattern 3 + design §D1.
 * See Observable.schema.ts for the `as const satisfies EpistemicRole`
 * rationale (compile-time taxonomy guarantee).
 */
export const BREAKS_WHEN_EPISTEMIC_ROLE =
  "approximation" as const satisfies EpistemicRole;
