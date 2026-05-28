import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "contract/index": "src/contract/index.ts",
    "runtime/index": "src/runtime/index.ts",
    // Internal store-hydration entry — TextbookLayout-only.
    // Per ADR 0061 R4 + 2026-05-19 architecture audit P2 #3.
    "internal/store-hydration": "src/internal/store-hydration.ts",
    // Figures subpath entry — isolates @observablehq/plot + d3 (bundled
    // via noExternal below) to `@sophie/components/figures` so the main
    // barrel stays Plot-free. See ADR 0022 amendment + the figures
    // barrel header.
    "figures/index": "src/figures/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  // splitting: true so shared modules (useInteractive's stores/channels Maps,
  // contracts, etc.) are deduped across `index`, `runtime/index`, and
  // `contract/index` entries. Without this, a consumer importing both
  // `@sophie/components` and `@sophie/components/runtime` gets two
  // independent module-level singletons, which would break BroadcastChannel
  // sync and IDB write coordination. Caught in code review 2026-05-09.
  splitting: true,
  // @observablehq/plot is bundled INTO the dist (not externalized) so the
  // CJS→ESM interop of its transitive `interval-tree-1d` (pure CJS) is
  // resolved once by esbuild at build time, yielding a clean-ESM dist.
  // This removes the need for any consumer/integration `optimizeDeps`
  // band-aid. splitting:true keeps Plot+d3 confined to the figure chunks.
  noExternal: ["@observablehq/plot"],
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "idb",
    "zod",
    /^@radix-ui\//,
    /^@sophie\//,
    // CSS Module companions (.module.css.js) are emitted by
    // scripts/build-css-modules.ts at onSuccess time; mark external so
    // tsup leaves the import statements intact in the output JS.
    /\.module\.css(\.js)?$/,
    // Vite virtual modules (e.g. `virtual:sophie/pedagogy-index`) are
    // produced at consumer build time by @sophie/astro's Vite plugin
    // (ADR 0038). They don't exist at @sophie/components compile time;
    // leave the imports intact so the consumer's Vite resolves them.
    /^virtual:/,
    // lucide-react: keep as a consumer dep import (per ADR 0039's
    // two-adapter convention; consumer's bundler tree-shakes per-icon).
    "lucide-react",
  ],
  onSuccess: "tsx scripts/build-css-modules.ts",
});
