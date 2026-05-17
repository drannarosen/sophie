import { Slug } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<CommonMisuse>` per ADR 0046 +
 * 2026-05-17 design hardening §D1. List entry — typically multiple
 * common misuses per equation.
 *
 * NO own `epistemicRole` const: the linked misconception node
 * (`misconception="<slug>"` cross-ref to ADR 0044's misconception
 * graph) carries `epistemicRole: "misconception"`. This entry
 * inherits the role indirectly via the cross-ref rather than
 * declaring its own. Surfaces the chain "equation has a misuse →
 * misuse links to misconception → misconception has role" without
 * duplicating role data at the link site.
 *
 * Authoring shape:
 *
 * ```mdx
 * <KeyEquation id="wiens-law" title="Wien's Law">
 *   $$\lambda_{peak} = b \, T^{-1}$$
 *
 *   <CommonMisuse misconception="wiens-law-absorption-spectra">
 *     Applying Wien's law to identify the temperature of an
 *     absorption-line spectrum. The peak position depends on the
 *     continuum, not the absorption features.
 *   </CommonMisuse>
 * </KeyEquation>
 * ```
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
