import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/wiens-law-fixture";

/**
 * PR-E P2-2 — Playwright e2e for the `<EqRef>` biography-summary
 * popover-open path (Phase B Reasoning OS core audit §4.2).
 *
 * The Radix HoverCard popover content isn't reachable in jsdom; the
 * `BiographySummary` component carries 12 unit tests in
 * `packages/components/src/components/EqRef/EqRef.biography-summary.test.tsx`
 * but the end-to-end open path (hover-trigger → popover mounts →
 * biography summary visible inside the popover) was previously
 * uncovered.
 *
 * Test target: the smoke-fixture chapter at
 * `examples/smoke/src/content/chapters/01-foundations/wiens-law-fixture.mdx`
 * carries a fully-populated `<KeyEquation id="wiens-law-smoke">` with
 * all five biography children (2 assumptions, 2 units, breaks-when, 1
 * common-misuse). The chapter ends with a self-cite EqRef so the
 * popover renders against real fixture data:
 *
 *   `Hovering <EqRef slug="wiens-law-smoke" client:load>Wien's law</EqRef> opens …`
 *
 * Expected popover content:
 *   - Eq. number + title
 *   - KaTeX-rendered display math
 *   - BiographySummary line: "2 assumptions · 1 misuse · valid in: thermal-equilibrium"
 *
 * The biography summary line is the load-bearing assertion — it's the
 * surface PR-7's chapter capstone consumes and the one the unit tests
 * couldn't reach.
 */

test.describe("PR-E P2-2: <EqRef> biography summary in the hover popover", () => {
  test("hover opens the popover AND renders the biography summary", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // Wait for React hydration before hovering — `networkidle` fires
    // before `<EqRef>`'s `useHydrated` flips `data-react-hydrated="true"`.
    // Same wait used in eq-ref.spec.ts:91 + :117.
    await page.locator('[data-react-hydrated="true"]').first().waitFor();

    const trigger = page
      .locator('a[href="/chapters/wiens-law-fixture#wiens-law-smoke"]')
      .first();
    await expect(trigger).toBeAttached();

    // Closed-state precondition.
    await expect(
      page.locator("[data-sophie-equation-popover]")
    ).not.toBeAttached();

    await trigger.hover();

    const popover = page.locator("[data-sophie-equation-popover]");
    // HoverCard.openDelay = 150ms; explicit timeout makes the contract
    // clear (matches eq-ref.spec.ts:104).
    await expect(popover).toBeAttached({ timeout: 2000 });

    // Sanity: the standard equation-popover content is present
    // (eq number + title + display math).
    await expect(popover).toContainText("Eq. 1");
    await expect(popover).toContainText(/Wien.s Law/);
    await expect(popover.locator(".katex").first()).toBeVisible();

    // P2-2 load-bearing assertion: the BiographySummary line renders
    // inside the popover with the expected counts + validity slug.
    // The fixture's biography is fixed (2 assumptions, 1 misuse,
    // first assumption type="thermal-equilibrium") so the rendered
    // summary string is deterministic.
    const biography = popover.locator("[data-sophie-equation-biography]");
    await expect(biography).toBeAttached();
    await expect(biography).toContainText("2 assumptions");
    await expect(biography).toContainText("1 misuse");
    await expect(biography).toContainText("valid in:");
    await expect(biography).toContainText("thermal-equilibrium");
  });

  test("the in-chapter self-cite trigger uses the canonical EqRef shape", async ({
    page,
  }) => {
    // Defense-in-depth: the wiens-law-fixture's self-cite EqRef
    // must render with the same trigger shape as cites from other
    // chapters (Lucide Sigma icon, anchor href). Catches a regression
    // where a self-cite (same-chapter equation) accidentally rendered
    // a degraded fallback.
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/wiens-law-fixture#wiens-law-smoke"]')
      .first();
    await expect(trigger).toBeAttached();
    await expect(trigger).toContainText(/Wien.s law/);
    const icon = trigger.locator("svg");
    await expect(icon).toBeAttached();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon).toHaveClass(/lucide-sigma/);
  });
});
