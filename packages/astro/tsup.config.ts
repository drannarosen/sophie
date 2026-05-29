import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";
import { discoverAstroEntries } from "./src/build/discover-astro-entries";

const SRC_DIR = fileURLToPath(new URL("./src/", import.meta.url));

/**
 * INTRINSIC entries are NOT derived from `.astro` value-imports — they
 * stay explicit (with the rationale each one carries). Everything a
 * copied-verbatim `.astro` imports as a value is derived by
 * `discoverAstroEntries` instead of hand-maintained, which closes the
 * recurring "missing dist entry" bug class (a dropped entry passed unit
 * tests + `pnpm build` and broke only at the consumer Astro build, 3×).
 */
const INTRINSIC: Record<string, string> = {
  // Package entrypoint.
  index: "src/index.ts",
  // Client island.
  "client/SophieChapter": "src/client/SophieChapter.tsx",
  // `lib/pedagogy-index-virtual-module` is the optional Vite plugin
  // exposing `virtual:sophie/pedagogy-index`. Imported only by
  // `integration.ts`/`index.ts` (no `.astro` consumer); kept as a
  // portable read-only surface for future consumers.
  "lib/pedagogy-index-virtual-module":
    "src/lib/pedagogy-index-virtual-module.ts",
  // `lib/pedagogy-audit/runner` is the systematic build-time audit
  // pass (PR-C4). Imported only via `integration.ts`/`audit-cache.ts`
  // (no direct `.astro` consumer); kept explicit because the dist tree
  // mirrors src.
  "lib/pedagogy-audit/runner": "src/lib/pedagogy-audit/runner.ts",
};

const discovered = discoverAstroEntries(SRC_DIR);

/**
 * Self-validation safety net (the approved guard): if an INTRINSIC key
 * collides with a discovered key BUT points at a different source path,
 * the spread below would silently let one shadow the other — exactly the
 * class of stale-mapping bug this refactor exists to kill. Fail loudly at
 * config-eval, naming the key, rather than producing a dist tree that
 * resolves wrong at the consumer Astro build. A clean run proves the
 * INTRINSIC list and the `.astro`-derived set are disjoint-or-consistent;
 * a future dev adding an `.astro`→lib import gets an automatic entry, and
 * a regression in either source-of-truth surfaces here.
 */
for (const [key, source] of Object.entries(discovered)) {
  if (key in INTRINSIC && INTRINSIC[key] !== source) {
    throw new Error(
      `tsup entry self-validation: key "${key}" is declared INTRINSIC as ` +
        `"${INTRINSIC[key]}" but discovered from an .astro value-import as ` +
        `"${source}". Reconcile the source path or drop the INTRINSIC entry.`
    );
  }
}

const entry = { ...INTRINSIC, ...discovered };

export default defineConfig({
  entry,
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: [
    "astro",
    /^astro:/,
    /^@astrojs\//,
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "katex",
    /^katex\//,
    "rehype-katex",
    "remark-gfm",
    "remark-frontmatter",
    "remark-math",
    "unist-util-visit",
    "mdast-util-to-hast",
    "hast-util-to-html",
    /^@sophie\//,
  ],
});
