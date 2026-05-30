import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Cap workers at half the cores so concurrent `turbo run test:unit`
    // package runs don't oversubscribe the box (the flake source).
    maxWorkers: "50%",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/bin.ts", // shebang-only entry; covered transitively
        "src/index.ts", // citty subCommands composition root; covered transitively
        "src/commands/audit.ts", // Phase 6 placeholder; throws-only stub
        // ADR 0094 — I/O boundaries verified by a real `sophie figures`
        // run (the `.astro`-glue policy), not unit coverage. The
        // decidable logic lives in `lib/diff-figures.ts` +
        // `lib/plan-downscale.ts` (both 100%-covered); these shells only
        // wire jiti / sharp / process.exit around it.
        "src/commands/figures.ts",
        "src/lib/load-figure-registry.ts",
        "src/**/*.test.ts",
      ],
      reporter: ["text", "html"],
      thresholds: {
        // Ratchet (bump up as coverage rises, never down). Raised from
        // 75/70/75/75 after WS2 added the 100%-covered figure diff +
        // downscale-plan logic (measured 83.6/73.5/86.4/83.3, ADR 0094).
        statements: 82,
        branches: 72,
        functions: 85,
        lines: 82,
      },
    },
  },
});
