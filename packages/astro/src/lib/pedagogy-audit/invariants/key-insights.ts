import type { KeyInsightEntry, PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

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
 * URL. The fallback shape (`${unit}-${anchor}`) is itself globally
 * unique (unit + anchor are both Slugs and the extractor enforces
 * intra-chapter anchor uniqueness), but the title-derived shape is
 * NOT — two KeyInsights in different chapters can share a title, and
 * `slugify("!!!") === "term"` per slugify.ts:19 means any two titles
 * consisting only of non-alphanumerics collapse to the same slug.
 *
 * Severity: ERROR (build-time fail). Authors fix by retitling one of
 * the colliding KeyInsights so its slug derives uniquely.
 *
 * The error message names every colliding `(unit, anchor, title?)`
 * triple so authors can locate each callsite, and explicitly flags
 * the pathological-non-alphanumeric-title cause when the colliding
 * slug is `"term"` (the slugify fallback for empty / non-alnum input)
 * — without that hint the cause is opaque.
 */
export function checkKISlugUnique(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  const bySlug = new Map<string, KeyInsightEntry[]>();
  for (const entry of index.keyInsights) {
    const bucket = bySlug.get(entry.slug);
    if (bucket) {
      bucket.push(entry);
    } else {
      bySlug.set(entry.slug, [entry]);
    }
  }

  for (const [slug, entries] of bySlug) {
    if (entries.length < 2) continue;

    const callsites = entries
      .map((e) => {
        const titlePart =
          e.title !== undefined ? `, title="${e.title}"` : ", title=<absent>";
        return `(unit="${e.unit}", anchor="${e.anchor}"${titlePart})`;
      })
      .join("; ");

    // slugify("!!!") === "term" per slugify.ts:19 — any title composed
    // only of non-alphanumerics collapses to "term". When the colliding
    // slug is "term", surface the offending titles + the cause so the
    // author connects the dots; without this hint the derivation is
    // opaque (the title field is "!!!" but the slug field is "term").
    const isPathologicalTermCollision =
      slug === "term" &&
      entries.some((e) => e.title !== undefined && e.title.trim().length > 0);
    const pathologicalHint = isPathologicalTermCollision
      ? ' Note: slug "term" is the slugify fallback for titles composed only of non-alphanumeric characters (see slugify.ts). The colliding titles slugify to "term" because they contain no [a-z0-9] after lowercasing; retitle them with alphanumeric content to derive distinct slugs.'
      : "";

    sink.errors.push({
      severity: "ERROR",
      code: "KI-slug-unique",
      message: `KI-slug-unique: ${entries.length} <KeyInsight>s derive the same slug "${slug}" — they would shadow each other at /library/key-insights/${slug}/. Colliding callsites: ${callsites}. Resolution: retitle one of the colliding KeyInsights so its slug derives uniquely (slug is slugify(title) when title is present, else \`\${unit}-\${anchor}\`).${pathologicalHint}`,
      location: { anchor: slug },
    });
  }
}
