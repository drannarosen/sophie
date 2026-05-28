import { expect, test } from "@playwright/test";

/**
 * Distributability linchpin (ADR 0022 amendment;
 * docs/plans/2026-05-28-distributability-design.md).
 *
 * `<BlackbodyExplorer>` is the sole @observablehq/plot consumer. Plot
 * pulls a CJS-only transitive dep (`interval-tree-1d`); @sophie/components
 * bundles Plot at build time via tsup `noExternal`, so this packed-tarball
 * consumer needs ZERO `optimizeDeps` config (the band-aid this work
 * removed). The figure also lives behind the `@sophie/components/figures`
 * subpath entry, auto-imported by the Sophie remark plugin — so this test
 * exercises the full production path: auto-import → subpath resolution →
 * bundled-Plot execution, in a real file:-packed consumer (workspace smoke
 * cannot, since pnpm resolves workspace specs to source, not built dist/).
 *
 * Plot injects its `<svg>` into the figure's host div from a client-side
 * `useEffect`, so the SVG's presence is positive proof that the island
 * hydrated AND Plot ran without a module-resolution / CJS-interop failure.
 * Also asserts the page emits no runtime errors (a broken Plot import would
 * surface as a pageerror, not a missing-SVG).
 */
test("BlackbodyExplorer renders its Plot SVG in the packed consumer (no optimizeDeps)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/units/packed-smoke-chapter/reading/");

  // SSR shell: the <figure> renders server-side regardless of hydration.
  const figure = page.locator("figure#bb-demo");
  await expect(figure).toBeVisible();

  // Post-hydration: Plot injects its spectrum <svg role="img"> into the
  // host div via useEffect (the figure also contains lucide icon SVGs, so
  // target the Plot output specifically by its aria-label). Condition-based
  // wait on the actual DOM mutation — not a timeout — so a failed Plot
  // import (the regression this guards) fails loudly here.
  await expect(
    figure.getByRole("img", { name: /Blackbody spectrum/ })
  ).toBeVisible({ timeout: 10_000 });

  // The interactive temperature slider hydrated alongside Plot.
  await expect(figure.getByRole("slider")).toBeVisible();

  // No runtime errors — a broken bundled-Plot import or unresolved subpath
  // would surface as a pageerror / console error here.
  expect(errors).toEqual([]);
});
