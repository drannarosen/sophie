import { z } from "zod";
import { ArtifactSchema } from "../artifact.ts";
import { NonEmptyString } from "../primitives.ts";

/**
 * An artifact entry — one per authored `Artifact` in the consumer's
 * Astro `artifacts` content collection. Populated at SSR-merge time by
 * `TextbookLayout` from `getCollection('artifacts')`; never written by
 * the remark extractor (artifacts are consumer-app-owned, like
 * `sections` / `units` / `figureRegistry`). Per [ADR 0067](../../../../../docs/website/decisions/0067-section-level-artifacts.md).
 *
 * Wedge B-followup (W2) introduces this entry as a discriminated union
 * over `scope`, layering parent-ref fields on top of `ArtifactSchema`:
 *
 * - **scope: `'unit'`** — Unit-level artifacts (reading, slides, spec,
 *   rubric, practice, etc.). Carries `unit_id` (parent Unit's slug) +
 *   `section_id` (grandparent Section's slug). Both required.
 *
 * - **scope: `'section'`** — Section-level artifacts (intro, synthesis,
 *   equation-collection, practice-set, etc.). Carries `section_id` only;
 *   `unit_id` is structurally absent (the section-level artifact lives
 *   directly on its Section).
 *
 * The discriminated union narrows TypeScript inference so consumers
 * reading `entry.unit_id` after `if (entry.scope === 'unit')` get a
 * non-optional `string`.
 *
 * W2 1:1 convention (D4): for unit-scope reading artifacts,
 * `artifact.id === artifact.unit_id` (one reading per Unit). The same
 * string also matches `UnitEntry.chapter` and per-callsite extractor
 * `unit: Slug` field values (W3 rename). Three strings coincide for
 * the common case; future multi-reading Units (worked-example +
 * primary) suffix the artifact id.
 */

const UnitScopedArtifactEntrySchema = ArtifactSchema.extend({
  scope: z.literal("unit"),
  section_id: NonEmptyString,
  unit_id: NonEmptyString,
});

const SectionScopedArtifactEntrySchema = ArtifactSchema.extend({
  scope: z.literal("section"),
  section_id: NonEmptyString,
});

export const ArtifactEntrySchema = z.discriminatedUnion("scope", [
  UnitScopedArtifactEntrySchema,
  SectionScopedArtifactEntrySchema,
]);
export type ArtifactEntry = z.infer<typeof ArtifactEntrySchema>;
