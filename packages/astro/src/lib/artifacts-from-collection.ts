import type { ArtifactEntry, ArtifactType } from "@sophie/core/schema";

/**
 * Minimal structural shape of an Astro `CollectionEntry<"artifacts">`
 * sufficient for path-derivation. Decoupled from `astro:content` so
 * this module stays importable in tests + non-Astro contexts
 * (mirrors the pattern established by `get-student-chapters.ts`).
 */
export interface ArtifactCollectionEntryLike {
  id: string;
  data: {
    id: string;
    title: string;
    references?: ArtifactEntry["references"];
  };
}

/**
 * Path-derive `ArtifactEntry` shape from a single artifacts-collection
 * entry. The smoke glob loader walks `sections/**\/*.mdx` and yields
 * entries with `entry.id` = path relative to `src/content/sections`
 * (extension stripped).
 *
 * W2/D1 (Path A) per ADR 0067 §Implementation file-layout convention:
 *
 *   - `<sec>/units/<unit>/<artifact-type>` → `scope: "unit"`,
 *     `unit_id: <unit>`, `section_id: <sec>`, `type: <artifact-type>`
 *   - `<sec>/<artifact-type>` → `scope: "section"`,
 *     `section_id: <sec>`, `type: <artifact-type>`
 *
 * The W2 smoke fixture only exercises `reading.mdx` under
 * `<sec>/units/<unit>/`, but the loader supports the full
 * 20-variant `ArtifactType` range so future wedges (slides, intro,
 * synthesis, …) don't need a loader change.
 *
 * Frontmatter supplies `id`, `title`, and `references`; everything
 * else (type, scope, parent refs, source_path) is path-derived.
 */
export function artifactFromCollectionEntry(
  entry: ArtifactCollectionEntryLike
): ArtifactEntry {
  const id = entry.data.id;
  const title = entry.data.title;
  // Astro's z.passthrough() strips the `references` default; restore it
  // when absent so ArtifactReferencesSchema doesn't choke downstream.
  const references = entry.data.references ?? {};

  const parts = entry.id.split("/");
  const sectionId = parts[0];
  if (!sectionId) {
    throw new Error(
      `Artifact entry has malformed path (no section segment): "${entry.id}"`
    );
  }

  const isUnitScoped = parts.length === 4 && parts[1] === "units";
  const isSectionScoped = parts.length === 2;
  if (!isUnitScoped && !isSectionScoped) {
    throw new Error(
      `Artifact entry path doesn't match ADR 0067 layout. Expected ` +
        `"<section>/units/<unit>/<artifact-type>" or ` +
        `"<section>/<artifact-type>"; got "${entry.id}".`
    );
  }

  const artifactType = (isUnitScoped ? parts[3] : parts[1]) as ArtifactType;
  if (!artifactType) {
    throw new Error(
      `Artifact entry path has no artifact-type basename: "${entry.id}"`
    );
  }

  const sourcePath = `src/content/sections/${entry.id}.mdx`;

  if (isUnitScoped) {
    const unitId = parts[2];
    if (!unitId) {
      throw new Error(
        `Artifact entry path missing unit segment: "${entry.id}"`
      );
    }
    return {
      id,
      type: artifactType,
      scope: "unit",
      title,
      source_path: sourcePath,
      references,
      section_id: sectionId,
      unit_id: unitId,
    };
  }

  return {
    id,
    type: artifactType,
    scope: "section",
    title,
    source_path: sourcePath,
    references,
    section_id: sectionId,
  };
}

/**
 * Batch helper — map a `getCollection('artifacts')` result to
 * `ArtifactEntry[]` via `artifactFromCollectionEntry`. Used by
 * `TextbookLayout.astro` before calling `indexAccumulator.setArtifacts`.
 */
export function artifactsFromCollection<T extends ArtifactCollectionEntryLike>(
  entries: ReadonlyArray<T>
): ArtifactEntry[] {
  return entries.map(artifactFromCollectionEntry);
}
