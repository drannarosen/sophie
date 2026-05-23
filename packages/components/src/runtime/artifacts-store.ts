import type { ArtifactEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "./pedagogy-store.ts";

/**
 * Artifacts store. Per ADR 0067 + Wedge B-followup W2 design doc D1
 * (Path A): consumer-app-owned data forwarded from
 * `getCollection('artifacts')` by `<TextbookLayout>`, surfaced via the
 * shared `createPedagogyStore<T>` factory.
 *
 * Each `ArtifactEntry` is a discriminated union over `scope`:
 *
 *   - `scope: "unit"` — carries `unit_id` + `section_id` (parent refs)
 *     plus the typed Artifact metadata (id, type, title, source_path,
 *     references, optional order). Examples: reading.mdx, slides.mdx,
 *     spec.mdx, rubric.mdx, practice.mdx.
 *
 *   - `scope: "section"` — carries `section_id` only. Examples:
 *     intro.mdx, synthesis.mdx, equation-collection.mdx, practice-set.mdx.
 *
 * Used by `<ChapterRef chapter="…">` to look up the reading artifact
 * by id (W2 D4 1:1 convention: reading-artifact id equals unit id);
 * future `<LectureRef>` and `<ArtifactRef>` consumers read the same
 * way.
 *
 * Lives in `runtime/` rather than under a specific component because
 * Artifacts are platform-wide content metadata, not tied to a single
 * consumer (mirrors `sections-store.ts` + `units-store.ts`).
 *
 * Script-tag id: `sophie-pedagogy-artifacts` — joins the
 * `sophie-pedagogy-*` family established by earlier stores.
 */

export const artifactStore = createPedagogyStore<ArtifactEntry>({
  scriptId: "sophie-pedagogy-artifacts",
  logTag: "[artifacts]",
  keyOf: (a) => a.id,
});

export const __setArtifacts = artifactStore.set;
