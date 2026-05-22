import type { ComponentContract } from "../../contract/types.ts";
import {
  type SkillReviewProps,
  SkillReviewPropsSchema,
} from "./SkillReview.schema.ts";
import { SkillReview } from "./SkillReview.tsx";

export const skillReviewContract: ComponentContract<SkillReviewProps, null> = {
  Component: SkillReview,
  schema: SkillReviewPropsSchema,
  serialize: (props) => ({
    type: "skill-review",
    props,
    state: null,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
