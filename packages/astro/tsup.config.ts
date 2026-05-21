import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "client/SophieChapter": "src/client/SophieChapter.tsx",
    // `preferences/` is consumed by .astro components in TWO ways:
    //   1. Astro frontmatter import (SSR, calls bootScript()).
    //   2. <script> tags in components (client bundle, calls bindToggle()).
    // Both resolve to dist/preferences/index.js after build.
    "preferences/index": "src/preferences/index.ts",
    // `lib/group-headings` is imported by .astro components (SSR side)
    // and must exist at dist/lib/group-headings.js to be resolvable
    // from the copied-verbatim .astro files in dist/components/.
    "lib/group-headings": "src/lib/group-headings.ts",
    // `lib/clean-heading-text` is imported by TocSidebar.astro (SSR
    // side) to strip KaTeX-SSR artifacts from MarkdownHeading.text
    // values before re-rendering via MathText. Must exist at
    // dist/lib/clean-heading-text.js to resolve from the copied-
    // verbatim .astro files in dist/components/.
    "lib/clean-heading-text": "src/lib/clean-heading-text.ts",
    // `icons/index` is the uniform icon export surface for chrome
    // primitives — re-exports lucide-static SVG strings + bespoke
    // icons (e.g. view-mode column shapes). Must exist at
    // dist/icons/index.js to resolve from the copied-verbatim .astro
    // files in dist/components/.
    "icons/index": "src/icons/index.ts",
    // `lib/aside-positioning/install-positioning` is the vanilla-JS
    // docking-lifecycle entry point for <Aside> (PR 6; C7 seam split
    // under ADR 0061). Wired by TextbookLayout's <script> block;
    // tree-shakes in `computeAsidePositions` from the sibling
    // `compute-placements.ts`. Must exist at
    // dist/lib/aside-positioning/install-positioning.js to resolve
    // from the copied-verbatim .astro files.
    "lib/aside-positioning/install-positioning":
      "src/lib/aside-positioning/install-positioning.ts",
    // `lib/get-student-chapters` is the ADR 0051 student-build filter.
    // Imported by TextbookLayout.astro (filters drafts before they
    // reach the pedagogy index) and re-exported from the package
    // entrypoint for consumer-app `[...slug].astro` route files.
    // Must exist at dist/lib/get-student-chapters.js to resolve from
    // the copied-verbatim .astro files in dist/components/.
    "lib/get-student-chapters": "src/lib/get-student-chapters.ts",
    // `lib/pedagogy-index/accumulator` is the cross-chapter
    // `IndexAccumulator` singleton (ADR 0038; C1 split under ADR 0061).
    // Imported by 12 .astro chrome components (TextbookLayout,
    // ChapterGlossary, CourseGlossary, ChapterMisconceptions, etc.)
    // to read aggregated entries and seed @sophie/components stores.
    // Must exist at dist/lib/pedagogy-index/accumulator.js to resolve
    // from the copied-verbatim .astro files in dist/components/.
    "lib/pedagogy-index/accumulator": "src/lib/pedagogy-index/accumulator.ts",
    // `lib/pedagogy-audit/runner` is the systematic build-time audit
    // pass (PR-C4) over the populated PedagogyIndex (C2 split under
    // ADR 0061). Imported indirectly by TextbookLayout via
    // `lib/audit-cache`. Must exist at dist/lib/pedagogy-audit/runner.js
    // because the dist/ tree mirrors src/.
    "lib/pedagogy-audit/runner": "src/lib/pedagogy-audit/runner.ts",
    // `lib/validation/extractor` walks docs/website/{decisions,reference}/
    // at build time and emits ContractValidationEntry[] + V0/V8 findings
    // for the ADR 0056 validation tracker. Imported by TextbookLayout
    // (orchestrates the accumulator population). Must exist at
    // dist/lib/validation/extractor.js to resolve from the copied-verbatim
    // .astro files in dist/components/.
    "lib/validation/extractor": "src/lib/validation/extractor.ts",
    // `lib/audit-cache` wraps runPedagogyAudit with a one-shot
    // per-process cache (run once in prod builds, every call in dev).
    // Imported by TextbookLayout to gate audit re-runs across page
    // renders. Must exist at dist/lib/audit-cache.js to resolve from
    // the copied-verbatim .astro files in dist/components/.
    "lib/audit-cache": "src/lib/audit-cache.ts",
    // `lib/notation-registry-loader` reads + parses the consumer's
    // pedagogy-contract.yaml + notation-registry.yaml (ADR 0042 + ADR
    // 0043). Imported by TextbookLayout (PR-ε wire-up): the layout
    // calls `loadConsumerRegistry(repoRoot)`, pushes the registry into
    // the accumulator via `setNotationRegistry`, and threads it into
    // the audit's NR/MR invariants. Must exist at
    // dist/lib/notation-registry-loader.js to resolve from the
    // copied-verbatim .astro files in dist/components/.
    "lib/notation-registry-loader": "src/lib/notation-registry-loader.ts",
    // `lib/pedagogy-index-virtual-module` is the optional Vite plugin
    // exposing `virtual:sophie/pedagogy-index`. Not used by the
    // chrome critical path (Vite caches load() before chapter parse);
    // kept as a portable read-only surface for future consumers.
    "lib/pedagogy-index-virtual-module":
      "src/lib/pedagogy-index-virtual-module.ts",
  },
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
