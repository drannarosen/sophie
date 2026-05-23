import react from "@astrojs/react";
import { defineConfig } from "astro/config";

/**
 * Fabricated minimal Astro project used ONLY by vitest to satisfy
 * `getViteConfig`'s "Astro project root" requirement (so its Vite plugin
 * chain can parse `.astro` files in unit tests). NOT shipped, NOT
 * referenced by the package's runtime exports.
 *
 * Wire `@astrojs/react` so the Container API can render components that
 * include client islands (`<TopBar />` etc.). The page in `src/pages/`
 * is a placeholder — Container API doesn't route through pages, but
 * Astro's config validator requires a non-empty pages dir at config-
 * resolve time.
 *
 * Owned by `packages/astro/vitest.config.ts`; do not import elsewhere.
 */
export default defineConfig({
  integrations: [react()],
});
