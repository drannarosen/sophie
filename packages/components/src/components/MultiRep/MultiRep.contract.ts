import type { ComponentContract } from "../../contract/types.ts";
import { type MultiRepProps, MultiRepPropsSchema } from "./MultiRep.schema.ts";
import { MultiRep } from "./MultiRep.tsx";

/**
 * MultiRep is content-only; no per-instance state to persist. The
 * `reps` prop is populated by the build-time `transformMultiRep`
 * extractor (PR-γ) walking children; at runtime the parent dispatches
 * over the serialized payloads.
 *
 * Containment per design D2: meaningful at chapter / section level;
 * forbids being nested inside another MultiRep (no recursive
 * binding semantics) or inside a misconception Aside (interventions
 * pair with misconceptions, not concept bindings).
 */
export const multiRepContract: ComponentContract<MultiRepProps, null> = {
  Component: MultiRep,
  schema: MultiRepPropsSchema,
  serialize: (props) => ({
    type: "multirep",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: ["multirep"],
};
