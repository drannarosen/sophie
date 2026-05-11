import type { ComponentContract } from "../../contract/types.ts";
import {
  type MiniGlossaryProps,
  MiniGlossaryPropsSchema,
} from "./MiniGlossary.schema.ts";
import { MiniGlossary } from "./MiniGlossary.tsx";

// MiniGlossary is content-only. There's no per-instance state to
// serialize; `state` is `null`. Mirrors KeyEquation/Figure shape.
export const miniGlossaryContract: ComponentContract<MiniGlossaryProps, null> =
  {
    Component: MiniGlossary,
    schema: MiniGlossaryPropsSchema,
    serialize: (props) => ({
      type: "mini-glossary",
      props,
      state: null,
    }),
    audit: () => [],
    containedIn: ["chapter", "section"],
    forbidsContaining: [],
  };
