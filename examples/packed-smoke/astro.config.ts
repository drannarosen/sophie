import { defineSophieIntegration } from "@sophie/astro";
import { defineConfig } from "astro/config";
import { figures } from "./src/content/figures.ts";

// PR-D1 (ADR-0082 follow-up): packed-copy consumer outside the pnpm
// workspace. The reading route + ChapterLayout are injected by
// @sophie/astro via `virtual:sophie/figures`; the consumer-owned
// registry passed here is the source of truth.
//
// No `optimizeDeps` band-aid: @sophie/components bundles @observablehq/plot
// (+ its CJS-only `interval-tree-1d`) at build time via tsup `noExternal`,
// so the dist is clean ESM and consumers need zero Vite pre-bundling config
// for Plot. Verified by the BlackbodyExplorer render e2e against this packed
// consumer (ADR 0022 amendment;
// docs/plans/2026-05-28-distributability-design.md).
export default defineConfig({
  integrations: [defineSophieIntegration({ figures })],
});
