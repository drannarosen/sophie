import type { PedagogyIndex } from "@sophie/core/schema";
import type { FindingSink } from "../types.ts";

/**
 * Reserved top-level Library / structural URL prefixes. A bridge
 * room slug must not collide with any of these — bridge rooms render
 * at Course root via `[bridgeSlug].astro`, so a slug matching a
 * reserved path would shadow that route's static page or dynamic
 * route. See [ADR 0070 (W4a amendment)](../../../../../../docs/website/decisions/0070-library-room-and-registry-spec-pages.md)
 * for the `/library/<X>/` namespace + reserved structural paths.
 */
const RESERVED_PATHS = new Set(["library", "sections", "units", "topics"]);

/**
 * BR-1 (ADR 0079 + 0068) — Bridge slug uniqueness.
 *
 * Per ADR 0068 Scale 1 bridge rooms render at Course root via the
 * single-param `[bridgeSlug].astro` dynamic route. Each
 * `Section[type=bridge]`'s slug becomes a Course-root URL segment.
 * To prevent silent route shadowing, the slug must not collide with:
 *
 * - Any other Section's slug (bridge OR regular).
 * - Any Unit's id (the W3/D7 convention makes Unit id == its slug).
 * - Any reserved Library / structural path (`library`, `sections`,
 *   `units`, `topics`) per ADR 0070.
 *
 * Severity: ERROR (build-time fail). Authors fix by renaming the
 * bridge slug.
 *
 * The invariant is opt-in via authoring a bridge section; courses
 * without bridge rooms produce no BR-1 findings.
 */
export function checkBR1(index: PedagogyIndex, sink: FindingSink): void {
  const bridges = index.sections.filter((s) => s.type === "bridge");
  if (bridges.length === 0) return;

  // Build the set of "taken" slugs from all collision sources.
  const otherSectionSlugs = new Set<string>();
  const otherBridgeSlugs = new Map<string, number>();
  for (const s of index.sections) {
    if (s.type === "bridge") {
      otherBridgeSlugs.set(s.slug, (otherBridgeSlugs.get(s.slug) ?? 0) + 1);
    } else {
      otherSectionSlugs.add(s.slug);
    }
  }
  const unitIds = new Set(index.units.map((u) => u.id));

  // One pass per bridge slug. Emit at most one finding per bridge
  // (the first collision found) to keep error output tractable.
  const reported = new Set<string>();
  for (const b of bridges) {
    if (reported.has(b.slug)) continue;
    if (RESERVED_PATHS.has(b.slug)) {
      sink.errors.push({
        severity: "ERROR",
        code: "BR-1",
        message: `BR-1: Bridge section "${b.slug}" uses a reserved structural path. Reserved prefixes (cannot be used as bridge slugs): ${[...RESERVED_PATHS].sort().join(", ")}. Resolution: rename the bridge slug (per ADR 0070 + 0079).`,
        location: { anchor: b.slug },
      });
      reported.add(b.slug);
      continue;
    }
    if ((otherBridgeSlugs.get(b.slug) ?? 0) > 1) {
      sink.errors.push({
        severity: "ERROR",
        code: "BR-1",
        message: `BR-1: Bridge slug "${b.slug}" is used by multiple bridge sections. Bridge slugs must be unique within a course (per ADR 0068 + 0079).`,
        location: { anchor: b.slug },
      });
      reported.add(b.slug);
      continue;
    }
    if (otherSectionSlugs.has(b.slug)) {
      sink.errors.push({
        severity: "ERROR",
        code: "BR-1",
        message: `BR-1: Bridge slug "${b.slug}" collides with a regular Section's slug. Bridge rooms render at Course root (\`/${b.slug}\`) and would shadow the regular Section's URL. Resolution: rename the bridge slug or the colliding Section (per ADR 0068 + 0079).`,
        location: { anchor: b.slug },
      });
      reported.add(b.slug);
      continue;
    }
    if (unitIds.has(b.slug)) {
      sink.errors.push({
        severity: "ERROR",
        code: "BR-1",
        message: `BR-1: Bridge slug "${b.slug}" collides with a Unit's id. Per W3/D7, Unit id is its URL slug, so the bridge would shadow the unit's chapter route (\`/units/${b.slug}/reading\`) at Course root. Resolution: rename the bridge slug or the colliding Unit (per ADR 0068 + 0079).`,
        location: { anchor: b.slug },
      });
      reported.add(b.slug);
    }
  }
}
