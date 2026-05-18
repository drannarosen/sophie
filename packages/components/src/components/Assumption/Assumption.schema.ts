import { type EpistemicRole, Slug } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<Assumption>` per ADR 0046 +
 * 2026-05-17 design hardening. One of typically several assumptions
 * authored as biography children inside `<KeyEquation>`.
 *
 * Authoring shape (registry MDX body, per ADR 0060):
 *
 * ```mdx
 * ---
 * id: wiens-law
 * title: "Wien's Law"
 * tex: "\\lambda_{peak} = b \\, T^{-1}"
 * ...
 * ---
 *
 * <Assumption type="thermal-equilibrium">
 *   Source is in local thermodynamic equilibrium so the Planck
 *   distribution applies.
 * </Assumption>
 *
 * <Assumption type="blackbody">
 *   Source emits as an ideal blackbody (no spectral lines).
 * </Assumption>
 * ```
 *
 * Chapter MDX cites the registry entry via `<KeyEquation refId="wiens-law">`.
 *
 * `type` is a free-form slug at v1 per design §F1 forward-compat. v2 may
 * promote to an `assumption-index.ts` catalog enum once recurring patterns
 * emerge; v2 will accept `z.enum([...]).or(z.string())` for back-compat.
 */
export const AssumptionPropsSchema = z.object({
  type: Slug.optional(),
  children: z.custom<ReactNode>(),
});

export type AssumptionProps = z.infer<typeof AssumptionPropsSchema>;

/**
 * Hardcoded epistemic role per ADR 0058 §2 pattern 3 + design §D1.
 * See Observable.schema.ts for the `as const satisfies EpistemicRole`
 * rationale (compile-time taxonomy guarantee).
 */
export const ASSUMPTION_EPISTEMIC_ROLE =
  "assumption" as const satisfies EpistemicRole;
