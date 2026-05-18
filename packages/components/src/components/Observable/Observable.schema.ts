import type { EpistemicRole } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<Observable>` — the first biography
 * child of `<KeyEquation>` per ADR 0046 + 2026-05-17 design hardening
 * §D1 (explicit `epistemicRole` const per biography component, ADR 0058 §2
 * pattern 3 — child-component role declaration).
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
 * <Observable>
 *   Peak wavelength of thermal emission as a function of temperature.
 * </Observable>
 * ```
 *
 * One Observable typical per equation; PR-γ extractor enforces the
 * singleton shape into the pedagogy-index entry. Renders below the
 * equation body in the KeyEquation card. Chapter MDX cites the registry
 * entry via `<KeyEquation refId="wiens-law">`.
 */
export const ObservablePropsSchema = z.object({
  children: z.custom<ReactNode>(),
});

export type ObservableProps = z.infer<typeof ObservablePropsSchema>;

/**
 * Hardcoded epistemic role per ADR 0058 §2 pattern 3 + design §D1.
 * `as const satisfies EpistemicRole` gives a narrow literal type while
 * guaranteeing at compile time that the literal is a valid member of the
 * canonical 8-role taxonomy — removing `"observable"` from
 * `EPISTEMIC_ROLES` would fail this assertion before the build runs.
 * Surfaces to the pedagogy-index via the PR-γ extractor.
 */
export const OBSERVABLE_EPISTEMIC_ROLE =
  "observable" as const satisfies EpistemicRole;
