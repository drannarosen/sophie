import type { ComponentContract } from "../../contract/types.ts";
import {
  type CollapsibleCardProps,
  CollapsibleCardPropsSchema,
} from "./CollapsibleCard.schema.ts";
import { CollapsibleCard } from "./CollapsibleCard.tsx";

export const collapsibleCardContract: ComponentContract<
  CollapsibleCardProps,
  boolean
> = {
  Component: CollapsibleCard,
  schema: CollapsibleCardPropsSchema,
  serialize: (props, state) => ({
    type: "collapsible-card",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
