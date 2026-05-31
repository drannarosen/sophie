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
      // Coverage ratchet (H3, 2026-05-30): floors, not targets. Floors are
      // set ~1pt below measured, ratcheting UP only when real coverage rises
      // — never lowered to make a drop pass. The buffer absorbs v8
      // attribution jitter so a deleted test or new-untested file trips the
      // gate without flaking on noise. Self-enforcing — the
      // `vitest run --coverage` in CI's unit job exits non-zero below floor.
      // Measured 96.77 / 93.15 / 92.30 / 97.32 (s/b/f/l) → floors below.
      thresholds: {
        statements: 96,
        branches: 92,
        functions: 91,
        lines: 96,
      },
    },
  },
});
