import { expect, test } from "@playwright/test";
import { expectChapterA11y } from "./_helpers/axe";

const SPOILER_ALERTS = "/units/spoiler-alerts/reading";
const MEASURING_THE_SKY = "/units/measuring-the-sky/reading";
const STELLAR_EVOLUTION = "/units/stellar-evolution/reading";

/**
 * PR 3 — Sidebar module/chapter navigation.
 *
 * Per docs/plans/2026-05-12-sidebar-module-nav-design.md, the
 * <ModuleNav> primitive renders all modules + chapters as a
 * two-level tree in the sidebar slot. Active state is set on the
 * SSR'd link via `aria-current="page"`. No client JS.
 *
 * Sprint K (2026-05-21, commit 997e545): the sidebar defaults to
 * closed on every viewport (MyST-style "chapter is the content;
 * chrome opens on demand"). Tests that click chapter-list links need
 * to open the sidebar first via the topbar `<SidebarToggle>` button
 * so the link surface is visible.
 */

async function openSidebar(
  page: import("@playwright/test").Page
): Promise<void> {
  await page.getByRole("button", { name: /toggle sidebar/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
}

test.describe("PR 3: Module/chapter sidebar nav", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("nav renders both modules in order (Foundations before Stars & Spectra)", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    const moduleTitles = page.locator(".sophie-module-title");
    await expect(moduleTitles).toHaveCount(2);
    await expect(moduleTitles.nth(0)).toHaveText("Foundations");
    await expect(moduleTitles.nth(1)).toHaveText("Stars & Spectra");
  });

  test("each module lists its chapters in order", async ({ page }) => {
    await page.goto(SPOILER_ALERTS);
    const foundations = page.locator(
      ".sophie-module[data-module='foundations'] .sophie-chapter-list a"
    );
    // Three foundations chapters post-ADR-0060: the EquationBiography
    // PR-γ inline-fixture chapter (`wiens-law-fixture.mdx`, order=4)
    // was deleted in Batch 6 — biographies live in the registry now
    // (examples/smoke/src/content/equations/), so the inline-biography
    // chapter test case is obsolete. The Intervention PR-γ smoke
    // fixture (`misconception-fixture.mdx`, order=3) remains.
    await expect(foundations).toHaveCount(3);
    await expect(foundations.nth(0)).toHaveText(/Spoiler Alerts/);
    await expect(foundations.nth(1)).toHaveText(/Measuring the Sky/);
    await expect(foundations.nth(2)).toHaveText(
      /Misconceptions and Interventions/
    );

    const stars = page.locator(
      ".sophie-module[data-module='stars'] .sophie-chapter-list a"
    );
    // M2-L3 pilot added `spectra-and-composition.mdx` to the Stars
    // module; ordering is by frontmatter `order` (pilot order=3,
    // stellar-evolution order=3 too — see comment in the spec
    // header) — both Lecture 3 today; the pilot lands first by
    // slug-tiebreak.
    await expect(stars).toHaveCount(2);
    await expect(stars.nth(0)).toHaveText(/Spectra .{0,3}\s+Composition/);
    await expect(stars.nth(1)).toHaveText(/Stellar Evolution/);
  });

  test("aria-current='page' is on the active chapter only", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    const active = page.locator(".sophie-chapter-list a[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute(
      "href",
      "/units/spoiler-alerts/reading"
    );
  });

  test("clicking another chapter navigates and active state moves", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // Sprint K: open the sidebar first; the chapter-list links live
    // inside `.sophie-sidebar` which is `visibility: hidden` while
    // closed.
    await openSidebar(page);
    await page
      .locator(".sophie-chapter-list a", { hasText: /Measuring the Sky/ })
      .click();
    await expect(page).toHaveURL(MEASURING_THE_SKY);
    const active = page.locator(".sophie-chapter-list a[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", MEASURING_THE_SKY);
  });

  test("cross-module navigation: Foundations chapter → Stars chapter", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // Sprint K: open the sidebar first to expose the cross-module link.
    await openSidebar(page);
    // ModuleNav renders each module as a <details> that's `open` only
    // when it contains the current chapter (ModuleNav.astro line ~55).
    // The Foundations module is open here; expand the Stars module's
    // disclosure so the Stellar Evolution link is in the visible tree.
    await page
      .locator(
        ".sophie-module[data-module='stars'] > .sophie-module-disclosure > summary"
      )
      .click();
    await page
      .locator(".sophie-chapter-list a", { hasText: /Stellar Evolution/ })
      .click();
    await expect(page).toHaveURL(STELLAR_EVOLUTION);
    const active = page.locator(".sophie-chapter-list a[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", STELLAR_EVOLUTION);
  });

  test("sidebar slot is filled (SSR); opening reveals a visible chapter-list column", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // Sprint K (2026-05-21): the sidebar defaults to closed
    // (`data-sidebar='closed'` on <html>) which sets
    // `--sophie-sidebar-w: 0` regardless of slot fill state. The
    // original "slot filled" contract is now expressed via the
    // SSR-stamped `data-sidebar-slot` attribute on `.sophie-shell`
    // (set by TextbookLayout from `Astro.slots.has('sidebar')`).
    //
    // 2026-05-21 polish pass slimmed `--sophie-sidebar-w` from 280px
    // to 220px (MyST proportions). This test no longer asserts on
    // the specific px value — that's chrome-rhythm tuning that can
    // legitimately retune in either direction. The user-facing
    // contract is "open the sidebar; the chapter-list column becomes
    // visible and reads ~chrome-width." A nonzero-width + visible
    // chapter-list assertion captures behavior without locking the
    // typographic-rhythm number.
    const shell = page.locator(".sophie-shell");
    await expect(shell).toHaveAttribute("data-sidebar-slot", "filled");

    await page.getByRole("button", { name: /toggle sidebar/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");

    const sidebar = page.locator(".sophie-sidebar");
    await expect(sidebar).toBeVisible();
    const box = await sidebar.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(150);
    expect(box?.width ?? 0).toBeLessThan(360);
    // The chapter list is the actual content the sidebar exists to
    // present — assert the first chapter link is reachable as a
    // behavior witness, not just a styled box.
    await expect(
      sidebar.getByRole("link", { name: /Spoiler Alerts/ })
    ).toBeVisible();
  });

  test("axe-core: zero violations on the new nav region", async ({ page }) => {
    await page.goto(SPOILER_ALERTS);
    await expectChapterA11y(page);
  });
});
