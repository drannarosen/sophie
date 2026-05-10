import { defineSophieIntegration } from "@sophie/astro";
import { defineConfig } from "astro/config";

// Phase 0 smoke target — throwaway. Renders the trimmed first ASTR 201
// reading through @sophie/* to prove the vertical slice end-to-end
// (ADR 0023 acceptance). Replaced by drannarosen/astr201 in Phase 1.
export default defineConfig({
  integrations: [defineSophieIntegration()],
});
