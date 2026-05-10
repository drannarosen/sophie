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
 * `@vitejs/plugin-react@5.2.0` (transitive via `@astrojs/react@5.0.4`)
 * does `await import("vite/internal")` for React Refresh's native
 * wrapper. Vite 7.3.3 doesn't expose that subpath; bundling reaches it,
 * Rollup's commonjs-resolver crashes. Marking the subpath external lets
 * the dynamic import fail at runtime where the plugin handles it.
 *
 * This is a CLIENT-bundle Phase 0 finding, narrow in scope. The broader
 * "astro pulls vite/esbuild into the prerender bundle on Linux" issue
 * is solved structurally below by `narrowAstroPrerenderNoExternal()`,
 * not by externalization.
 *
 * TODO: remove when @vitejs/plugin-react drops the vite/internal
 * dependency or Vite re-exports the path.
 */
const VITE_BUILD_EXTERNAL: (string | RegExp)[] = ["vite/internal"];

/**
 * Override Astro 6's prerender-environment `resolve.noExternal: ["astro"]`
 * rule ([astro/dist/core/build/plugins/plugin-internals.js]).
 *
 * Astro's rule bundles the entire `astro` package into the prerender
 * chunk, which transitively pulls bare `vite` and `esbuild` imports
 * (from `astro/dist/core/create-vite.js`, `astro/dist/core/client-directive/build.js`,
 * etc.) into the bundle too. Those build tools have OS-conditional
 * optional imports — rollup → `fsevents` (macOS-only) being the
 * canonical example — that fail to resolve at bundle time on Linux
 * runners. Externalizing them shifts the failure to runtime, where
 * Node ESM has to resolve the bare specifier from the chunk's
 * `dist/.prerender/chunks/` location, which fails for any package
 * not directly listed in the consumer's `package.json`.
 *
 * The structural fix: don't bundle astro at all for the prerender
 * environment. Astro is reachable from the consumer's `node_modules/`
 * via pnpm's symlink, and from astro's symlinked location all of its
 * transitive dependencies (vite, esbuild, etc.) are reachable too —
 * Node ESM handles the chain cleanly without bundling. For static
 * SSG (`output: "static"`), the prerender chunk runs on the build
 * machine where node_modules is fully populated, so externalizing
 * astro is safe.
 *
 * This plugin runs at `configResolved`, after Astro's
 * `pluginInternals.configEnvironment` has set `noExternal: ["astro"]`.
 * It removes the literal `"astro"` entry from the prerender env's
 * `resolve.noExternal` array. Sophie's own packages
 * (`@sophie/astro`, `@sophie/components`) remain noExternal via the
 * separate `SOPHIE_NO_EXTERNAL` rule because their CSS Module
 * side-effects require bundling.
 *
 * Discovered Phase 1 step 1, 2026-05-10. See
 * `~/.claude/plans/we-re-starting-sophie-phase-twinkling-dusk.md` and
 * the upstream issue (TODO: link once filed) for context.
 */
// Inline structural type for the slice of Vite's `ResolvedConfig` we read
// + mutate. Avoids importing `Plugin` from `vite` directly so the
// type-check resolves cleanly regardless of which `vite` install
// TypeScript picks up (the workspace pnpm store, or any ambient install
// reachable via Node's walk-up resolution).
type ResolvedConfigPrerenderSlice = {
  environments?: {
    prerender?: {
      resolve?: {
        noExternal?: unknown;
      };
    };
  };
};

function narrowAstroPrerenderNoExternal() {
  return {
    name: "@sophie/astro:narrow-prerender-noexternal",
    configResolved(config: unknown) {
      const c = config as ResolvedConfigPrerenderSlice;
      const noExternal = c.environments?.prerender?.resolve?.noExternal;
      if (!Array.isArray(noExternal)) return;
      const idx = noExternal.indexOf("astro");
      if (idx >= 0) noExternal.splice(idx, 1);
    },
  };
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
            plugins: [narrowAstroPrerenderNoExternal()],
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
