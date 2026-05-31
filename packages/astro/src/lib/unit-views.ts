export type UnitViewKind = "reading" | "slides" | "practice" | "solutions";

/**
 * Minimal structural shape of an Astro `CollectionEntry<"artifacts">`
 * sufficient for path-based view enumeration. Decoupled from
 * `astro:content` so this module stays importable in unit tests +
 * non-Astro contexts (mirrors the pattern established by
 * `artifacts-from-collection.ts`).
 */
export interface ArtifactEntryLike {
  id: string;
}

export interface GetAvailableUnitViewsOptions {
  unit: string;
  artifacts: ReadonlyArray<ArtifactEntryLike>;
  draftUnitIds?: ReadonlySet<string>;
  /**
   * Unit ids that own a `solutions` collection entry (ADR 0096). Solutions
   * live in their OWN content collection, EXCLUDED from `artifacts` by
   * construction (the build-time security property: a solution never rides
   * the course-wide artifact sweep). So `getAvailableUnitViews` cannot
   * discover the Solutions tab from `artifacts` the way it discovers
   * reading/slides/practice — the caller passes the set of unit ids that
   * have a solutions entry, derived from `getCollection("solutions")`.
   *
   * The tab's EXISTENCE is gated only on a solutions entry existing — NOT on
   * reveal state (ADR 0096). When the chapter is still gated the tab leads to
   * the placeholder route; the route gates the CONTENT, not the tab.
   */
  unitIdsWithSolutions?: ReadonlySet<string>;
}

/**
 * Returns the ordered list of view kinds available for `unit`. Order is
 * locked: reading first (canonical entry), slides second (visual companion),
 * practice third (active engagement), solutions last (gated worked answers,
 * ADR 0096) — encodes Sophie's read → see → do → check flow.
 *
 * reading/slides/practice availability is derived from artifact presence in
 * the `artifacts` content collection. `solutions` availability is passed in
 * via `unitIdsWithSolutions` because solutions live in a separate collection
 * (see that option's docstring).
 *
 * Draft units excluded per ADR 0051.
 */
export function getAvailableUnitViews({
  unit,
  artifacts,
  draftUnitIds,
  unitIdsWithSolutions,
}: GetAvailableUnitViewsOptions): ReadonlyArray<UnitViewKind> {
  if (draftUnitIds?.has(unit) === true) return [];
  // Artifact ids are path-derived per ADR 0067:
  // `<sec>/units/<unit>/<artifact-type>` (see
  // `artifacts-from-collection.ts`). Position-1 == literal "units",
  // position-2 == unit id, position-3 == artifact-type basename.
  const candidates = artifacts.filter((a) => {
    const segs = a.id.split("/");
    return segs[1] === "units" && segs[2] === unit;
  });
  const present = new Set<string>();
  for (const c of candidates) present.add(c.id.split("/").pop() ?? "");
  if (unitIdsWithSolutions?.has(unit) === true) present.add("solutions");
  const order: UnitViewKind[] = ["reading", "slides", "practice", "solutions"];
  return order.filter((v) => present.has(v));
}
