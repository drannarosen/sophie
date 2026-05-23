export { chapterRefContract } from "./ChapterRef.contract.ts";
export {
  type ChapterRefProps,
  ChapterRefPropsSchema,
} from "./ChapterRef.schema.ts";
export { ChapterRef } from "./ChapterRef.tsx";
// W2/D3 — chapters-store + modules-store deleted; ChapterRef reads
// from the W2 stores (artifactStore + unitStore + sectionStore in
// runtime/) directly. __setArtifacts (the W2 graduation of
// __setChapters/__setModules) lives in store-hydration's internal
// subpath and is wired by TextbookLayout, not re-exported here.
