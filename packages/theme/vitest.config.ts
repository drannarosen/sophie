import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Cap workers at half the cores so concurrent `turbo run test:unit`
    // package runs don't oversubscribe the box (the flake source).
    maxWorkers: "50%",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "json-summary"],
      // Narrow to JS/TS so v8 coverage never hands non-source files to
      // rolldown (which throws a RolldownError). Mirrors astro/cli.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/index.ts"],
      // Coverage ratchet (H3, 2026-05-30): floors, not targets. Set ~1pt
      // below measured (89/100/-/92) so a deleted test or new-untested
      // file trips the gate; the buffer absorbs v8 attribution jitter.
      // Bump UPWARD as coverage rises, never down. Self-enforcing — the
      // `vitest run --coverage` in CI's unit job exits non-zero below floor.
      // `functions` is intentionally OMITTED: @sophie/theme is token DATA
      // (anchors.ts + tokens.ts); v8 reports a single function, so a
      // functions floor would gate on one item — brittle and meaningless.
      thresholds: {
        statements: 87,
        branches: 99,
        lines: 91,
      },
    },
  },
});
