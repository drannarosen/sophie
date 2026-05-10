import type { ComponentContract } from "../../contract/types.ts";
import { type FigureProps, FigurePropsSchema } from "./Figure.schema.ts";
import { Figure } from "./Figure.tsx";

export const figureContract: ComponentContract<FigureProps> = {
  Component: Figure,
  schema: FigurePropsSchema,
  serialize: (props) => ({
    type: "figure",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section", "callout"],
  forbidsContaining: [],
};
