import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "contract/index": "src/contract/index.ts",
    "runtime/index": "src/runtime/index.ts",
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
