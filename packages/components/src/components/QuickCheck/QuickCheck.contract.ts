import type { ComponentContract } from "../../contract/types.ts";
import {
  type QuickCheckProps,
  QuickCheckPropsSchema,
} from "./QuickCheck.schema.ts";
import { QuickCheck } from "./QuickCheck.tsx";

export const quickCheckContract: ComponentContract<QuickCheckProps> = {
  Component: QuickCheck,
  schema: QuickCheckPropsSchema,
  serialize: (props) => ({
    type: "quickcheck",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
