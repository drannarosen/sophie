import {
  type MisconceptionEntry,
  type PedagogyIndex,
  slugify,
} from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Misconception-slug-unique (W4c Batch 1b, mirrors KI-slug-unique per
 * W4c D4 / ADR 0070) — Misconception slug uniqueness.
 *
 * Each `MisconceptionEntry.slug` is derived at extraction time
 * (`packages/astro/src/lib/pedagogy-index/extractors/misconceptions.ts`):
 * `slugify(label)` when `label` is present, else `${unit}-${anchor}`.
 * Per-Spec-page URLs are `/library/misconceptions/<slug>/` (W4c Batch 7
 * Task 7.2), so two entries with the same slug would silently shadow
 * each other at one URL. The fallback shape (`${unit}-${anchor}`) is
 * itself globally unique (unit + anchor are both Slugs and the
 * extractor enforces intra-chapter anchor uniqueness), but the
 * label-derived shape is NOT — two Misconceptions in different chapters
 * can share a label, and `slugify("!!!") === "term"` per slugify.ts:19
 * means any two labels consisting only of non-alphanumerics collapse
 * to the same slug.
 *
 * Severity: ERROR (build-time fail). Authors fix by relabeling one of
 * the colliding Misconceptions so its slug derives uniquely.
 *
 * The error message names every colliding `(unit, anchor, label?)`
 * triple so authors can locate each callsite, and explicitly flags
 * the pathological-non-alphanumeric-label cause when the colliding
 * slug is `"term"` (the slugify fallback for empty / non-alnum input)
 * — without that hint the cause is opaque.
 */
export function checkMisconceptionSlugUnique(
  index: PedagogyIndex,
  sink: FindingSink
): void {
  const bySlug = new Map<string, MisconceptionEntry[]>();
  for (const entry of index.misconceptions) {
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
        const labelPart =
          e.label !== undefined ? `, label="${e.label}"` : ", label=<absent>";
        return `(unit="${e.unit}", anchor="${e.anchor}"${labelPart})`;
      })
      .join("; ");

    // slugify("!!!") === "term" per slugify.ts:19 — any label composed
    // only of non-alphanumerics collapses to "term". When the colliding
    // slug is "term", surface the offending labels + the cause so the
    // author connects the dots; without this hint the derivation is
    // opaque (the label field is "!!!" but the slug field is "term").
    //
    // Guard: fire ONLY when at least one colliding label slugifies to
    // "term" but is NOT literally "term" — i.e., the cause is the
    // non-alnum collapse, not literal equality. Without this tightening
    // two Misconceptions literally labeled "Term" would falsely trigger
    // the hint (their labels contain alphanumerics; the collision is
    // literal-slug equality, not the fallback path). Same guard pattern
    // as KI-slug-unique M1 fix per Task 2.2 code review.
    const isPathologicalTermCollision =
      slug === "term" &&
      entries.some((e) => {
        const l = e.label?.trim();
        if (!l) return false; // fallback-shape, not slugify-shape
        return slugify(l) === "term" && l.toLowerCase() !== "term";
      });
    const pathologicalHint = isPathologicalTermCollision
      ? ' Note: slug "term" is the slugify fallback for labels composed only of non-alphanumeric characters (see slugify.ts). The colliding labels slugify to "term" because they contain no [a-z0-9] after lowercasing; relabel them with alphanumeric content to derive distinct slugs.'
      : "";

    sink.errors.push({
      severity: "ERROR",
      code: "Misconception-slug-unique",
      message: `Misconception-slug-unique: ${entries.length} <Misconception>s derive the same slug "${slug}" — they would shadow each other at /library/misconceptions/${slug}/. Colliding callsites: ${callsites}. Resolution: relabel one of the colliding Misconceptions so its slug derives uniquely (slug is slugify(label) when label is present, else \`\${unit}-\${anchor}\`).${pathologicalHint}`,
      location: {
        // anchor = slug because no single (unit, anchor) pair is canonical
        // for a cross-unit collision finding; the slug IS the colliding
        // identifier.
        anchor: slug,
      },
    });
  }
}
