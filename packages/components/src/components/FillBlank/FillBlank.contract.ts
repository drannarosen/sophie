import type { ComponentContract } from "../../contract/types.ts";
import {
  type FillBlankProps,
  FillBlankPropsSchema,
} from "./FillBlank.schema.ts";
import { FillBlank } from "./FillBlank.tsx";

export const fillBlankContract: ComponentContract<FillBlankProps> = {
  Component: FillBlank,
  schema: FillBlankPropsSchema,
  serialize: (props) => ({
    type: "fill-blank",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
