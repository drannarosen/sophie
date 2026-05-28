import type { ComponentContract } from "../../contract/types.ts";
import { type MCQProps, MCQPropsSchema } from "./MCQ.schema.ts";
import { MCQ } from "./MCQ.tsx";

export const mcqContract: ComponentContract<MCQProps, string> = {
  Component: MCQ,
  schema: MCQPropsSchema,
  serialize: (props, state) => ({
    type: "mcq",
    props,
    state,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
