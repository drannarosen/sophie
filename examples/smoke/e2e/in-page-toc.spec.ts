import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SPOILER_ALERTS = "/chapters/spoiler-alerts";
const STELLAR_EVOLUTION = "/chapters/stellar-evolution";

/**
 * PR 4 — In-page table of contents.
 *
 * Per docs/plans/2026-05-12-in-page-toc-design.md:
 *
 * - Desktop (>=768px): <TocSidebar> renders in the right column slot
 *   with H2 + H3 nested. Scroll-spy via IntersectionObserver sets
 *   aria-current="location" on the active ToC link.
 * - Mobile (<768px): right column hidden; <TocDrawer> shows a
 *   floating "Contents" FAB; tap opens a slide-over drawer.
 *
 * Sprint K (2026-05-21, commit 997e545): the ToC defaults to closed
 * on every viewport (MyST-style "chapter is the content; chrome opens
 * on demand"). Tests that exercise the OPEN-state behavior (heading
 * list, link click, scroll-spy) flip it open via the topbar
 * `<TocToggle>` button first. See textbook-layout.css line ~431:
 * `:root[data-toc='closed'] .sophie-toc { display: none }`.
 */

/**
 * Open the in-page ToC by clicking the topbar TocToggle. Asserts the
 * resulting `html[data-toc='open']` state before returning so callers
 * get a clean precondition.
 */
async function openToc(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: /toggle contents/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-toc", "open");
}

test.describe("PR 4: In-page ToC (desktop)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders nested H2 + H3 list from chapter headings", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // Sprint K: ToC defaults to closed — open it before asserting the
    // list is visible.
    await openToc(page);
    const toc = page.locator(".sophie-toc--sidebar");
    await expect(toc).toBeVisible();
    // At least 4 H2 entries (the chapter has several "1.1 ...",
    // "1.2 ..." sections); use a generous floor.
    const h2Links = toc.locator(".sophie-toc-list > .sophie-toc-item > a");
    const h2Count = await h2Links.count();
    expect(h2Count).toBeGreaterThanOrEqual(4);
    // At least one H3 nested under an H2.
    const h3Links = toc.locator(".sophie-toc-sublist a");
    const h3Count = await h3Links.count();
    expect(h3Count).toBeGreaterThanOrEqual(1);
  });

  test("clicking an H2 link jumps to the heading anchor", async ({ page }) => {
    await page.goto(SPOILER_ALERTS);
    // Sprint K: ToC defaults to closed.
    await openToc(page);
    const firstH2 = page
      .locator(".sophie-toc--sidebar .sophie-toc-list > .sophie-toc-item > a")
      .first();
    const href = await firstH2.getAttribute("href");
    expect(href).toMatch(/^#/);
    await firstH2.click();
    await expect(page).toHaveURL(new RegExp(`${SPOILER_ALERTS}${href}$`));
  });

  test("scroll-spy: scrolling past a section moves aria-current", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // Initial paint: the first H2 link should be marked aria-current.
    const firstLink = page
      .locator(".sophie-toc--sidebar .sophie-toc-link")
      .first();
    await expect(firstLink).toHaveAttribute("aria-current", "location");

    // Scroll a later H2 INTO the IntersectionObserver's active band
    // (20–30% from the top of the viewport, per TocSidebar's
    // rootMargin "-20% 0px -70% 0px"). Anchoring on a heading
    // element + computing scrollTop relative to the active band
    // keeps this test robust to document-length changes (e.g. asides
    // leaving flow when docked in PR 6) AND keeps the heading
    // actually inside the band (block:"start" would put it ABOVE
    // the band, failing to update aria-current at all).
    await page.evaluate(() => {
      const headings = document.querySelectorAll(".sophie-content h2");
      const target = headings.item(2) as HTMLElement | null;
      if (!target) return;
      const desiredViewportTopFraction = 0.25; // center of active band
      const targetScrollTop =
        target.getBoundingClientRect().top +
        window.scrollY -
        window.innerHeight * desiredViewportTopFraction;
      window.scrollTo({ top: targetScrollTop, behavior: "instant" });
    });

    // Condition-based wait: poll the observable state (the
    // aria-current attribute) rather than guessing how long the
    // IntersectionObserver + paint pipeline takes. Playwright's
    // web-first assertions retry until satisfied or the default
    // timeout (5s) expires — no arbitrary sleep, no per-assertion
    // timeout knob. Two transitions must settle:
    //   1. The first link must lose aria-current (it was set on
    //      initial paint and must be cleared once a later heading
    //      enters the active band).
    //   2. Exactly one OTHER link must now carry aria-current.
    // Asserting both stable states before reading hrefs eliminates
    // the race that produced the historical flake.
    await expect(firstLink).not.toHaveAttribute("aria-current", "location");
    const active = page.locator(
      ".sophie-toc--sidebar .sophie-toc-link[aria-current='location']"
    );
    await expect(active).toHaveCount(1);
    const activeHref = await active.getAttribute("href");
    const firstHref = await firstLink.getAttribute("href");
    expect(activeHref).not.toBe(firstHref);
  });

  test("stub chapter with no H2 headings: <TocSidebar> renders null", async ({
    page,
  }) => {
    await page.goto(STELLAR_EVOLUTION);
    // The stub chapter has no H2 headings in its MDX body. The
    // <TocSidebar> primitive returns null in that case, so no
    // .sophie-toc--sidebar element exists.
    await expect(page.locator(".sophie-toc--sidebar")).toHaveCount(0);
    // KNOWN LIMITATION: the right column's `--sophie-right-w`
    // remains at 280px even when the ToC renders null. Astro's
    // `Astro.slots.has("right")` registers a slot when the template
    // declares one (even conditionally), so empty-slot-collapse
    // (ADR 0034) doesn't fire here. A follow-up may change
    // TextbookLayout to detect emptiness via `Astro.slots.render()`
    // output length instead; tracked in P3 backlog.
    const rightInner = await page.locator(".sophie-right").innerHTML();
    expect(rightInner.trim()).toBe("");
  });

  test("axe-core: zero violations on the desktop ToC", async ({ page }) => {
    await page.goto(SPOILER_ALERTS);
    const results = await new AxeBuilder({ page })
      .include(".sophie-toc--sidebar")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("PR 4: In-page ToC (mobile drawer)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("desktop sidebar variant is hidden on mobile; FAB is visible", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // The .sophie-right column is display:none on mobile per the
    // existing CSS, so the sidebar ToC isn't visible.
    await expect(page.locator(".sophie-toc--sidebar")).toBeHidden();
    // The drawer FAB is visible on mobile only.
    const fab = page.getByRole("button", { name: /open contents/i });
    await expect(fab).toBeVisible();
  });

  test("tapping FAB opens drawer; focus moves to close button", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    const fab = page.getByRole("button", { name: /open contents/i });
    await fab.click();
    const drawer = page.locator("#sophie-toc-drawer");
    await expect(drawer).toHaveAttribute("data-toc-state", "open");
    await expect(fab).toHaveAttribute("aria-expanded", "true");
    const closeBtn = page.getByRole("button", { name: /close contents/i });
    await expect(closeBtn).toBeFocused();
  });

  test("Escape closes the drawer; focus returns to the FAB", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    const fab = page.getByRole("button", { name: /open contents/i });
    await fab.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#sophie-toc-drawer")).toHaveAttribute(
      "data-toc-state",
      "closed"
    );
    await expect(fab).toBeFocused();
  });

  test("clicking a ToC link inside the drawer closes the drawer", async ({
    page,
  }) => {
    // The drawer composes <TocSidebar variant="drawer"> inside itself
    // and uses its own `data-toc-state` to manage visibility per ADR
    // 0036 (transient state, independent of the persistent `data-toc`
    // preference). The Sprint K global rule that hid `.sophie-toc` on
    // closed is scoped to `.sophie-toc--sidebar` so the drawer variant
    // paints regardless of preference — this test exercises the
    // mobile-only link-click → drawer-close contract without needing
    // to seed any preference state.
    await page.goto(SPOILER_ALERTS);
    await page.getByRole("button", { name: /open contents/i }).click();
    const firstLink = page
      .locator("#sophie-toc-drawer .sophie-toc-link")
      .first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await expect(page.locator("#sophie-toc-drawer")).toHaveAttribute(
      "data-toc-state",
      "closed"
    );
  });
});
