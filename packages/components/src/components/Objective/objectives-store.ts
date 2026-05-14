import type { ObjectiveEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Objectives store. Mirrors `chapters-store.ts` / `modules-store.ts`
 * (PR-C4 Task 6): consumer-facing data forwarded by `<TextbookLayout>`
 * from the populated `PedagogyIndex.objectives` collection.
 *
 * v1 has no React consumer for this store — the `/objectives` page is
 * server-rendered Astro that reads the accumulator directly, and no
 * `<ObjectiveRef>` inline-ref component exists yet. The store ships in
 * PR-C4 for pattern uniformity with `__setChapters` / `__setModules`
 * and to anticipate future client-side consumers (PR 7 faceted search,
 * a `<CourseObjectives client:visible>` widget, etc.) without
 * rewiring `<TextbookLayout>` later.
 *
 * Keyed by anchor (`lo-${slugify(id)}`) — anchor is unique within a
 * chapter and the chapter prefix in `PedagogyIndex.objectives` keeps
 * different chapters' objectives distinguishable in the array. Lookup
 * by anchor gives single-objective resolution; consumers wanting
 * chapter-wide rollups continue to read the array directly.
 *
 * Script-tag id: `sophie-pedagogy-objectives`.
 */

export const objectiveStore = createPedagogyStore<ObjectiveEntry>({
  scriptId: "sophie-pedagogy-objectives",
  logTag: "[Objective:objectives]",
  keyOf: (o) => o.anchor,
});

export const __setObjectives = objectiveStore.set;
