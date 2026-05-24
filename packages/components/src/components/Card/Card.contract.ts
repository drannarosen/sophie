import type { ComponentContract } from "../../contract/types.ts";
import { type CardProps, CardPropsSchema } from "./Card.schema.ts";
import { Card } from "./Card.tsx";

export const cardContract: ComponentContract<CardProps> = {
  Component: Card,
  schema: CardPropsSchema,
  serialize: (props) => ({
    type: "card",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
