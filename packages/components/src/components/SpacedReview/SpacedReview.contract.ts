import type { ComponentContract } from "../../contract/types.ts";
import {
  type SpacedReviewProps,
  SpacedReviewPropsSchema,
} from "./SpacedReview.schema.ts";
import { SpacedReview } from "./SpacedReview.tsx";

export const spacedReviewContract: ComponentContract<SpacedReviewProps, null> =
  {
    Component: SpacedReview,
    schema: SpacedReviewPropsSchema,
    serialize: (props) => ({
      type: "spaced-review",
      props,
      state: null,
    }),
    audit: () => [],
    containedIn: ["chapter", "section"],
    forbidsContaining: [],
  };
