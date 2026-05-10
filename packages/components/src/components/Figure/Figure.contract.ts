import type { ComponentContract } from "../../contract/types.ts";
import {
  type FigureInlineProps,
  FigureInlinePropsSchema,
  type FigureRegistryProps,
  FigureRegistryPropsSchema,
} from "./Figure.schema.ts";
import { Figure } from "./Figure.tsx";

/**
 * Inline-mode contract: caller supplies src+alt directly. Pure;
 * `<Figure>` works with no extra wiring.
 */
export const figureInlineContract: ComponentContract<FigureInlineProps> = {
  Component: Figure,
  schema: FigureInlinePropsSchema,
  serialize: (props) => ({
    type: "figure-inline",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section", "callout"],
  forbidsContaining: [],
};

/**
 * Registry-mode contract: caller supplies a name; the consumer page
 * binds the registry via `<Content components={makeStaticComponents({
 * figures })} />` (or by passing `registry` directly to `<Figure>`).
 */
export const figureRegistryContract: ComponentContract<FigureRegistryProps> = {
  Component: Figure,
  schema: FigureRegistryPropsSchema,
  serialize: (props) => ({
    type: "figure-registry",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section", "callout"],
  forbidsContaining: [],
};
