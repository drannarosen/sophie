import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      include: ["src/**"],
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
