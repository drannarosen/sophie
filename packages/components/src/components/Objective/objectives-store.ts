import type { ObjectiveEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "../../runtime/pedagogy-store.ts";

/**
 * Objectives store. Mirrors `sections-store.ts` / `units-store.ts` /
 * `artifacts-store.ts` (W1 + W2 graduations): consumer-facing data
 * forwarded by `<TextbookLayout>` from the populated
 * `PedagogyIndex.objectives` collection.
 *
 * v1 has no React consumer for this store — the `/library/objectives` page is
 * server-rendered Astro that reads the accumulator directly, and no
 * `<ObjectiveRef>` inline-ref component exists yet. The store ships
 * for pattern uniformity with `__setSections` / `__setUnits` /
 * `__setArtifacts` and to anticipate future client-side consumers
 * (PR 7 faceted search, a `<CourseObjectives client:visible>` widget,
 * etc.) without rewiring `<TextbookLayout>` later.
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
