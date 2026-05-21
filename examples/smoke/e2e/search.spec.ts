import { expect, test } from "@playwright/test";

/**
 * RED — Layer 2 e2e for the Pagefind faceted search modal.
 *
 * See `docs/plans/2026-05-14-pr-7-pagefind-search-design.md` §6
 * "Layer 2 — Playwright e2e on smoke" for the full design intent.
 * Summary: three tests exercise the full Cmd+K → query → narrow →
 * navigate → close pipeline against the built smoke site.
 *
 * All three tests currently fail because:
 *   - `<SearchTrigger>` is not yet mounted in `TextbookLayout`
 *     (Task 10) — `getByRole('button', { name: /search/i })` finds
 *     no element.
 *   - The `astro:build:done` postbuild hook (Task 7) is not wired,
 *     so `dist/pagefind/` does not exist; even if the modal mounted
 *     its dynamic `import('/pagefind/pagefind.js')` would 404.
 *
 * They turn green after Tasks 5–10 land (registry, converters,
 * postbuild hook, SearchModal/ChipStrip/ResultCard implementations,
 * and the TextbookLayout mount).
 *
 * Condition-based-waiting throughout (per CLAUDE.md SoTA-over-simple
 * + the LO checkbox e2e precedent at
 * `examples/smoke/e2e/learning-objectives.spec.ts:34`): wait on
 * Radix's `data-state='open'` attribute on the dialog, on
 * `role='status'` aria-live counter text, and on `aria-selected` on
 * the active chip — never on fixed `{ timeout: N }` knobs.
 *
 * Smoke-content reality check: "luminosity" appears 15× in
 * `01-foundations/spoiler-alerts.mdx` and 1× in
 * `02-stars/stellar-evolution.mdx`. Pagefind indexes the whole
 * built site, so opening the modal from
 * `/chapters/measuring-the-sky/` still surfaces those hits.
 *
 * Sprint K (2026-05-21): <SearchTrigger> is now a real
 * `<input type='search'>` element (an "honest affordance" — the
 * pre-Sprint-K fake-input button was a UX trap because users naturally
 * tried to type into it and nothing happened; see SearchTrigger.astro).
 * The trigger is now matched by ARIA role 'searchbox' instead of
 * 'button'.
 */

test.describe("Pagefind search modal (Layer 2)", () => {
  test("Cmd+K opens modal, types term, navigates to result", async ({
    page,
  }) => {
    await page.goto("/chapters/measuring-the-sky/");

    // Wait for chapter page hydration to settle. Same precondition
    // as tests 2 + 3 below: SearchModal mounts `client:idle`, so its
    // document-level Meta+K keydown listener isn't installed until
    // React hydrates (Astro defers that until `requestIdleCallback`,
    // which lands post-networkidle in practice). Without this gate
    // the keypress fires into a void; the dialog never opens.
    // Deterministic fail under load, not flake.
    const trigger = page.getByRole("searchbox", { name: /search/i });
    await expect(trigger).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Trigger via keyboard (the modal's primary entry point)
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-state", "open");

    const input = dialog.getByRole("textbox");
    await expect(input).toBeFocused();

    // Type a known smoke-chapter term
    await input.fill("luminosity");

    // Wait for results to settle via the aria-live count region.
    // Disambiguate from the misconception card's "short note" length
    // badge (which also carries role="status" but lives inside result
    // previews when PR-7 misconceptions are in the search index).
    const counter = dialog.getByRole("status").filter({ hasText: /results/i });
    await expect(counter).not.toHaveText(/no results/i);

    // At least one result row appears
    const options = dialog.getByRole("option");
    await expect(options.first()).toBeVisible();

    // Arrow down + Enter navigates to a result URL
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/chapters\/.+/);
  });

  test("chip filter narrows results to one type", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    // Wait for the static trigger AND a network-idle state before
    // pressing the keyboard shortcut. The SearchModal mounts with
    // `client:idle`; its document keydown listener isn't installed
    // until React hydrates, which Astro defers until `requestIdleCallback`
    // (after network-idle in practice). Mirrors test 1's discipline.
    await expect(
      page.getByRole("searchbox", { name: /search/i })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Meta+k");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("data-state", "open");
    await dialog.getByRole("textbox").fill("luminosity");

    // Toggle the 'Equations' chip
    await dialog.getByRole("tab", { name: /equations/i }).click();
    await expect(
      dialog.getByRole("tab", { name: /equations/i })
    ).toHaveAttribute("aria-selected", "true");

    // Every visible result row's type label is 'Equation' (or empty
    // if no equation hits — assert at least one is present)
    const options = dialog.getByRole("option");
    await expect(options.first()).toBeVisible();
    const firstLabel = await options.first().getAttribute("aria-label");
    expect(firstLabel).toMatch(/equation/i);
  });

  test("Esc closes the modal", async ({ page }) => {
    await page.goto("/chapters/measuring-the-sky/");
    // Same trigger-visible + networkidle precondition as tests 1 + 2:
    // SearchModal mounts client:idle so its document keydown listener
    // isn't installed until after `requestIdleCallback` (post-networkidle
    // in practice). Without the wait, Meta+K fires into a void and the
    // dialog never opens. Deterministic-fail-under-load, not flake.
    await expect(
      page.getByRole("searchbox", { name: /search/i })
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Meta+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
