import type { ComponentContract } from "../../contract/types.ts";
import {
  type NumericQuestionProps,
  NumericQuestionPropsSchema,
} from "./NumericQuestion.schema.ts";
import { NumericQuestion } from "./NumericQuestion.tsx";

export const numericQuestionContract: ComponentContract<
  NumericQuestionProps,
  string
> = {
  Component: NumericQuestion,
  schema: NumericQuestionPropsSchema,
  serialize: (props, state) => ({
    type: "numeric-question",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
