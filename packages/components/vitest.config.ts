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
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      include: ["src/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/index.ts",
        "**/*.d.ts",
        "src/css-modules.d.ts",
      ],
    },
  },
});
