import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/**
 * PR 6 + PR-12 — sidebar-driven content-width calibration with
 * Bringhurst-strict measure caps.
 *
 * PR 6 introduced sidebar-driven widening. PR-12 (post-WS3
 * page-template token audit) shifted the cap cascade to the
 * Bringhurst-optimum reading measure per visual-polish-target.md
 * "Measure (prose max-width)".
 *
 * Sprint K (2026-05-21, commit 997e545) flipped the sidebar default
 * from "open on desktop" to "closed on every viewport" and decoupled
 * view-mode from sidebar visibility. Post-Sprint-K polish (2026-05-21)
 * retuned the cascade to MyST-style proportions — sidebars narrowed
 * to 220px and the caps widened across the board:
 *
 * | State                                                       | Content cap      |
 * |---                                                          |---               |
 * | sidebar=open  + toc=open                                    | min(75ch, 100%)  |
 * | sidebar=closed + toc=open                                   | min(85ch, 100%)  |
 * | sidebar=open  + toc=closed + dockedAsides='absent'          | min(90ch, 100%)  |
 * | sidebar=closed + toc=closed + dockedAsides='absent'         | min(105ch, 100%) |
 * | view-mode=focused override                                  | min(66ch, 100%)  |
 * | view-mode=wide override                                     | min(105ch, 100%) |
 *
 * The smoke chapter (spoiler-alerts) does NOT pass `dockedAsides`
 * to <TextbookLayout> so `data-docked-asides='present'` is in
 * effect — the toc=closed widening rules (which are gated on
 * `data-docked-asides='absent'`) do NOT fire. So the cold-load
 * state here is sidebar=closed + toc=closed → 85ch (from the
 * sidebar=closed rule, the toc=closed widening skipping over).
 *
 * Asserts use relative comparisons + generous absolute ranges
 * because exact px values depend on the body font's `ch` unit
 * which differs across systems.
 */

async function getContentWidth(page: import("@playwright/test").Page) {
  const box = await page.locator(".sophie-content").boundingBox();
  return box?.width ?? 0;
}

test.describe("PR 6: content-width responds to sidebar state", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.setViewportSize(DESKTOP_VIEWPORT);
  });

  test("Default mode + sidebar='open': content at the MyST default measure (75ch)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K (2026-05-21): sidebar defaults to 'closed'; open it
    // explicitly to exercise the base 75ch MyST-style measure.
    await page.getByRole("button", { name: /toggle sidebar/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    const width = await getContentWidth(page);
    // 75ch at 17px Plex Sans measures ~750-770px (1ch ≈ 10.0/10.2px).
    // Range covers font + scrollbar variance while rejecting 66ch
    // (~660px, Focused override) below and 85ch (~860px) above.
    expect(width).toBeGreaterThan(700);
    expect(width).toBeLessThan(820);
  });

  test("Default mode + sidebar='closed' (cold load): content widens to ~85ch", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K (2026-05-21): sidebar is closed on cold load — no
    // toggle needed. The toc=closed widening that would push the cap
    // to 105ch is gated on `data-docked-asides='absent'`; smoke's
    // spoiler-alerts has 27 docked asides so `dockedAsides='present'`
    // applies, the toc=closed widening rule skips, and the
    // sidebar=closed rule sets the cap at 85ch.
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );

    const width = await getContentWidth(page);
    // 85ch at 17px Plex Sans measures ~850-870px. Range rejects 75ch
    // (~750-770px, sidebar=open base) below and 105ch (~1050-1075px,
    // Wide-mode override) above.
    expect(width).toBeGreaterThan(820);
    expect(width).toBeLessThan(920);
  });

  test("Default mode: opening the sidebar makes content strictly narrower", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K cold-load: sidebar=closed → 85ch.
    const closedWidth = await getContentWidth(page);

    // Open the sidebar → sidebar=open → 75ch (the dockedAsides='present'
    // smoke chapter never widens past 85ch on toc-closed; opening the
    // sidebar tightens the cap to 75ch via the base rule).
    await page.getByRole("button", { name: /toggle sidebar/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    const openWidth = await getContentWidth(page);

    // 85ch → 75ch is a 10ch tighten (~100px in this body font); require
    // at least 50px shrinkage to verify the rule fires while tolerating
    // font-metric variance across systems. Sprint K inverted the
    // "default state": closed is the cold-load wide reading state,
    // open is the narrow MyST default measure.
    expect(closedWidth).toBeGreaterThan(openWidth + 50);
  });

  test("Focused mode: tightens cap to 66ch (Bringhurst optimum) regardless of sidebar", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K cold-load: sidebar=closed → 85ch.
    const sidebarClosedDefaultWidth = await getContentWidth(page);

    // Cycle to Focused (Sprint K: pure cap override, decoupled from
    // sidebar state). Sprint K's CSS caps Focused at 66ch — the
    // Bringhurst-optimum deep-read mode.
    await page.getByRole("button", { name: /^view:/i }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    const focusedWidth = await getContentWidth(page);

    // Focused (66ch) is strictly narrower than the cold-load 85ch.
    // Require at least 50px tighten to confirm the override fires.
    expect(sidebarClosedDefaultWidth).toBeGreaterThan(focusedWidth + 50);
  });

  test("Wide mode: view-mode override at 105ch (wider than any non-Wide state)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const defaultColdLoadWidth = await getContentWidth(page);

    // Cycle through to Wide (default → focused → wide). Sprint K
    // caps Wide at 105ch — strictly wider than the cold-load 85ch.
    const viewModeToggle = page.getByRole("button", { name: /^view:/i });
    await viewModeToggle.click(); // focused
    await viewModeToggle.click(); // wide
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    const wideWidth = await getContentWidth(page);

    // Wide (105ch) > cold-load Default (sidebar=closed → 75ch).
    expect(wideWidth).toBeGreaterThan(defaultColdLoadWidth);
  });
});
