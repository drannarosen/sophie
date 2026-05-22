import type { z } from "zod";
import { SectionSchema } from "../section.ts";

/**
 * A section entry — one per top-level course Section in the consumer's
 * Astro `sections` content collection. Populated at SSR-merge time by
 * `TextbookLayout` from `getCollection('sections')`; never written by
 * the remark extractor (sections are consumer-app-owned, like
 * `chapters` / `modules` / `figureRegistry`). Per [ADR 0067](../../../../../docs/website/decisions/0067-section-level-artifacts.md).
 *
 * Wedge B-followup (W1) introduces this entry as a verbatim alias of
 * `SectionSchema`; no extra index-specific fields are needed because
 * Section data is intrinsically navigation-shaped (slug + title + type
 * + order). Future fields (e.g., derived `unit_count`) attach here
 * when earned by a concrete audit / UI consumer.
 *
 * `SectionEntry` IS `Section` (discriminated union over `type`:
 * `module` | `phase` | `track` | `unit-block` | `bridge`). The alias
 * makes the pedagogy-index-entries barrel composable with sibling
 * entries — `ChapterEntry`, `ModuleEntry`, `UnitEntry`, etc. — without
 * having to import `SectionSchema` directly from `../section.ts`
 * everywhere consumers reach for it.
 */
export const SectionEntrySchema = SectionSchema;
export type SectionEntry = z.infer<typeof SectionEntrySchema>;
