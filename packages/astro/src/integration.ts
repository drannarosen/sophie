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
 * Build-time externals for Rollup. Each entry is a module that Rollup
 * tries to resolve statically but should be left to the runtime ESM
 * loader.
 *
 * - `vite/internal`: @vitejs/plugin-react@5.2.0 (transitive via
 *   @astrojs/react@5.0.4) does `await import("vite/internal")` for
 *   React Refresh's native wrapper. Vite 7.3.3 doesn't expose that
 *   subpath, so Rollup's commonjs-resolver crashes at build time.
 *   Marking external lets the dynamic import fail at runtime where
 *   the plugin handles it gracefully.
 *   TODO: remove when @vitejs/plugin-react ships a version that drops
 *   the vite/internal dependency or Vite re-exports the path.
 *
 * - `fsevents`: macOS-only native file watcher. Rollup imports it
 *   defensively for chokidar's polyfill path; on Linux runners (CI) it
 *   doesn't resolve, and @vitejs/plugin-react's onwarn promotes the
 *   resolve-failure to a build error. Externalizing matches the
 *   pattern Vite/Rollup themselves use for fsevents and silences the
 *   error on non-macOS builds without affecting macOS dev (where it
 *   resolves and is used).
 */
const VITE_BUILD_EXTERNAL = ["vite/internal", "fsevents"];

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
