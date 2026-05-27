import type { ComponentContract } from "../../contract/types.ts";
import { type VideoProps, VideoPropsSchema } from "./Video.schema.ts";
import { Video } from "./Video.tsx";

/**
 * Contract for `<Video>`.
 *
 * Static content component (no persistence, no React island). Per
 * ADR 0058 §R-0080-A2, `<Video>` is chrome (not pedagogy) — usable in
 * both chapter MDX and course-info prose. No epistemic role declared.
 *
 * `audit()` is the empty stub; schema validation (provider→source
 * contract via the `.refine()` in `Video.schema.ts`) carries the
 * authoring invariant.
 *
 * `containedIn` lists chapter + section. `course-info` prose is a
 * supported call site per ADR 0058 §R-0080-A2 but is not declared
 * here: the contract's container-id vocabulary has no `course-info`
 * value in use (W2 — `containedIn` is currently advisory, not
 * enforced for course-info prose; matches `<Aside>`'s shape).
 * Widen the array when an enforcement consumer needs the distinction.
 *
 * No `forbidsContaining` — `<Video>` is a leaf primitive.
 */
export const videoContract: ComponentContract<VideoProps> = {
  Component: Video,
  schema: VideoPropsSchema,
  serialize: (props) => ({
    type: "video",
    props,
  }),
  audit: () => [],
  containedIn: ["chapter", "section"],
};
