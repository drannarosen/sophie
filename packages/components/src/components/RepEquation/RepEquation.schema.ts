import { z } from "zod";

/**
 * RepEquation — equation-reference representation child of
 * `<MultiRep>` per ADR 0043 + the 2026-05-17 design hardening.
 *
 * `refKey` points at an existing `<KeyEquation>`'s `eqKey` declared
 * elsewhere in the chapter; `symbol` declares which symbol in that
 * equation represents the bound concept. The pair feeds the MR2
 * audit (symbol must match the registry concept's `canonical_symbol`
 * or alias) and the eventual `<EquationRef>` cross-reference rendering.
 *
 * Optional `equivalent_to` + `via` declare variable-substitution-
 * equivalent forms (Wien's λ-form ↔ ν-form, SI ↔ CGS, dimensional ↔
 * non-dimensional, exact ↔ approximation). Free-form `via` slug at
 * v1; MR6 INFO audit checks that `equivalent_to` resolves to a
 * `<KeyEquation>` in the chapter's equation index or another
 * `<RepEquation>` in the same MultiRep.
 */
export const RepEquationPropsSchema = z.object({
  /** The referenced `<KeyEquation>`'s `eqKey`. */
  refKey: z.string().min(1),
  /** Which symbol in the equation represents this concept. */
  symbol: z.string().min(1),
  /**
   * Optional: declares this equation is a variable-substitution-
   * equivalent form of another `<KeyEquation>` or `<RepEquation>`.
   */
  equivalent_to: z.string().min(1).optional(),
  /**
   * Names the substitution that bridges the two equations
   * (e.g., "planck-substitution", "unit-system-conversion").
   * Free-form slug at v1; no platform catalog.
   */
  via: z.string().min(1).optional(),
});

export type RepEquationProps = z.infer<typeof RepEquationPropsSchema>;
