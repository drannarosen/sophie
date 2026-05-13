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
    // `icons/index` is the uniform icon export surface for chrome
    // primitives — re-exports lucide-static SVG strings + bespoke
    // icons (e.g. view-mode column shapes). Must exist at
    // dist/icons/index.js to resolve from the copied-verbatim .astro
    // files in dist/components/.
    "icons/index": "src/icons/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: [
    "astro",
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
    /^@sophie\//,
  ],
});
