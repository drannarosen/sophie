export type UnitViewKind = "reading" | "slides" | "practice";

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
}

/**
 * Returns the ordered list of view kinds (reading | slides | practice)
 * available for `unit`, based on artifact presence in the content
 * collection. Order is locked: reading first (canonical entry), slides
 * second (visual companion), practice third (active engagement) —
 * encodes Sophie's read → see → do pedagogical flow.
 *
 * Draft units excluded per ADR 0051.
 */
export function getAvailableUnitViews({
  unit,
  artifacts,
  draftUnitIds,
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
  const order: UnitViewKind[] = ["reading", "slides", "practice"];
  return order.filter((v) => present.has(v));
}
