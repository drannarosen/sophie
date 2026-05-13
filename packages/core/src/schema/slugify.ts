/**
 * Pure slug generator. Lowercases, normalizes Unicode via NFKD,
 * replaces non-alphanumerics with single hyphens, strips edge
 * hyphens. Empty / non-alphanumeric input falls back to "term".
 * Deterministic; no collision tracking.
 *
 * Use this for runtime-side `name → slug` lookups (e.g.
 * `<GlossaryTerm name="Parallax">` resolves "Parallax" to its
 * index entry by slug match).
 */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "term"
  );
}

/**
 * Collision-tracking slug generator. Same base algorithm as
 * `slugify`, but mutates a `seen: Map<string, number>` to
 * disambiguate repeated slugs within a tracking scope —
 * typically one chapter's extracted definitions. Returns
 * `base`, `base-2`, `base-3`, ... for the 1st, 2nd, 3rd
 * occurrences.
 *
 * Use this for the pedagogy-index extractor's per-chapter
 * extraction pass. Preserves the existing MiniGlossary
 * semantics this function inherits from the deprecated
 * `slugifyTerm` helper.
 */
export function slugifyWithCollisions(
  term: string,
  seen: Map<string, number>
): string {
  const base = slugify(term);
  const n = (seen.get(base) ?? 0) + 1;
  seen.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}
