import fs from "node:fs";
import path from "node:path";

/**
 * `practice` is a valid `ArtifactType` per
 * [ADR 0067 § Implementation file-layout convention](../../../../../docs/website/decisions/0067-section-level-artifacts.md)
 * (see `packages/core/src/schema/artifact.ts`), but `@sophie/astro`
 * currently injects only the `/units/[unit]/reading` route
 * ([ADR 0082](../../../../../docs/website/decisions/0082-chapter-layout-extraction.md)).
 * No `/units/[unit]/practice` route is injected yet — that ships
 * with [ADR 0073](../../../../../docs/website/decisions/0073-unified-assessment-schema.md)
 * (unified assessment schema, unimplemented).
 *
 * Net effect today: an author who places `practice.mdx` next to
 * `reading.mdx` sees it build clean (the artifacts content
 * collection globs it without complaint) but the practice content
 * has no URL — silently authored-but-unrendered. The M3-L2
 * hydrostatic-equilibrium pilot surfaced this as
 * [issue #189](https://github.com/drannarosen/sophie/issues/189).
 *
 * This helper walks `src/content/sections/<sec>/units/<unit>/`
 * for any `practice.mdx` files and emits a build-time WARNING
 * (not ERROR — authors may legitimately author practice content
 * ahead of ADR 0073 shipping). The warning fires once per file
 * discovered, at `astro:config:setup` time so it surfaces ahead
 * of any other build noise.
 *
 * When ADR 0073 lands, the integration will inject a
 * `/units/[unit]/practice` route and this warning will be
 * replaced with the route registration. The warning text points
 * authors at the tracking issue so they know it's a known gap
 * rather than a bug in their own content.
 */

export interface Logger {
  warn(message: string): void;
}

/**
 * Scan a consumer project root for `src/content/sections/**\/units/**\/practice.mdx`
 * and emit a curated WARNING for each one found. Returns the array
 * of discovered paths (mostly for testing — callers do not need to
 * use the return value).
 *
 * `srcContentDir` defaults to `<root>/src/content` to match
 * Sophie's content-collection convention. Tests pass an explicit
 * root so they can author the fixture tree in a tmp dir.
 */
export function warnOnUnroutedPracticeMdx(
  srcContentDir: string,
  logger: Logger
): string[] {
  const sectionsDir = path.join(srcContentDir, "sections");
  if (!fs.existsSync(sectionsDir)) return [];

  const found = walkForPracticeMdx(sectionsDir);
  for (const filePath of found) {
    logger.warn(
      `[sophie] ${filePath}: \`practice.mdx\` is a valid artifact type ` +
        `(ADR 0067) but \`@sophie/astro\` does not yet inject a ` +
        `\`/units/<unit>/practice\` route (ADR 0082; ADR 0073 ships ` +
        `that route with the unified assessment schema, currently ` +
        `unimplemented). Content will NOT render — authored-but-` +
        `unrouted. To suppress: rename the file or move it to a ` +
        `non-discoverable location. Track: ` +
        `https://github.com/drannarosen/sophie/issues/189.`
    );
  }
  return found;
}

/**
 * Recursive walk that returns absolute paths of every
 * `practice.mdx` under `dir`. Skips dot-directories (e.g.
 * `.astro`, `.git`) and `node_modules` for performance + safety.
 */
function walkForPracticeMdx(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkForPracticeMdx(full));
    } else if (entry.isFile() && entry.name === "practice.mdx") {
      out.push(full);
    }
  }
  return out;
}
