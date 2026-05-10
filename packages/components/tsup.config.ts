import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "contract/index": "src/contract/index.ts",
    "runtime/index": "src/runtime/index.ts",
    "components/Callout/index": "src/components/Callout/index.ts",
    "components/Figure/index": "src/components/Figure/index.ts",
  },
  format: ["esm"],
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "idb",
    "zod",
    /^@sophie\//,
    // CSS Module companions (.module.css.js) are emitted by
    // scripts/build-css-modules.ts at onSuccess time; mark external so
    // tsup leaves the import statements intact in the output JS.
    /\.module\.css(\.js)?$/,
  ],
  onSuccess: "tsx scripts/build-css-modules.ts",
});
