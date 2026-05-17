import type { ComponentContract } from "../../contract/types.ts";
import {
  type CommonMisuseProps,
  CommonMisusePropsSchema,
} from "./CommonMisuse.schema.ts";
import { CommonMisuse } from "./CommonMisuse.tsx";

export const commonMisuseContract: ComponentContract<CommonMisuseProps, null> =
  {
    Component: CommonMisuse,
    schema: CommonMisusePropsSchema,
    serialize: (props) => ({
      type: "common-misuse",
      props,
      state: null,
    }),
    audit: () => [],
    containedIn: ["key-equation"],
    forbidsContaining: [],
  };
