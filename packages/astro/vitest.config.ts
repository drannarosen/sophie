import { fileURLToPath } from "node:url";
import { getViteConfig } from "astro/config";
import type { ViteUserConfig as VitestViteUserConfig } from "vitest/config";

/**
 * The vitest re-export of Vite's `UserConfig` is augmented to include
 * `test?: VitestInlineConfig`. Astro 6.3 pulls Vite 7; vitest 4 pulls
 * Vite 8 — distinct modules, so the augmentation can't flow through.
 * We build the config under vitest's type (full `test` validation +
 * completion) and cast at the `getViteConfig` seam.
 */
type ViteUserConfigWithTest = VitestViteUserConfig & {
  test?: VitestViteUserConfig extends { test?: infer T } ? T : never;
};

/**
 * `@sophie/astro` is a library package, not an Astro project. To let
 * vitest parse `.astro` files (so axe-core tests can render real
 * components via `experimental_AstroContainer`), we wire `getViteConfig`
 * pointed at a fabricated minimal Astro project under
 * `test-fixtures/astro-project/`. That project carries the Astro Vite
 * plugin + `@astrojs/react` so Container API renders work end-to-end.
 *
 * `getViteConfig(userVite, inlineAstroConfig)` returns a Vite config
 * function; vitest resolves it lazily at test startup.
 *
 * Coverage `include` is narrowed to JS/TS so the v8 report doesn't list
 * `.astro` files as 0%-uncovered (they're exercised at smoke e2e, not
 * unit). See the original commentary below for the rolldown stderr quirk.
 */
const config: ViteUserConfigWithTest = {
  test: {
    // `root` here overrides the Astro project root (test-fixtures/...)
    // for the test runner's file resolution — keeps test discovery,
    // setup-file path, and coverage paths anchored at the package
    // root while Vite still resolves the Astro plugin chain from the
    // fabricated fixture root above.
    root: fileURLToPath(new URL("./", import.meta.url)),
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      // Narrow to JS/TS only so the coverage report doesn't list
      // `.astro` files as 0%-uncovered — they're exercised at smoke
      // e2e, not at this package's unit-test level.
      //
      // Known-issue caveat: v8 will still print a stderr "Failed to
      // parse <file>.astro" line for each .astro file Vite loaded
      // during setup. Its rolldown parser doesn't grok .astro source,
      // then `V8CoverageProvider.remapCoverage` gracefully excludes
      // them itself. The parse is gated by what V8 captured at
      // runtime, NOT by `coverage.include`/`coverage.exclude`, so
      // narrowing the include glob (as above) silences the *report*
      // listings but not the *parse-attempt stderr*. Cosmetic;
      // tests pass.
      //
      // If this noise ever becomes annoying enough to address, the
      // decision tree:
      //   1. Check if @vitest/coverage-v8 or rolldown has added an
      //      "exclude from parse" option since this was written
      //      (2026-05-14, vitest 4.1, @vitest/coverage-v8 4.1.5,
      //      rolldown 1.0.0-rc.18). If yes, use it.
      //   2. Otherwise file an upstream issue at
      //      github.com/vitest-dev/vitest with a minimal repro
      //      (any test suite that imports an .astro module).
      //   3. Last resort: wrap `vitest run --coverage` in a script
      //      that filters stderr — DON'T do this blindly, it can
      //      hide legitimate failures.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/index.ts",
        "**/*.d.ts",
        // Integration is exercised at the smoke target's e2e level,
        // not in this package's unit tests.
        "src/integration.ts",
        "src/mdx-config.ts",
        "src/client/**",
        // Test-only Astro project fixture.
        "test-fixtures/**",
      ],
    },
  },
};

// biome-ignore lint/suspicious/noExplicitAny: cross-vite-version seam
export default getViteConfig(config as any, {
  root: fileURLToPath(
    new URL("./test-fixtures/astro-project/", import.meta.url)
  ),
});
