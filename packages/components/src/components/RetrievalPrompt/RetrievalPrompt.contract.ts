import type { ComponentContract } from "../../contract/types.ts";
import {
  type RetrievalPromptProps,
  RetrievalPromptPropsSchema,
} from "./RetrievalPrompt.schema.ts";
import { RetrievalPrompt } from "./RetrievalPrompt.tsx";

export const retrievalPromptContract: ComponentContract<
  RetrievalPromptProps,
  null
> = {
  Component: RetrievalPrompt,
  schema: RetrievalPromptPropsSchema,
  serialize: (props) => ({
    type: "retrieval-prompt",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
