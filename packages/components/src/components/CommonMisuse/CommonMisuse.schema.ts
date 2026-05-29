import { type EpistemicRole, Slug } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<CommonMisuse>` per ADR 0046 +
 * 2026-05-17 design hardening §D1. List entry — typically multiple
 * common misuses per equation.
 *
 * Declares `epistemicRole: "misconception"` (domain pass 2026-05-29,
 * ADR 0058 §R-domain-pass). `<CommonMisuse>` is a role-bearing biography
 * LEAF, not a pointer: it *states* a misuse in its own children, and the
 * `misconception=` cross-ref to ADR 0044's graph is OPTIONAL. An earlier
 * design declared no role and "inherited" it via that link — but because
 * the cross-ref is optional (PR-δ E9 is an INFO nudge, not required), that
 * lost role data exactly when the author hadn't wired the link. The
 * component's CATEGORY role is `misconception` regardless; the cross-ref
 * adds INSTANCE specificity (which misconception), it does not supply the
 * role. So it declares its own role like its sibling biography children
 * (Observable/Assumption/BreaksWhen/DerivationStep). The chain "equation
 * has a misuse → misuse links to misconception node" still surfaces via
 * the optional cross-ref when present.
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
 * <Observable>...</Observable>
 * <Assumption>...</Assumption>
 *
 * <CommonMisuse misconception="wiens-law-absorption-spectra">
 *   Applying Wien's law to identify the temperature of an
 *   absorption-line spectrum. The peak position depends on the
 *   continuum, not the absorption features.
 * </CommonMisuse>
 * ```
 *
 * Chapter MDX cites the registry entry via `<KeyEquation refId="wiens-law">`.
 *
 * `misconception` is optional at v1; PR-δ E9 INFO nudges authors
 * toward populating the cross-ref. When supplied, the audit (PR-δ
 * E9) walks the misconception graph to verify the slug resolves.
 */
export const CommonMisusePropsSchema = z.object({
  misconception: Slug.optional(),
  children: z.custom<ReactNode>(),
});

export type CommonMisuseProps = z.infer<typeof CommonMisusePropsSchema>;

/**
 * Hardcoded epistemic role per ADR 0058 §2 pattern 3 (child-component role
 * declaration). `as const satisfies EpistemicRole` narrows to the literal
 * while compile-time-guaranteeing membership in the canonical 8-role
 * taxonomy — removing `"misconception"` from `EPISTEMIC_ROLES` would fail
 * this assertion before the build runs. Surfaces to the pedagogy-index via
 * the PR-δ extractor. See the file docblock for declare-vs-inherit rationale.
 */
export const COMMON_MISUSE_EPISTEMIC_ROLE =
  "misconception" as const satisfies EpistemicRole;
