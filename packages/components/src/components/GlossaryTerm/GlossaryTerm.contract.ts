import type { ComponentContract } from "../../contract/types.ts";
import {
  type GlossaryTermProps,
  GlossaryTermPropsSchema,
} from "./GlossaryTerm.schema.ts";
import { GlossaryTerm } from "./GlossaryTerm.tsx";

/**
 * Contract for `<GlossaryTerm>`.
 *
 * Static inline reference component (no IDB persistence, no
 * cross-tab sync). `audit()` stays a stub in PR-C1; PR-C4's
 * invariant #4 (undefined `<GlossaryTerm name="X">` references)
 * lands in the project-wide audit, not in this per-component
 * contract — it requires the populated pedagogy index, which the
 * audit pass already has access to.
 *
 * `containedIn` follows the inline-content rule: glossary terms
 * appear inside prose, which means inside a section (or
 * paragraph). The build can't always distinguish a paragraph
 * parent from a section parent at the contract level, so we
 * allow both.
 */
export const glossaryTermContract: ComponentContract<GlossaryTermProps> = {
  Component: GlossaryTerm,
  schema: GlossaryTermPropsSchema,
  serialize: (props) => ({
    type: "glossary-term",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
