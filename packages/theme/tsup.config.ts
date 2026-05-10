import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    tokens: "src/tokens.ts",
  },
  format: ["esm"],
  target: "node22",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  onSuccess: "tsx scripts/build-theme.ts",
});
