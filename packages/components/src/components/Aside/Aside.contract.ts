import type { ComponentContract } from "../../contract/types.ts";
import { type AsideProps, AsidePropsSchema } from "./Aside.schema.ts";
import { Aside } from "./Aside.tsx";

/**
 * Contract for `<Aside>`.
 *
 * Static content component (no state). `audit()` is the empty
 * stub — no domain invariants beyond schema validation. If
 * authoring practice surfaces invariants (e.g. "no nested aside",
 * "definition asides require title"), they land here.
 *
 * `forbidsContaining` blocks nested asides + callouts: an aside
 * is itself a margin-note primitive; nesting another inside it
 * is a structural mistake. Chapter-author audit catches this at
 * build time.
 */
export const asideContract: ComponentContract<AsideProps> = {
  Component: Aside,
  schema: AsidePropsSchema,
  serialize: (props) => ({
    type: "aside",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: ["aside", "callout"],
};
