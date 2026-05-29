import { defineSophieIntegration } from "@sophie/astro";
import { defineConfig } from "astro/config";
import { pedagogyIndexDumpIntegration } from "./integrations/pedagogy-index-dump.ts";
import { figures } from "./src/content/figures.ts";

// Phase 0 smoke target — throwaway. Renders the trimmed first ASTR 201
// reading through @sophie/* to prove the vertical slice end-to-end
// (ADR 0023 acceptance). Replaced by drannarosen/astr201 in Phase 1.
//
// Integrations:
//   1. defineSophieIntegration — the platform's main integration
//      (MDX + React + pagefind-postbuild). Per ADR 0082, the
//      consumer-owned figure registry is passed in so the injected
//      reading route + ChapterLayout can read it via
//      `virtual:sophie/figures`.
//   2. pedagogyIndexDumpIntegration — smoke-target-only addition for
//      Session 9 Area 3: writes `dist/.sophie-pedagogy-index.json`
//      so e2e specs can derive function-of-content assertions
//      instead of hardcoded structural counts.
export default defineConfig({
  // Base-path spike harness: read `base` from env so the non-root
  // consumer-deploy case (GitHub Pages `base: "/astr201"`) can be
  // exercised by a smoke build without a config edit. Unset → undefined
  // → Astro's default root base, so existing root behavior is unchanged.
  base: process.env.SOPHIE_SMOKE_BASE || undefined,
  integrations: [
    defineSophieIntegration({ figures }),
    pedagogyIndexDumpIntegration(),
  ],
});
