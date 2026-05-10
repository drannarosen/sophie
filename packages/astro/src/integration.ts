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

/**
 * `__dirname` / `__filename` polyfill prepended to every SSR/prerender
 * ESM chunk. Astro's `astro:content` runtime pulls in Vite's
 * module-runner during prerender, which transitively inlines rollup's
 * `dist/native.js` — a CJS module that uses bare `__dirname` to
 * locate its platform-specific `@rollup/rollup-*.node` binding. The
 * bundler converts CJS→ESM and polyfills `require` via
 * `createRequire(import.meta.url)` but does NOT polyfill `__dirname`,
 * so the prerender chunk crashes on Linux with
 * `__dirname is not defined in ES module scope`.
 *
 * On macOS the failure does not reproduce because a different
 * resolution path (with `fsevents` present) avoids dragging
 * rollup/native.js into the chunk. CI on Ubuntu hits the cold path.
 *
 * Banner is scoped to `.mjs` chunks via filename suffix, so the
 * client `_astro/*.js` bundle is unaffected. The aliased identifiers
 * (`___fu`, `___pd`) are unlikely to collide; ESM modules dedupe
 * imports of the same source even if someone else imports
 * `fileURLToPath`/`dirname` directly.
 */
const SSR_DIRNAME_POLYFILL_BANNER = [
  "import { fileURLToPath as ___fu } from 'node:url';",
  "import { dirname as ___pd } from 'node:path';",
  "const __filename = ___fu(import.meta.url);",
  "const __dirname = ___pd(__filename);",
].join("\n");

function ssrChunkBanner(chunk: { fileName?: string }): string {
  return chunk.fileName?.endsWith(".mjs") ? SSR_DIRNAME_POLYFILL_BANNER : "";
}

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
              // Astro 6's content layer pulls Vite's module-runner
              // into prerender chunks, and module-runner transitively
              // inlines rollup's native.js — which uses dynamic
              // `require()` to load platform-specific
              // `@rollup/rollup-${platform}` bindings. The default
              // `@rollup/plugin-commonjs` behavior shims dynamic
              // requires with a strict helper that throws "Could not
              // dynamically require...". Setting ignoreDynamicRequires
              // leaves those calls intact so they resolve at runtime
              // through `createRequire(import.meta.url)` (which is
              // already injected as `__require` in our chunks).
              // Combined with the __dirname banner above, this makes
              // rollup's native binding loader work on Linux CI.
              commonjsOptions: {
                ignoreDynamicRequires: true,
              },
              rollupOptions: {
                external: VITE_BUILD_EXTERNAL,
                output: {
                  banner: ssrChunkBanner,
                },
              },
            },
          },
        });
        logger.info("Sophie integration loaded (MDX + React)");
      },
    },
  };
}
