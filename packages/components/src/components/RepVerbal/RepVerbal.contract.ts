import type { ComponentContract } from "../../contract/types.ts";
import {
  type RepVerbalProps,
  RepVerbalPropsSchema,
} from "./RepVerbal.schema.ts";
import { RepVerbal } from "./RepVerbal.tsx";

/**
 * RepVerbal is content-only. State is `null` (no per-instance
 * persistence). Containment: only meaningful as a child of
 * `<MultiRep>` (the extractor walks RepVerbal children; standalone
 * usage outside `<MultiRep>` is an authoring error MR1 catches at
 * audit time when `<MultiRep>` is absent or `concept` doesn't
 * resolve).
 */
export const repVerbalContract: ComponentContract<RepVerbalProps, null> = {
  Component: RepVerbal,
  schema: RepVerbalPropsSchema,
  serialize: (props) => ({
    type: "rep-verbal",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["multirep"],
  forbidsContaining: [],
};
