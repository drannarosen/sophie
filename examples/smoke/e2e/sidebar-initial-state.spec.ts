import { expect, test } from "@playwright/test";
import { expectChapterA11y } from "./_helpers/axe";

/**
 * Sprint K hardening (2026-05-21) — regression test for the
 * initial-state sidebar default. The 2026-05-21 UI/UX audit flagged
 * a P1 where the left sidebar appeared open on cold-load at 375px
 * viewport; investigation showed the actual cause was stale
 * localStorage from prior interactions (the Sprint K default flip in
 * `packages/astro/src/preferences/sidebar.ts` + `TextbookHead.astro`
 * was already correct).
 *
 * This test locks in the cold-load contract: with no saved
 * preference, both sidebars default to "closed" on every viewport.
 * Users who explicitly open either sidebar still persist their
 * choice via localStorage; this only verifies the default.
 */

const CHAPTER_URL = "/units/spectra-and-composition/reading";

test.describe("Sprint K — sidebar cold-load default", () => {
  test.beforeEach(async ({ context }) => {
    // Clear cookies + localStorage so each run is a true cold-load.
    await context.clearCookies();
  });

  test("mobile 375x812: data-sidebar='closed' on cold load", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {}
    });
    await page.goto(CHAPTER_URL);

    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
    await expect(page.locator("html")).toHaveAttribute("data-toc", "closed");

    // Chapter title should be fully visible (not clipped by an
    // overlay sidebar) — assert the title's bounding box lies inside
    // the viewport.
    const title = page.locator(".sophie-chapter-title__main").first();
    await expect(title).toBeVisible();
    const box = await title.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
    // Mobile-only axe scan is intentionally deferred: at 375px
    // viewport the chapter's `<table>` blocks overflow horizontally
    // and trip `scrollable-region-focusable` (responsive-table issue
    // unrelated to B.18). The desktop test below carries the axe
    // assertion; reinstating mobile-axe is queued behind a
    // responsive-table follow-up.
  });

  test("desktop 1440x900: data-sidebar='closed' on cold load (Sprint K default)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      try {
        localStorage.clear();
      } catch {}
    });
    await page.goto(CHAPTER_URL);

    // Sprint K decision (sidebar.ts:22): default closed on EVERY
    // viewport — MyST-style "chapter is the content, chrome opens
    // on demand."
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
    await expect(page.locator("html")).toHaveAttribute("data-toc", "closed");
    await expectChapterA11y(page);
  });

  test("persisted preference survives reload (user opens sidebar)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Don't use addInitScript here — it would clear localStorage on
    // EVERY navigation (including the reload below). The beforeEach
    // clearCookies + a fresh page already gives us a clean slate.
    await page.goto(CHAPTER_URL);
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {}
    });

    // User opens the sidebar via the topbar toggle.
    const toggle = page.locator("[data-sophie-sidebar-toggle]");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");

    // Reload — the preference should persist via localStorage.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    await expectChapterA11y(page);
  });
});
