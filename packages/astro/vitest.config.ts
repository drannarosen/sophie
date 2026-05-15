import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      // Narrow to JS/TS only so the coverage report doesn't list
      // `.astro` files as 0%-uncovered — they're exercised at smoke
      // e2e, not at this package's unit-test level. v8 will still
      // print a stderr "Failed to parse <file>.astro" message for
      // each .astro file Vite loaded (its rolldown parser doesn't
      // grok .astro source), then gracefully excludes them itself;
      // that noise is upstream v8-coverage behavior and not fixable
      // from this config. Cosmetic only; tests pass.
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
      ],
    },
  },
});
