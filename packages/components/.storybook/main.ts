import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const pedagogyIndexFixture = fileURLToPath(
  new URL("./pedagogy-index-fixture.ts", import.meta.url)
);

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes"],
  typescript: {
    check: false,
  },
  async viteFinal(viteConfig) {
    // Components import `./Foo.module.css.js` (a tsup-emitted ESM
    // companion). At dev/test time Vite's native CSS Modules support
    // resolves the underlying `.module.css` directly. This alias mirrors
    // packages/components/vitest.config.ts.
    const existing = viteConfig.resolve?.alias;
    const aliasArray = Array.isArray(existing)
      ? existing
      : existing
        ? Object.entries(existing).map(([find, replacement]) => ({
            find,
            replacement: String(replacement),
          }))
        : [];

    return {
      ...viteConfig,
      resolve: {
        ...viteConfig.resolve,
        alias: [
          ...aliasArray,
          { find: /^(.+)\.module\.css\.js$/, replacement: "$1.module.css" },
          // `virtual:sophie/pedagogy-index` is produced at build
          // time by @sophie/astro's Vite plugin (ADR 0038). In
          // Storybook isolation, alias to a fixture with sample
          // entries so <GlossaryTerm> stories render meaningfully.
          {
            find: "virtual:sophie/pedagogy-index",
            replacement: pedagogyIndexFixture,
          },
        ],
      },
    };
  },
};

export default config;
