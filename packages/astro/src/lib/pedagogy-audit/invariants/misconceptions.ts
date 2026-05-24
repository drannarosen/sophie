import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";
import { checkSlugUnique } from "./_shared/check-slug-unique.ts";

/**
 * Misconception-slug-unique (W4c Batch 1b, mirrors KI-slug-unique per
 * W4c D4 / ADR 0070) — Misconception slug uniqueness.
 *
 * Each `MisconceptionEntry.slug` is derived at extraction time
 * (`packages/astro/src/lib/pedagogy-index/extractors/misconceptions.ts`):
 * `slugify(label)` when `label` is present, else `${unit}-${anchor}`.
 * Per-Spec-page URLs are `/library/misconceptions/<slug>/` (W4c Batch 7
 * Task 7.2), so two entries with the same slug would silently shadow
 * each other at one URL.
 *
 * Severity: ERROR (build-time fail). Authors fix by relabeling one of
 * the colliding Misconceptions so its slug derives uniquely.
 *
 * Post-W4c PR 4 (M2): delegates to the shared `checkSlugUnique`
 * helper (`./_shared/check-slug-unique.ts`) — sibling `KI-slug-unique`
 * invariant is structurally identical.
 */
export function checkMisconceptionSlugUnique(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  checkSlugUnique(
    {
      entries: index.misconceptions,
      getKey: (e) => ({
        unit: e.unit,
        anchor: e.anchor,
        slug: e.slug,
        labelValue: e.label,
      }),
      code: "Misconception-slug-unique",
      componentName: "Misconception",
      labelFieldName: "label",
      labelVerb: "relabel",
      urlPath: "misconceptions",
    },
    sink
  );
}
