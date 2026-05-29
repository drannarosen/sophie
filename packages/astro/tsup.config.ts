import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";
import {
  discoverAstroEntries,
  findMissingEntries,
} from "./src/build/discover-astro-entries";

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

const entry = { ...INTRINSIC, ...discovered };

/**
 * Self-validation guard (the approved deliverable). Threat model: a
 * SILENT MISS — discovery's structured parser fails to *see* a value
 * import, so no entry is created, `pnpm build` + unit tests stay green,
 * and only the consumer/smoke Astro build breaks (this bug class bit 3×).
 *
 * `findMissingEntries` re-scans each `.astro` file's RAW text with an
 * INDEPENDENT regex (not discovery's TS-compiler chunk extraction) and
 * asserts every relative value-import that resolves to a buildable src
 * module is present in the FINAL `entry` set. A miss → throw here, at
 * config-eval (build time), failing the build LOUDLY rather than
 * shipping a dist tree that resolves wrong at the consumer build.
 */
const missing = findMissingEntries(SRC_DIR, Object.keys(entry));
if (missing.length > 0) {
  const lines = missing
    .map(
      (m) =>
        `  - ${m.file} imports "${m.specifier}" ` +
        `(expected entry key "${m.expectedKey}") — discovery parser did ` +
        "not produce it"
    )
    .join("\n");
  throw new Error(
    `tsup entry discovery missed ${missing.length} value-import(s):\n${lines}`
  );
}

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
