import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // Source uses `.module.css.js` to satisfy the build pipeline. At
      // test time, redirect to the underlying `.module.css` so Vite's
      // native CSS Modules support kicks in (no postcss-modules build
      // needed before tests).
      { find: /^(.+)\.module\.css\.js$/, replacement: "$1.module.css" },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test-setup.ts"],
    // Cap workers at half the cores so concurrent `turbo run test:unit`
    // package runs don't oversubscribe the box (the flake source).
    maxWorkers: "50%",
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      // Narrow to JS/TS so v8 coverage never hands non-source files
      // (e.g. `_template/README.md`, `.module.css`) to rolldown, which
      // throws a RolldownError parsing them as JS. Mirrors astro/cli.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.stories.tsx",
        "**/index.ts",
        "**/*.d.ts",
        "src/css-modules.d.ts",
      ],
    },
  },
});
