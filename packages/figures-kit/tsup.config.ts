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
  ],
  // CSS Modules: emit companion .module.css.js shims so consumers can
  // `import styles from "./Foo.module.css.js"`. Mirrors the
  // @sophie/components pattern (per packages/components/tsup.config.ts
  // + scripts/build-css-modules.ts).
  onSuccess: "tsx scripts/build-css-modules.ts",
});
