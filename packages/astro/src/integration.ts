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
 * Externalize Vite itself and any `vite/*` subpath from the SSR/prerender
 * bundles. Two distinct issues converge on the same fix:
 *
 *   1. `@vitejs/plugin-react@5.2.0` (transitive via `@astrojs/react@5.0.4`)
 *      does `await import("vite/internal")` for React Refresh's native
 *      wrapper. Vite 7.3.3 doesn't expose that subpath, so the bundler
 *      crashes unless `vite/internal` is external. (Phase 0 finding.)
 *
 *   2. Astro 6's prerender environment sets `resolve.noExternal: ["astro"]`
 *      ([astro/dist/core/build/plugins/plugin-internals.js]), forcing the
 *      whole `astro` package — including `astro/loaders` (the Content
 *      Layer `glob` loader) — into the prerender chunk. `astro/loaders`
 *      transitively imports `vite/module-runner` and friends; on Linux
 *      (no `fsevents`) the cold path drags rollup's `dist/native.js`
 *      (CJS, uses `__dirname`) into an ESM SSR chunk → build cascade.
 *      (Phase 1 finding; resolved 2026-05-10.)
 *
 * `build.rollupOptions.external` is applied at Rollup level, so it
 * carves `vite/*` back out even though Astro forces `astro` to be
 * bundled. Vite's own `ssr.external` / `resolve.external` fields are
 * typed `string[] | true` — they do *not* accept RegExp at runtime,
 * despite the type cast Phase 0 attempted.
 *
 * Use the regex-array form `[/^vite\//]`, NOT the function form
 * `(id) => /^vite\//.test(id)`. Empirically, Rollup processes string/
 * regex arrays at an earlier resolution phase that the commonjs-resolver
 * plugin consults; the function form fires too late and the resolver
 * still tries to deep-import "./internal" inside vite's own bundled
 * code. Verified by regression on macOS, 2026-05-10.
 *
 * TODO: tighten or remove when (a) `@vitejs/plugin-react` drops the
 * `vite/internal` dependency, *and* (b) `astro/loaders` lazy-imports
 * its Vite runtime dependencies (proposed upstream issue).
 */
const VITE_BUILD_EXTERNAL: (string | RegExp)[] = [/^vite\//];

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
