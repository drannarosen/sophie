import type { ComponentContract } from "../../contract/types.ts";
import {
  type EquationRefProps,
  EquationRefPropsSchema,
} from "./EquationRef.schema.ts";
import { EquationRef } from "./EquationRef.tsx";

/**
 * Contract for `<EquationRef>` per ADR 0060.
 *
 * Static inline reference component (no IDB persistence, no
 * cross-tab sync). `audit()` stays a stub; build-time invariant R1
 * (refId resolves to a registry entry) lands in the project-wide
 * audit, not in this per-component contract.
 *
 * `containedIn` follows the inline-content rule: equation refs
 * appear inside prose, which means inside a section (or
 * paragraph). The build can't always distinguish a paragraph
 * parent from a section parent at the contract level, so we
 * allow both. Mirrors `glossaryTermContract`.
 */
export const equationRefContract: ComponentContract<EquationRefProps, null> = {
  Component: EquationRef,
  schema: EquationRefPropsSchema,
  serialize: (props) => ({ type: "equation-ref", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
