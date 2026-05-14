import type { ComponentContract } from "../../contract/types.ts";
import {
  type ChapterRefProps,
  ChapterRefPropsSchema,
} from "./ChapterRef.schema.ts";
import { ChapterRef } from "./ChapterRef.tsx";

/**
 * Contract for `<ChapterRef>`.
 *
 * Static inline reference component (no IDB persistence, no
 * cross-tab sync). `audit()` stays a stub in PR-C4 Task 5; the
 * `<ChapterRef slug="X">`-references-unknown-chapter case (audit
 * invariant C1) lands in the project-wide build audit, not in this
 * per-component contract — it requires the populated pedagogy
 * index, which the audit pass has access to.
 *
 * `containedIn` follows the inline-content rule: chapter refs
 * appear inside prose, which means inside a section (or
 * paragraph). The build can't always distinguish a paragraph
 * parent from a section parent at the contract level, so we
 * allow both. Mirrors `glossaryTermContract`, `eqRefContract`, and
 * `figureRefContract`.
 */
export const chapterRefContract: ComponentContract<ChapterRefProps, null> = {
  Component: ChapterRef,
  schema: ChapterRefPropsSchema,
  serialize: (props) => ({ type: "chapter-ref", props, state: null }),
  audit: () => [],
  containedIn: ["chapter", "section"],
  forbidsContaining: [],
};
