import type { ComponentContract } from "../../contract/types.ts";
import { type GridProps, GridPropsSchema } from "./Grid.schema.ts";
import { Grid } from "./Grid.tsx";

export const gridContract: ComponentContract<GridProps> = {
  Component: Grid,
  schema: GridPropsSchema,
  serialize: (props) => ({
    type: "grid",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
