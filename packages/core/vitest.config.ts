import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Cap workers at half the cores so concurrent `turbo run test:unit`
    // package runs don't oversubscribe the box (the flake source). The
    // "50%" string is resolved relative to CPU count by vitest 4,
    // container-aware on CI. `poolOptions` was removed in vitest 4.
    maxWorkers: "50%",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      // Narrow to JS/TS so v8 coverage never hands non-source files
      // (e.g. `__fixtures__/*.yaml`) to rolldown, which throws a
      // RolldownError parsing them as JS. Mirrors the astro/cli configs.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/index.ts"],
    },
  },
});
