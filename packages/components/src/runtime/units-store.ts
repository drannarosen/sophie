import type { UnitEntry } from "@sophie/core/schema";
import { createPedagogyStore } from "./pedagogy-store.ts";

/**
 * Units store. Per ADR 0067 + Wedge B-followup design doc D1 + D7:
 * consumer-app-owned data forwarded from `getCollection('units')` by
 * `<TextbookLayout>`, surfaced via the shared `createPedagogyStore<T>`
 * factory.
 *
 * Each `UnitEntry` carries:
 *   - `section_id`: parent ref to its `SectionEntry.slug`
 *   - `chapter`: binding to the reading artifact (the "chapter" per
 *     W2/D7 vocabulary lock — D7 keeps this field NAME permanently;
 *     W3's per-callsite chapter→unit rename does NOT touch this).
 *   - `lecture?`: optional binding to the slides artifact (the
 *     "lecture")
 *   - `prereqs`: topic_ids the Unit depends on; PRA-1 traverses
 *     these against the same/prior-Section SkillReview coverage set.
 *
 * Used by `<SpacedReview section="…">` to enumerate Units in a given
 * Section (`unitStore.all().filter(u => u.section_id === section)`)
 * and collect their `chapter` slugs for the range-read.
 *
 * Script-tag id: `sophie-pedagogy-units`.
 */

export const unitStore = createPedagogyStore<UnitEntry>({
  scriptId: "sophie-pedagogy-units",
  logTag: "[units]",
  keyOf: (u) => u.id,
});

export const __setUnits = unitStore.set;
