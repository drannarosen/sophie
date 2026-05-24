# `astro-project/` test fixture

Fabricated minimal Astro project root for `@sophie/astro`'s
vitest config. Required by `getViteConfig` (`vitest.config.ts:91-93`)
so Vite can resolve Astro's plugin chain and parse `.astro` files
inside unit tests.

**Sole consumer:** `packages/astro/vitest.config.ts`.

**Not shipped:** this directory is excluded from coverage
(`vitest.config.ts:83`) and from package builds.

If you find yourself editing `astro.config.mjs` or `src/pages/index.astro`
here, double-check whether the real fix belongs in
`packages/astro/vitest.config.ts` instead.
