import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^(.+)\.module\.css\.js$/, replacement: "$1.module.css" }],
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
        "**/*.stories.tsx",
        "**/index.ts",
        "**/*.d.ts",
      ],
    },
  },
});
