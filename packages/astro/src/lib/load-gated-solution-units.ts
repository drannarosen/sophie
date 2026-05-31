import fs from "node:fs";
import path from "node:path";

/**
 * Enumerate the unit ids that own a gated `solutions.mdx` (ADR 0096),
 * reading **filenames only** — never the solution body.
 *
 * Solutions live at `src/content/sections/<sec>/units/<unit>/solutions.mdx`
 * (ADR 0067 layout) in their OWN content collection, deliberately excluded
 * from the course-wide `artifacts` sweep so a withheld solution can never
 * leak through search or the Library (`content.config.ts` § SECURITY). The
 * pedagogy audit may learn that such a solution *exists* (so AS-2 stops
 * warning on practice-tab problems whose answer is gated by design), but it
 * MUST NOT read the body. This walker satisfies that constraint by
 * construction: it only matches the path `solutions.mdx` and derives the
 * unit id from the path segment after `units/`. It never opens the file.
 *
 * Parallels ChapterLayout's `getCollection("solutions").map(s => s.id…)`
 * existence probe, but runs at the `astro:build:done` integration layer
 * where `getCollection` is unavailable — hence the filesystem walk against
 * `<consumerRoot>/src/content/sections`. Returns an empty set when the
 * directory is absent (a consumer with no sections, or no solutions).
 */
export function loadUnitIdsWithGatedSolutions(
  consumerRoot: string
): ReadonlySet<string> {
  const sectionsDir = path.join(consumerRoot, "src/content/sections");
  if (!fs.existsSync(sectionsDir)) return new Set();

  const unitIds = new Set<string>();
  for (const rel of fs.readdirSync(sectionsDir, { recursive: true })) {
    const relPath = typeof rel === "string" ? rel : rel.toString();
    if (path.basename(relPath) !== "solutions.mdx") continue;
    const segments = relPath.split(path.sep);
    const unitsIdx = segments.indexOf("units");
    const unitId = unitsIdx >= 0 ? segments[unitsIdx + 1] : undefined;
    if (unitId) unitIds.add(unitId);
  }
  return unitIds;
}
