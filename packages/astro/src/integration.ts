import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import type { AstroIntegration } from "astro";
import { sophieMdxOptions } from "./mdx-config.ts";

export interface SophieIntegrationOptions {
  // Reserved for future. Phase 5 will add `profile` and others.
  readonly _reserved?: never;
}

/**
 * Workspace packages whose internals reference CSS Module wrappers via
 * relative paths. Marking them `noExternal` forces Vite to bundle them
 * (rather than externalize for Node ESM), so the CSS plugin handles
 * `.module.css.js` companions correctly during SSR/build.
 *
 * Without this, consumers see `Unknown file extension ".css"` from
 * Node's ESM loader (per ADR 0027 — discovered during step 7).
 */
const SOPHIE_NO_EXTERNAL = ["@sophie/astro", "@sophie/components"];

/**
 * Externalize `vite` and `esbuild` (bare + subpaths) from the
 * SSR/prerender bundle. Astro 6 sets `resolve.noExternal: ["astro"]`
 * on the prerender environment ([astro/dist/core/build/plugins/plugin-internals.js]),
 * which bundles the entire `astro` package and transitively pulls
 * bare `vite` (from `astro/dist/core/create-vite.js`,
 * `astro/dist/core/middleware/vite-plugin.js`, etc.) and bare
 * `esbuild` (from `astro/dist/core/client-directive/build.js`,
 * `astro/dist/env/vite-plugin-import-meta-env.js`) into the bundle.
 * Those build tools have OS-conditional optional imports — rollup's
 * `await import('fsevents')` being canonical — that fail to resolve
 * at bundle time on Linux runners.
 *
 * Externalizing them at the rollup level prevents the bundling.
 * They're then loaded from `node_modules` at runtime by the prerender
 * chunk. **Consumers must declare `vite` and `esbuild` as
 * devDependencies** so pnpm symlinks them into the consumer's
 * `node_modules/`, where Node ESM can resolve them via walk-up
 * resolution from the prerender chunk's location. `@sophie/astro`
 * declares both as peerDependencies to document this requirement.
 *
 * Why this works at runtime: rollup's `await import('fsevents')` is
 * inside a try/catch, so the optional import fails *gracefully* on
 * Linux at runtime — the bundling-time resolver couldn't see the
 * try/catch and choked at static analysis time. Once externalized,
 * runtime gets to use the try/catch path.
 *
 * Phase 1 finding, 2026-05-10. Three earlier fix attempts
 * (61d9ae0, a9633c5, a035dbb) iterated through subpath externals,
 * broadened externals, and a `configResolved` plugin override of
 * Astro's `noExternal: ["astro"]` — the override didn't take effect
 * (Vite 7's environment config appears immutable post-`configResolved`).
 * Switched to consumer-declared peerDeps as the empirical fix.
 *
 * `vite/internal` (the original Phase 0 narrow case for
 * `@vitejs/plugin-react`'s React Refresh dynamic import) is covered
 * by `/^vite($|\/)/`.
 *
 * Use the **regex-array form**, NOT a function. Empirically (Vite
 * 7.3.3), Rollup processes string/regex arrays at an earlier
 * resolution phase that the commonjs-resolver plugin consults; the
 * function form fires too late and the resolver tries to deep-import
 * inside the externalized package's bundled code.
 *
 * TODO: tighten or remove when Astro narrows `noExternal: ["astro"]`
 * to specific runtime entry-points instead of the whole package
 * (proposed upstream issue, B+D hybrid path D).
 */
const VITE_BUILD_EXTERNAL: (string | RegExp)[] = [
  /^vite($|\/)/,
  /^esbuild($|\/)/,
];

export function defineSophieIntegration(
  _options?: SophieIntegrationOptions
): AstroIntegration {
  return {
    name: "@sophie/astro",
    hooks: {
      "astro:config:setup": ({ updateConfig, logger }) => {
        updateConfig({
          integrations: [mdx(sophieMdxOptions), react()],
          vite: {
            ssr: {
              noExternal: SOPHIE_NO_EXTERNAL,
            },
            build: {
              rollupOptions: {
                external: VITE_BUILD_EXTERNAL,
              },
            },
          },
        });
        logger.info("Sophie integration loaded (MDX + React)");
      },
    },
  };
}
