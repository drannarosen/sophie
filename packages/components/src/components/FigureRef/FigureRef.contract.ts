import type { ComponentContract } from "../../contract/types.ts";
import {
  type FigureRefProps,
  FigureRefPropsSchema,
} from "./FigureRef.schema.ts";
import { FigureRef } from "./FigureRef.tsx";

/**
 * Contract for `<FigureRef>`.
 *
 * Static inline reference component (no IDB persistence, no
 * cross-tab sync). `audit()` stays a stub in PR-C3; PR-C4's audit
 * invariant for undefined `<FigureRef name="X">` references lands
 * in the project-wide audit, not in this per-component contract —
 * it requires the populated pedagogy index, which the audit pass
 * already has access to.
 *
 * `containedIn` follows the inline-content rule: figure refs
 * appear inside prose, which means inside a section (or
 * paragraph). The build can't always distinguish a paragraph
 * parent from a section parent at the contract level, so we
 * allow both. Mirrors `glossaryTermContract` and `eqRefContract`.
 */
export const figureRefContract: ComponentContract<FigureRefProps, null> = {
  Component: FigureRef,
  schema: FigureRefPropsSchema,
  serialize: (props) => ({ type: "figure-ref", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
