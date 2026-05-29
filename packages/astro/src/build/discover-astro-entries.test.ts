import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { discoverAstroEntries } from "./discover-astro-entries";

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
 * 20-entry union below. Kept in sync with the INTRINSIC literal in
 * `tsup.config.ts`.
 */
const INTRINSIC_KEYS = [
  "index",
  "client/SophieChapter",
  "lib/pedagogy-index-virtual-module",
  "lib/pedagogy-audit/runner",
] as const;

/** The 16 entries derivable from copied-verbatim `.astro` value-imports. */
const EXPECTED_DISCOVERED = [
  "components",
  "icons/index",
  "lib/artifacts-from-collection",
  "lib/aside-positioning/install-positioning",
  "lib/audit-cache",
  "lib/clean-heading-text",
  "lib/compose-evaluator",
  "lib/group-headings",
  "lib/math-render/enrich-equations-speech",
  "lib/math-render/render-math",
  "lib/notation-registry-loader",
  "lib/pedagogy-index/accumulator",
  "lib/pedagogy-index/canonical-definitions",
  "lib/unit-views",
  "lib/validation/extractor",
  "preferences/index",
].sort();

/** INTRINSIC ∪ DISCOVERED — the complete tsup entry surface. */
const EXPECTED_ALL = [...INTRINSIC_KEYS, ...EXPECTED_DISCOVERED].sort();

describe("discoverAstroEntries", () => {
  const discovered = discoverAstroEntries(SRC_DIR);

  it("derives exactly the 16 .astro-imported entry keys", () => {
    expect(Object.keys(discovered).sort()).toEqual(EXPECTED_DISCOVERED);
  });

  it("excludes type-only imports (module-nav-helpers regression guard)", () => {
    // ModuleNav.astro imports `type { NavChapter, NavModule }` from
    // `../lib/module-nav-helpers`; a type-only import erases at build,
    // so the module must NOT become an entry.
    expect(discovered).not.toHaveProperty("lib/module-nav-helpers");
  });

  it("normalizes a specifier carrying a .ts extension", () => {
    // UnitViewLinkBar.astro imports `../lib/unit-views.ts` WITH the
    // extension (a type-only import there) — but ChapterLayout.astro
    // value-imports the same module without extension. The keyed entry
    // must collapse to the extensionless `lib/unit-views` either way.
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

  it("INTRINSIC ∪ DISCOVERED equals the full 20-entry set", () => {
    const all = [...INTRINSIC_KEYS, ...Object.keys(discovered)].sort();
    expect(all).toEqual(EXPECTED_ALL);
    expect(all).toHaveLength(20);
  });
});
