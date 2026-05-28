import fs from "node:fs";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import type { FigureRegistryEntry } from "@sophie/core/schema";
import type { AstroIntegration } from "astro";
import { loadCourseSpec } from "./lib/course-spec-loader.ts";
import { courseSpecVirtualModule } from "./lib/course-spec-virtual-module.ts";
import { figuresVirtualModule } from "./lib/figures-virtual-module.ts";
import { mdxAuthorTrapsVitePlugin } from "./lib/mdx-plugins/mdx-author-traps.ts";
import { skillReviewResolverVitePlugin } from "./lib/mdx-plugins/skill-review-resolver-vite.ts";
import { loadConsumerRegistry } from "./lib/notation-registry-loader.ts";
import { buildPagefindIndex } from "./lib/pagefind-postbuild.ts";
import { writePedagogyAuditJson } from "./lib/pedagogy-audit/emit.ts";
import {
  auditExitCode,
  formatAuditReport,
  formatAuditThrowMessage,
} from "./lib/pedagogy-audit/format.ts";
import { runPedagogyAudit } from "./lib/pedagogy-audit/runner.ts";
import { indexAccumulator } from "./lib/pedagogy-index/accumulator.ts";
import { pedagogyIndexVirtualModule } from "./lib/pedagogy-index-virtual-module.ts";
import { extractContractValidations } from "./lib/validation/extractor.ts";
import { sophieMdxOptions } from "./mdx-config.ts";

export interface SophieIntegrationOptions {
  /**
   * Consumer-supplied figure registry (name-indexed map). Exposed to
   * the platform-shipped ChapterLayout + reading route through the
   * `virtual:sophie/figures` virtual module per ADR 0082. Required —
   * the injected `/units/[unit]/reading` route imports figures from
   * this virtual module, so consumers MUST pass their registry.
   */
  readonly figures: Record<string, FigureRegistryEntry>;
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
  options: SophieIntegrationOptions
): AstroIntegration {
  return {
    name: "@sophie/astro",
    hooks: {
      "astro:config:setup": ({ config, injectRoute, updateConfig, logger }) => {
        const topicsDir = resolve(process.cwd(), "src/content/topics");

        // Load + validate course.sophie.yaml at config-setup. Returns
        // null when the consumer hasn't authored a spec yet (back-
        // compat with consumers that haven't migrated to v0.2 chrome);
        // throws curated error on malformed/invalid spec (author
        // errors that must surface at config-setup, not silently
        // degrade to "no chrome routes"). Course-info projection
        // sprint (docs/plans/2026-05-26-course-info-projection-*.md).
        const consumerRoot = fileURLToPath(config.root);
        const courseSpec = loadCourseSpec(consumerRoot);

        updateConfig({
          integrations: [mdx(sophieMdxOptions), react()],
          vite: {
            // Cast to `never`: @sophie/astro resolves to vite@8 while
            // Astro 6 ships vite@7 types — two PluginOption shapes
            // coexist and TS structural-checks them as incompatible.
            // Vite is duck-typed at runtime; the cast bypasses the
            // version-mismatch only. Revisit when Astro 6 → vite@8 or
            // when @sophie/astro pins to a single vite major.
            plugins: [
              pedagogyIndexVirtualModule() as never,
              // ADR 0079 (W4b R+CR follow-up C3) — surgical HMR cache
              // invalidation for the SkillReview self-closing resolver.
              // Production builds don't fire handleHotUpdate; this only
              // engages in dev mode.
              skillReviewResolverVitePlugin({ topicsDir }) as never,
              // ADR 0082 — consumer-supplied figure registry exposed as
              // `virtual:sophie/figures` for the platform-shipped
              // ChapterLayout + reading route. Captured by closure at
              // config-parse time; figures changes require a dev-
              // server restart (no HMR by design).
              figuresVirtualModule(options.figures) as never,
              // Course-info projection (2026-05-26) — consumer's
              // parsed course.sophie.yaml exposed as
              // `virtual:sophie/course-spec` for chrome components +
              // info-page layouts. Always registered so
              // `import { courseSpec } from "virtual:sophie/course-spec"`
              // resolves at build time even when the consumer has no
              // spec yet (the export is `null` in that case;
              // TextbookLayout + chrome components handle null
              // explicitly).
              courseSpecVirtualModule(courseSpec) as never,
              // Pre-parse author-trap lint (issues #190, #193) — scans
              // raw `.mdx` text for multi-line inline `$...$` and raw
              // `<` before a non-letter, and throws curated errors with
              // file:line:col before MDX/acorn can fail with opaque
              // "Expecting Unicode escape sequence" / "Unexpected
              // character before name" errors. `enforce: "pre"` so it
              // beats `@astrojs/mdx`'s transform to the source.
              mdxAuthorTrapsVitePlugin() as never,
            ],
            ssr: {
              noExternal: SOPHIE_NO_EXTERNAL,
            },
            build: {
              rollupOptions: {
                external: VITE_BUILD_EXTERNAL,
              },
            },
            // Single React instance across the consumer app, the
            // integration, and @sophie/components — React is a
            // peerDependency of @sophie/components (externalized in its
            // tsup build), so without dedupe a consumer can resolve two
            // copies and hit hook-state / hydration (#418) errors. Belt-
            // and-suspenders: packed-smoke already proves single-instance,
            // this guards future consumers. (Platform-hardening audit P2.1
            // — the non-band-aid half; the optimizeDeps half is obsoleted
            // by @sophie/components bundling Plot at source, ADR 0022.)
            resolve: {
              dedupe: ["react", "react-dom"],
            },
          },
        });

        // ADR 0082 — inject the canonical reading route from
        // @sophie/astro. The route imports figures from
        // virtual:sophie/figures (wired above) and ChapterLayout from
        // the platform package, so consumers no longer maintain their
        // own copy.
        injectRoute({
          pattern: "/units/[unit]/reading",
          entrypoint: "@sophie/astro/routes/reading.astro",
        });

        // ADR 0073 Amendment 1 §7 — practice route mirrors reading.
        // Retires issue #189's "discovered-but-unrouted" warning: the
        // `/units/<unit>/practice` URL now exists for every unit that
        // ships a practice.mdx artifact.
        injectRoute({
          pattern: "/units/[unit]/practice",
          entrypoint: "@sophie/astro/routes/practice.astro",
        });

        // ADR 0082 § A2.6 — warn when a consumer ships a file at the
        // same route pattern as the injected route. Per Astro #3809,
        // file-based routes win over injected routes silently; surfacing
        // this at config-setup time prevents confusion when the
        // platform route appears not to apply.
        // (consumerRoot computed above for the course-spec loader.)
        const consumerRoutePath = path.join(
          consumerRoot,
          "src/pages/units/[unit]/reading.astro"
        );
        if (fs.existsSync(consumerRoutePath)) {
          logger.warn(
            `[sophie] Consumer has src/pages/units/[unit]/reading.astro at ${consumerRoutePath}. ` +
              `This will shadow the injected route from @sophie/astro/routes/reading.astro ` +
              `(Astro issue #3809). Delete the consumer file to use the platform's reading route. ` +
              `See ADR-0082 § A2.6.`
          );
        }

        // ─── Course-info projection (2026-05-26) ──────────────────
        // When the consumer has authored course.sophie.yaml, inject
        // the course-website chrome routes: landing + per-section
        // landings + per-info_pages static pages. Shadow-warn each
        // mirrors ADR 0082 §A2.6 per fix M4.
        if (courseSpec) {
          // Course landing — pattern "/" — dispatcher reads
          // courseSpec.landing.layout (or integration override).
          injectRoute({
            pattern: "/",
            entrypoint: "@sophie/astro/routes/course-landing.astro",
          });
          const consumerIndexPath = path.join(
            consumerRoot,
            "src/pages/index.astro"
          );
          if (fs.existsSync(consumerIndexPath)) {
            logger.warn(
              `[sophie] Consumer has src/pages/index.astro at ${consumerIndexPath}. ` +
                `This will shadow the injected landing route from @sophie/astro/routes/course-landing.astro ` +
                `(Astro issue #3809). Delete the consumer file to use the platform's landing. ` +
                `See ADR-0082 § A2.6.`
            );
          }

          // Section landing — pattern "/sections/[section]/" —
          // getStaticPaths in the route file enumerates sections
          // from the content collection.
          injectRoute({
            pattern: "/sections/[section]/",
            entrypoint: "@sophie/astro/routes/section-landing.astro",
          });

          // Info pages — one static route per info_pages slug. Each
          // route file reads its slug from Astro.url.pathname (per
          // fix B3 — no getStaticPaths because the URL pattern is
          // parameter-less).
          for (const slug of Object.keys(courseSpec.info_pages ?? {})) {
            injectRoute({
              pattern: `/${slug}/`,
              entrypoint: "@sophie/astro/routes/info-page.astro",
            });
            const consumerSlugPath = path.join(
              consumerRoot,
              `src/pages/${slug}.astro`
            );
            if (fs.existsSync(consumerSlugPath)) {
              logger.warn(
                `[sophie] Consumer has src/pages/${slug}.astro at ${consumerSlugPath}. ` +
                  `This will shadow the injected /${slug}/ route from @sophie/astro/routes/info-page.astro. ` +
                  `Delete the consumer file to use the platform's info-page dispatcher. ` +
                  `See ADR-0082 § A2.6.`
              );
            }
          }
        }

        logger.info("Sophie integration loaded (MDX + React)");
      },
      "astro:build:done": async ({ dir, logger }) => {
        const distPath = fileURLToPath(dir);
        logger.info(`Building Pagefind index in ${distPath}/pagefind/`);
        await buildPagefindIndex(distPath);
        logger.info("Pagefind index complete");

        // ADR 0088 — corpus-wide pedagogy audit at build-done (the prod
        // authoritative trigger; dev keeps TextbookLayout's per-render
        // console audit for HMR feedback). By build-done every route has
        // pre-rendered, so TextbookLayout's accumulator setters
        // (sections/units/artifacts/figures + the remark-plugin-populated
        // definitions/equations/figureUsages) have all run. The contract
        // validations are extracted HERE (once) rather than per-page in the
        // layout — repoRoot = process.cwd() matches the layout's V5
        // evidence-resolution base. The artifact is written BEFORE the gate
        // throw so CI can inspect it even on a failing build.
        const repoRoot = process.cwd();
        const { entries: contractValidations, findings: extractorFindings } =
          await extractContractValidations(repoRoot);
        indexAccumulator.setContractValidations(
          contractValidations,
          extractorFindings
        );
        const index = indexAccumulator.asPedagogyIndex();
        const draftUnitIds = index.units
          .filter((u) => u.status === "draft")
          .map((u) => u.id);
        const { registry: notationRegistry } = loadConsumerRegistry(repoRoot);
        const auditReport = runPedagogyAudit(index, {
          draftUnitIds,
          repoRoot,
          notationRegistry,
        });
        await writePedagogyAuditJson(distPath, auditReport);
        logger.info(formatAuditReport(auditReport));
        if (auditExitCode(auditReport) !== 0) {
          throw new Error(formatAuditThrowMessage(auditReport));
        }
      },
    },
  };
}
