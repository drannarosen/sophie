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
 * Externalize Astro's transitive build-tool dependencies from the
 * SSR/prerender bundles. Astro 6's prerender env sets
 * `resolve.noExternal: ["astro"]` ([astro/dist/core/build/plugins/plugin-internals.js]),
 * forcing the entire `astro` package into the bundle. Astro imports
 * bare `vite` and bare `esbuild` from many of its own `.js` files
 * (e.g. `astro/dist/core/create-vite.js`,
 * `astro/dist/core/client-directive/build.js`), so those build tools
 * get bundled too — and they have OS-conditional optional imports
 * (rollup → `fsevents` macOS-only) that fail to resolve at bundle
 * time on Linux runners.
 *
 * Two patterns cover the immediate failure surface:
 *   - `/^vite($|\/)/`   bare `vite` + any `vite/*` subpath. Bare
 *                        catches `import * as vite from "vite"`;
 *                        subpath catches `vite/internal` (the Phase 0
 *                        @vitejs/plugin-react case) and `vite/module-runner`
 *                        (the Phase 1 astro/loaders case). Externalizing
 *                        vite breaks the chain to rollup before it starts;
 *                        rollup is only type-imported by astro (`.d.ts`),
 *                        not value-imported, so it doesn't need its own rule.
 *   - `/^esbuild($|\/)/` bare `esbuild` + subpaths. Astro directly value-
 *                        imports esbuild from two `.js` files (build.js,
 *                        vite-plugin-import-meta-env.js). Esbuild has OS-
 *                        native binaries and won't bundle cleanly.
 *
 * Use the **regex-array form**, NOT the function form
 * `(id) => /^vite\//.test(id)`. Empirically, Rollup processes string/
 * regex arrays at an earlier resolution phase that the commonjs-resolver
 * plugin consults; the function form fires too late and the resolver
 * still tries to deep-import inside the externalized package's bundled
 * code. Verified by macOS regression, 2026-05-10.
 *
 * Vite's own `ssr.external` / `resolve.external` fields are typed
 * `string[] | true` — they do *not* accept RegExp at runtime, despite
 * the type cast Phase 0 attempted. `build.rollupOptions.external`
 * runs at Rollup level and accepts both strings and RegExp in array
 * form, so it's the correct knob.
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
