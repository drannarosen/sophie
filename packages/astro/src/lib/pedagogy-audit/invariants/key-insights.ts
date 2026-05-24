import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";
import { checkSlugUnique } from "./_shared/check-slug-unique.ts";

/**
 * Key-insight coverage invariant (K1).
 *
 *   K1 INFO — chapter has zero <KeyInsight>s. Informational — not a
 *             defect. Surfaces in the audit so the author knows which
 *             chapters could benefit from a key-insight callout.
 */
export function checkKeyInsights(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  // W2/D2 graduation: iterate index.units (was index.chapters). The
  // per-callsite KeyInsightEntry still keys by chapter: string whose
  // value equals u.id (W2 D4 1:1 convention); the lookup set is unchanged.
  const chaptersWithKeyInsights = new Set<string>();
  for (const ki of index.keyInsights) chaptersWithKeyInsights.add(ki.unit);
  for (const u of index.units) {
    if (chaptersWithKeyInsights.has(u.id)) continue;
    sink.info.push({
      severity: "INFO",
      code: "K1",
      message: `K1: chapter "${u.id}" has zero <KeyInsight>s. Informational — not a defect.`,
      location: { unit: u.id },
    });
  }
}

/**
 * KI-slug-unique (ADR 0070 W4c D4) — KeyInsight slug uniqueness.
 *
 * Each `KeyInsightEntry.slug` is derived at extraction time
 * (`packages/astro/src/lib/pedagogy-index/extractors/key-insights.ts`):
 * `slugify(title)` when `title` is present, else `${unit}-${anchor}`.
 * Per-Spec-page URLs are `/library/key-insights/<slug>/`, so two
 * entries with the same slug would silently shadow each other at one
 * URL.
 *
 * Severity: ERROR (build-time fail). Authors fix by retitling one of
 * the colliding KeyInsights so its slug derives uniquely.
 *
 * Post-W4c PR 4 (M2): delegates to the shared `checkSlugUnique`
 * helper (`./_shared/check-slug-unique.ts`) — sibling
 * `Misconception-slug-unique` invariant is structurally identical.
 */
export function checkKISlugUnique(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  checkSlugUnique(
    {
      entries: index.keyInsights,
      getKey: (e) => ({
        unit: e.unit,
        anchor: e.anchor,
        slug: e.slug,
        labelValue: e.title,
      }),
      code: "KI-slug-unique",
      componentName: "KeyInsight",
      labelFieldName: "title",
      labelVerb: "retitle",
      urlPath: "key-insights",
    },
    sink
  );
}
