import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/bin.ts",
    "src/index.ts",
    "src/commands/start.ts",
    "src/commands/preview.ts",
    "src/commands/audit.ts",
    "src/commands/dev.ts",
    "src/commands/validate.ts",
    "src/commands/figures.ts",
    "src/lib/resolve-consumer-root.ts",
    "src/lib/detect-monorepo.ts",
    "src/lib/spawn-orchestrator.ts",
    "src/lib/prefix-stream.ts",
    "src/lib/build-if-missing.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
});
