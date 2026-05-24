import { slugify } from "@sophie/core/schema";
import type { FindingSink } from "../../types.ts";

/**
 * Shared helper for slug-uniqueness audit invariants. Detects cross-
 * unit slug collisions that would cause two registry entries to
 * shadow each other at the same per-Spec-page URL.
 *
 * Used by:
 *   - `checkKISlugUnique` (KI-slug-unique, ADR 0070 W4c D4)
 *   - `checkMisconceptionSlugUnique` (W4c Batch 1b)
 *
 * Both invariants follow the identical shape: walk one entry kind,
 * group by `slug`, emit one ERROR per group of size ≥ 2 naming every
 * colliding callsite. The only differences are the entry type, the
 * per-entry label field name (`title` vs `label`), the finding code,
 * and the message strings. Extracted post-W4c PR 4 (M2) after the
 * 2nd caller paid for the abstraction. Pre-extraction the 2 invariant
 * files were ~95 lines each with structurally identical code; this
 * helper is the single source of truth + each invariant becomes a
 * ~10-line config wrapper.
 *
 * Severity is always ERROR (build-time fail). The error message
 * names every colliding `(unit, anchor, label?)` triple so authors
 * can locate each callsite, and explicitly flags the
 * pathological-non-alphanumeric-label cause when the colliding slug
 * is `"term"` (the slugify fallback for empty / non-alnum input) —
 * without that hint the cause is opaque.
 */

interface SlugUniqueEntryFields {
  unit: string;
  anchor: string;
  slug: string;
  /** The author-supplied display label, if present, that drove `slugify(label)`. */
  labelValue: string | undefined;
}

export interface CheckSlugUniqueConfig<TEntry> {
  /** Index slice to walk. */
  entries: ReadonlyArray<TEntry>;
  /**
   * Extract the four fields the collision logic needs from a typed
   * entry. The `labelValue` is whichever field drove the slug (e.g.,
   * `title` for KeyInsight, `label` for Misconception).
   */
  getKey: (entry: TEntry) => SlugUniqueEntryFields;
  /** Finding `code` (e.g., `"KI-slug-unique"`). */
  code: string;
  /** Component name as it appears in MDX (e.g., `"KeyInsight"`). */
  componentName: string;
  /**
   * Label field name as it appears in MDX attribute syntax — used in
   * the finding message to direct authors to the right prop (e.g.,
   * `"title"` for KeyInsight, `"label"` for Misconception).
   */
  labelFieldName: string;
  /** Verb the author uses to fix (e.g., `"retitle"`, `"relabel"`). */
  labelVerb: string;
  /**
   * URL path segment under `/library/` (e.g., `"key-insights"`,
   * `"misconceptions"`) — used to show authors where the shadow
   * would occur.
   */
  urlPath: string;
}

export function checkSlugUnique<TEntry>(
  config: CheckSlugUniqueConfig<TEntry>,
  sink: FindingSink
): void {
  const {
    entries,
    getKey,
    code,
    componentName,
    labelFieldName,
    labelVerb,
    urlPath,
  } = config;

  const bySlug = new Map<string, TEntry[]>();
  for (const entry of entries) {
    const { slug } = getKey(entry);
    const bucket = bySlug.get(slug);
    if (bucket) {
      bucket.push(entry);
    } else {
      bySlug.set(slug, [entry]);
    }
  }

  for (const [slug, group] of bySlug) {
    if (group.length < 2) continue;

    const callsites = group
      .map((entry) => {
        const { unit, anchor, labelValue } = getKey(entry);
        const labelPart =
          labelValue !== undefined
            ? `, ${labelFieldName}="${labelValue}"`
            : `, ${labelFieldName}=<absent>`;
        return `(unit="${unit}", anchor="${anchor}"${labelPart})`;
      })
      .join("; ");

    // slugify("!!!") === "term" per slugify.ts — any label composed
    // only of non-alphanumerics collapses to "term". When the
    // colliding slug is "term", surface the offending labels + the
    // cause so the author connects the dots; without this hint the
    // derivation is opaque (the label field is "!!!" but the slug
    // field is "term").
    //
    // Guard: fire ONLY when at least one colliding label slugifies
    // to "term" but is NOT literally "term" — i.e., the cause is
    // the non-alnum collapse, not literal equality. Without this
    // tightening two entries literally labeled "Term" would falsely
    // trigger the hint (their labels contain alphanumerics; the
    // collision is literal-slug equality, not the fallback path).
    const isPathologicalTermCollision =
      slug === "term" &&
      group.some((entry) => {
        const trimmed = getKey(entry).labelValue?.trim();
        if (!trimmed) return false; // fallback-shape, not slugify-shape
        return slugify(trimmed) === "term" && trimmed.toLowerCase() !== "term";
      });
    const pathologicalHint = isPathologicalTermCollision
      ? ` Note: slug "term" is the slugify fallback for ${labelFieldName}s composed only of non-alphanumeric characters (see slugify.ts). The colliding ${labelFieldName}s slugify to "term" because they contain no [a-z0-9] after lowercasing; ${labelVerb} them with alphanumeric content to derive distinct slugs.`
      : "";

    sink.errors.push({
      severity: "ERROR",
      code,
      message: `${code}: ${group.length} <${componentName}>s derive the same slug "${slug}" — they would shadow each other at /library/${urlPath}/${slug}/. Colliding callsites: ${callsites}. Resolution: ${labelVerb} one of the colliding ${componentName}s so its slug derives uniquely (slug is slugify(${labelFieldName}) when ${labelFieldName} is present, else \`\${unit}-\${anchor}\`).${pathologicalHint}`,
      location: {
        // anchor = slug because no single (unit, anchor) pair is
        // canonical for a cross-unit collision finding; the slug IS
        // the colliding identifier.
        anchor: slug,
      },
    });
  }
}
