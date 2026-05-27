import type { ComponentContract } from "../../contract/types.ts";
import {
  type PracticeProblemProps,
  PracticeProblemPropsSchema,
} from "./PracticeProblem.schema.ts";
import { PracticeProblem } from "./PracticeProblem.tsx";

export const practiceProblemContract: ComponentContract<PracticeProblemProps> =
  {
    Component: PracticeProblem,
    schema: PracticeProblemPropsSchema,
    serialize: (props) => ({
      type: "practice-problem",
      props,
    }),
    audit: () => [],
    containedIn: ["chapter", "section"],
    forbidsContaining: [],
  };
