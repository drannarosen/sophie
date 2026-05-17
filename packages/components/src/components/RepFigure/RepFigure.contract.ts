import type { ComponentContract } from "../../contract/types.ts";
import {
  type RepFigureProps,
  RepFigurePropsSchema,
} from "./RepFigure.schema.ts";
import { RepFigure } from "./RepFigure.tsx";

export const repFigureContract: ComponentContract<RepFigureProps, null> = {
  Component: RepFigure,
  schema: RepFigurePropsSchema,
  serialize: (props) => ({
    type: "rep-figure",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["multirep"],
  forbidsContaining: [],
};
