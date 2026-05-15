/**
 * The 7 v1 entity types surfaced by Pagefind search. 'page' arrives
 * from Pagefind's default HTML crawl; the other 6 come from
 * custom-records produced by the converters in
 * `@sophie/astro/lib/pagefind-converters`.
 *
 * Lives in `@sophie/core/schema` (not in either consumer package)
 * because both `@sophie/components` (UI: chip strip labels, card
 * type icons) and `@sophie/astro` (build pipeline: converter
 * registry keys) need to agree on the union. Aligns with ADR 0003
 * schema-as-source-of-truth.
 *
 * Extensibility: when LDS-foundation entities (notation registry,
 * misconception graph, intervention library, teaching moves,
 * equation biography) ship code-side data in Phase 3, add them
 * here AND in `@sophie/astro/lib/pagefind-converters/index.ts`
 * AND in `@sophie/components/src/components/Search/ChipStrip.tsx`.
 */
export type EntityType =
  | "page"
  | "term"
  | "equation"
  | "keyInsight"
  | "figure"
  | "misconception"
  | "objective";
