import { defineSophieIntegration } from "@sophie/astro";
import { defineConfig } from "astro/config";
import { figures } from "./src/content/figures.ts";

// PR-D1 (ADR-0082 follow-up): packed-copy consumer outside the pnpm
// workspace. The reading route + ChapterLayout are injected by
// @sophie/astro via `virtual:sophie/figures`; the consumer-owned
// registry passed here is the source of truth.
//
// Per the cross-repo consumer pattern (astr201), the
// `optimizeDeps.include` entries declare @observablehq/plot's nested
// dependency for Vite's pre-bundling step — without them the dev
// server fails the first time a MultiRep/plot-using component renders.
export default defineConfig({
  integrations: [defineSophieIntegration({ figures })],
  vite: {
    optimizeDeps: {
      include: [
        "@sophie/components",
        "@sophie/components > @observablehq/plot",
        "@sophie/components > @observablehq/plot > interval-tree-1d",
      ],
    },
  },
});
