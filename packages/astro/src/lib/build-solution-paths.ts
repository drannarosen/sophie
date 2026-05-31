import type { HomeworkRegistry } from "@sophie/core/schema";
import {
  isChapterRevealed,
  resolveRevealDate,
} from "./resolve-solution-reveal.ts";

/**
 * Minimal structural shape of an Astro `CollectionEntry<"artifacts">`
 * sufficient for the Solutions gate. Decoupled from `astro:content` so this
 * module stays importable in tests + non-Astro contexts (mirrors
 * `ArtifactCollectionEntryLike` in artifacts-from-collection.ts). The route
 * passes the real `CollectionEntry`, which structurally satisfies this and
 * flows through unchanged into `props.artifact` for `render()`.
 */
export interface SolutionArtifactLike {
  id: string;
  data: { id: string; title: string };
}

/**
 * Minimal structural shape of an Astro `CollectionEntry<"units">` sufficient
 * for the gate: the unit id, its draft status, and the optional per-unit
 * `solutionsRevealDate` override (ADR 0096).
 */
export interface SolutionUnitLike {
  data: {
    id: string;
    status: "draft" | "review" | "stable";
    solutionsRevealDate?: string;
  };
}

/**
 * A single `getStaticPaths` entry for the gated Solutions route.
 *
 * **Security property (ADR 0096):** when `revealed` is `false`, `artifact`
 * is `undefined` — the gated artifact is absent from the props, so the route
 * never calls `render()` on it and the withheld solution text never compiles
 * into `dist/`. CSS-hiding would not satisfy this; route-level absence does.
 */
export interface SolutionPathEntry<A extends SolutionArtifactLike> {
  params: { unit: string };
  props:
    | { revealed: true; artifact: A; resolvedDate: string | null }
    | { revealed: false; artifact?: undefined; resolvedDate: string | null };
}

const ISO_DATE_LENGTH = 10; // "YYYY-MM-DD"

/**
 * Build the `getStaticPaths` entries for `/units/[unit]/solutions`, gating
 * each unit's solutions artifact behind its resolved reveal date (ADR 0096).
 *
 * For every solutions artifact (`<sec>/units/<unit>/solutions`) whose unit
 * exists and is not a draft:
 * - revealed → the entry carries the artifact (route renders it);
 * - gated → the entry omits the artifact (route renders the placeholder).
 *
 * `now` is INJECTED (the build wall-clock) so this helper stays pure and
 * fully testable; the route is the single site that reads `new Date()`.
 */
export function buildSolutionPaths<A extends SolutionArtifactLike>(
  artifacts: ReadonlyArray<A>,
  units: ReadonlyArray<SolutionUnitLike>,
  registry: HomeworkRegistry | null,
  now: Date
): SolutionPathEntry<A>[] {
  const unitsById = new Map(units.map((u) => [u.data.id, u]));

  const entries: SolutionPathEntry<A>[] = [];
  for (const artifact of artifacts) {
    if (!artifact.id.endsWith("/solutions")) continue;
    // Path-derived unit id is path-position-2 (<sec>/units/<unit>/solutions).
    const unitId = artifact.id.split("/")[2] ?? "";
    const unit = unitsById.get(unitId);
    if (!unit) continue;
    if (unit.data.status === "draft") continue;

    const explicit = unit.data.solutionsRevealDate;
    const revealed = isChapterRevealed(unitId, explicit, registry, now);
    const resolved = resolveRevealDate(unitId, explicit, registry);
    const resolvedDate = resolved
      ? resolved.toISOString().slice(0, ISO_DATE_LENGTH)
      : null;

    entries.push(
      revealed
        ? {
            params: { unit: unitId },
            props: { revealed: true, artifact, resolvedDate },
          }
        : { params: { unit: unitId }, props: { revealed: false, resolvedDate } }
    );
  }
  return entries;
}
