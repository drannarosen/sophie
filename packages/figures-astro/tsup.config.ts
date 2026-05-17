import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "zod",
    /^@sophie\//,
    /\.module\.css(\.js)?$/,
    "lucide-react",
    "katex",
    "@observablehq/plot",
  ],
  onSuccess: "tsx scripts/build-css-modules.ts",
});
