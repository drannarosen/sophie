import type { ComponentContract } from "../../contract/types.ts";
import { type EqRefProps, EqRefPropsSchema } from "./EqRef.schema.ts";
import { EqRef } from "./EqRef.tsx";

/**
 * Contract for `<EqRef>`.
 *
 * Static inline reference component (no IDB persistence, no
 * cross-tab sync). `audit()` stays a stub in PR-C2; PR-C4's audit
 * invariant E4 (undefined `<EqRef slug="X">` references) lands in
 * the project-wide audit, not in this per-component contract — it
 * requires the populated pedagogy index, which the audit pass
 * already has access to.
 *
 * `containedIn` follows the inline-content rule: equation refs
 * appear inside prose, which means inside a section (or
 * paragraph). The build can't always distinguish a paragraph
 * parent from a section parent at the contract level, so we
 * allow both. Mirrors `glossaryTermContract`.
 */
export const eqRefContract: ComponentContract<EqRefProps, null> = {
  Component: EqRef,
  schema: EqRefPropsSchema,
  serialize: (props) => ({ type: "eq-ref", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
