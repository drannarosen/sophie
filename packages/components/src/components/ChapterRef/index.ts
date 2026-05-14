export { chapterRefContract } from "./ChapterRef.contract.ts";
export {
  type ChapterRefProps,
  ChapterRefPropsSchema,
} from "./ChapterRef.schema.ts";
export { ChapterRef } from "./ChapterRef.tsx";
export { __setChapters } from "./chapters-store.ts";
export { __setModules } from "./modules-store.ts";
// NOTE: chapterStore / moduleStore (the lookup-bearing objects) are
// internal (not re-exported), matching the GlossaryTerm / EqRef /
// FigureRef precedent. Consumers go through the React component.
