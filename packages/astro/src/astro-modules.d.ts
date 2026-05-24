/**
 * Type shim for `.astro` module imports from TS test files.
 *
 * `.astro` files don't have static `.d.ts` siblings (Astro components are
 * compiled at runtime), but tests that render them via Container API
 * (W4c Batch 3b) import them as default exports. The Astro Vite plugin
 * resolves them at test-runtime; this shim just satisfies `tsc` so the
 * package's `pnpm typecheck` stays clean.
 *
 * Default-export `unknown` deliberately — the Container API accepts any
 * component reference and the test-utils helper casts internally; we
 * don't want false confidence in props/slots typing at this seam.
 */
declare module "*.astro" {
  const Component: unknown;
  export default Component;
}
