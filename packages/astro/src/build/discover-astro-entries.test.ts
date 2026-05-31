import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  discoverAstroEntries,
  findMissingEntries,
} from "./discover-astro-entries";

// `src/build/` → `src/`. Matches the sibling-test path pattern (Vite
// rewrites `import.meta.url`, so `new URL("../", ...)` yields a
// non-file scheme; resolve from the realized dirname instead).
const SRC_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * INTRINSIC entries are NOT derived from `.astro` value-imports — they
 * are the package entrypoint, the client island, and two modules
 * reachable only through `integration.ts`/`index.ts`/sibling `.ts` files
 * (the dist tree mirrors src). Discovery owns only the `.astro`-derived
 * set; this list is the explicit complement asserted against the full
 * 30-entry union below. Kept in sync with the INTRINSIC literal in
 * `tsup.config.ts`.
 */
const INTRINSIC_KEYS = [
  "index",
  "client/SophieChapter",
  "lib/pedagogy-index-virtual-module",
  "lib/pedagogy-audit/runner",
] as const;

/** The 26 entries derivable from copied-verbatim `.astro` value-imports. */
const EXPECTED_DISCOVERED = [
  "components",
  "components/backgrounds/starfield-engine",
  "components/backgrounds/themes",
  "components/course-home/home-card-projections",
  "components/course-home/home-projections",
  "components/course-home/home-schedule-projections",
  "icons/index",
  "lib/artifacts-from-collection",
  "lib/aside-positioning/install-positioning",
  "lib/audit-cache",
  "lib/build-solution-paths",
  "lib/clean-heading-text",
  "lib/compose-evaluator",
  "lib/derive-info-slug",
  "lib/group-headings",
  "lib/load-gated-solution-units",
  "lib/math-render/enrich-equations-speech",
  "lib/math-render/render-math",
  "lib/notation-registry-loader",
  "lib/pedagogy-index/accumulator",
  "lib/pedagogy-index/canonical-definitions",
  "lib/serialize-pedagogy-hydration",
  "lib/unit-views",
  "lib/validation/extractor",
  "lib/with-base",
  "preferences/index",
].sort();

/** INTRINSIC ∪ DISCOVERED — the complete tsup entry surface. */
const EXPECTED_ALL = [...INTRINSIC_KEYS, ...EXPECTED_DISCOVERED].sort();

describe("discoverAstroEntries", () => {
  const discovered = discoverAstroEntries(SRC_DIR);

  it("derives exactly the 26 .astro-imported entry keys", () => {
    expect(Object.keys(discovered).sort()).toEqual(EXPECTED_DISCOVERED);
  });

  it("excludes type-only imports (module-nav-helpers regression guard)", () => {
    // ModuleNav.astro imports `type { NavChapter, NavModule }` from
    // `../lib/module-nav-helpers`; a type-only import erases at build,
    // so the module must NOT become an entry.
    expect(discovered).not.toHaveProperty("lib/module-nav-helpers");
  });

  it("normalizes an extensionless specifier to its .ts source", () => {
    // ChapterLayout.astro value-imports `../lib/unit-views` WITHOUT an
    // extension; the resolved entry must point at the real `.ts` file
    // while the key collapses to the extensionless `lib/unit-views`.
    // (UnitViewLinkBar.astro's `../lib/unit-views.ts` is an `import type`
    // — excluded — so it does NOT exercise the .ts-extension value path.)
    expect(discovered["lib/unit-views"]).toMatch(/lib\/unit-views\.ts$/);
  });

  it("finds <script>-block imports (aside-positioning)", () => {
    // TextbookLayout.astro wires installAsidePositioning inside a
    // client <script> block, not the frontmatter fence.
    expect(discovered).toHaveProperty(
      "lib/aside-positioning/install-positioning"
    );
  });

  it("resolves bare-dir specifiers to their index file", () => {
    expect(discovered["preferences/index"]).toMatch(/preferences\/index\.ts$/);
    expect(discovered["icons/index"]).toMatch(/icons\/index\.ts$/);
    expect(discovered.components).toMatch(/components\.tsx$/);
  });

  it("INTRINSIC ∪ DISCOVERED equals the full 30-entry set", () => {
    const all = [...INTRINSIC_KEYS, ...Object.keys(discovered)].sort();
    expect(all).toEqual(EXPECTED_ALL);
    expect(all).toHaveLength(30);
  });
});

describe("findMissingEntries (self-validation guard)", () => {
  // Fixture sandboxes — temp `.astro` + lib `.ts` files in an OS temp
  // dir. NOT real repo files: keeps the red-path test non-brittle and
  // independent of how the real .astro tree evolves.
  const tmpDirs: string[] = [];

  function fixtureDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "tsup-entry-validator-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("FIRES when a value-imported module is absent from the entry set", () => {
    const dir = fixtureDir();
    writeFileSync(join(dir, "helper.ts"), "export const x = 1;\n");
    writeFileSync(
      join(dir, "Widget.astro"),
      '---\nimport { x } from "./helper";\n---\n<p>{x}</p>\n'
    );

    // Entry set deliberately OMITS the `helper` key — simulates the
    // silent-miss the guard must catch. This is the live-not-dead proof.
    const missing = findMissingEntries(dir, []);

    expect(missing).toHaveLength(1);
    expect(missing[0]).toMatchObject({
      specifier: "./helper",
      expectedKey: "helper",
    });
    expect(missing[0]?.file).toMatch(/Widget\.astro$/);
  });

  it("does NOT fire when the value-import IS present as an entry key", () => {
    const dir = fixtureDir();
    writeFileSync(join(dir, "helper.ts"), "export const x = 1;\n");
    writeFileSync(
      join(dir, "Widget.astro"),
      '---\nimport { x } from "./helper";\n---\n<p>{x}</p>\n'
    );

    expect(findMissingEntries(dir, ["helper"])).toEqual([]);
  });

  it("does NOT fire on a type-only import (no false positive)", () => {
    const dir = fixtureDir();
    writeFileSync(join(dir, "types.ts"), "export type T = number;\n");
    writeFileSync(
      join(dir, "Widget.astro"),
      '---\nimport type { T } from "./types";\nconst n: T = 1;\n---\n<p>{n}</p>\n'
    );

    // Type-only import erases at build → must NOT be flagged even though
    // `types` is absent from the (empty) entry set.
    expect(findMissingEntries(dir, [])).toEqual([]);
  });

  it("catches a CRLF frontmatter import the chunk parser could miss", () => {
    const dir = fixtureDir();
    writeFileSync(join(dir, "helper.ts"), "export const x = 1;\n");
    // CRLF line endings throughout — the independent raw scan still sees
    // the import; this is the parser-blind-spot backstop in action.
    writeFileSync(
      join(dir, "Widget.astro"),
      '---\r\nimport { x } from "./helper";\r\n---\r\n<p>{x}</p>\r\n'
    );

    expect(findMissingEntries(dir, [])).toEqual([
      expect.objectContaining({ specifier: "./helper", expectedKey: "helper" }),
    ]);
  });
});
