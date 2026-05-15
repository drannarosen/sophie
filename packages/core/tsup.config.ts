import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "schema/index": "src/schema/index.ts",
    "audit/index": "src/audit/index.ts",
  },
  format: ["esm"],
  target: "node22",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: [/^@sophie\/core(\/|$)/],
});
