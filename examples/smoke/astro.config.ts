import { defineSophieIntegration } from "@sophie/astro";
import { defineConfig } from "astro/config";
import { pedagogyIndexDumpIntegration } from "./integrations/pedagogy-index-dump.ts";

// Phase 0 smoke target — throwaway. Renders the trimmed first ASTR 201
// reading through @sophie/* to prove the vertical slice end-to-end
// (ADR 0023 acceptance). Replaced by drannarosen/astr201 in Phase 1.
//
// Integrations:
//   1. defineSophieIntegration — the platform's main integration
//      (MDX + React + pagefind-postbuild).
//   2. pedagogyIndexDumpIntegration — smoke-target-only addition for
//      Session 9 Area 3: writes `dist/.sophie-pedagogy-index.json`
//      so e2e specs can derive function-of-content assertions
//      instead of hardcoded structural counts.
export default defineConfig({
  integrations: [defineSophieIntegration(), pedagogyIndexDumpIntegration()],
});
