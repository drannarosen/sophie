import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";
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
 * view-mode from sidebar visibility. The cap cascade (per
 * textbook-layout.css line ~446 comment) is now:
 *
 * | State                                                       | Content cap      |
 * |---                                                          |---               |
 * | sidebar=open  + toc=open                                    | min(66ch, 100%)  |
 * | sidebar=closed + toc=open                                   | min(75ch, 100%)  |
 * | sidebar=open  + toc=closed + dockedAsides='absent'          | min(85ch, 100%)  |
 * | sidebar=closed + toc=closed + dockedAsides='absent'         | min(95ch, 100%)  |
 * | view-mode=focused override                                  | min(66ch, 100%)  |
 * | view-mode=wide override                                     | min(105ch, 100%) |
 *
 * The smoke chapter (spoiler-alerts) does NOT pass `dockedAsides`
 * to <TextbookLayout> so `data-docked-asides='present'` is in
 * effect — the toc=closed widening rule (which is gated on
 * `data-docked-asides='absent'`) does NOT fire. So the cold-load
 * state here is sidebar=closed + toc=closed → 75ch (from the
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

  test("Default mode + sidebar='open': content at the Bringhurst optimum (66ch)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K (2026-05-21): sidebar defaults to 'closed'; open it
    // explicitly to exercise the 66ch Bringhurst-optimum cap.
    await page.getByRole("button", { name: /toggle sidebar/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    const width = await getContentWidth(page);
    // 66ch at the 17px Plex Sans body font measures ≈ 756px on CI
    // (1ch ≈ 11.4px). Range covers font + scrollbar variance while
    // rejecting 75ch (~860px) above and 50ch (~570px) below.
    expect(width).toBeGreaterThan(600);
    expect(width).toBeLessThan(810);
  });

  test("Default mode + sidebar='closed' (cold load): content widens to ~75ch", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K (2026-05-21): sidebar is closed on cold load — no
    // toggle needed. The toc=closed widening that would push the cap
    // to 95ch is gated on `data-docked-asides='absent'`; smoke's
    // spoiler-alerts has 27 docked asides so `dockedAsides='present'`
    // applies, the toc=closed widening rule skips, and the
    // sidebar=closed rule sets the cap at 75ch.
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );

    const width = await getContentWidth(page);
    // Post-Sprint J (`box-sizing: border-box` on `.sophie-content`,
    // shipped in 73bb3c6 to fix mobile overflow), `max-inline-size:
    // 75ch` caps the BORDER box at 75ch. `getBoundingClientRect`
    // returns the border-box width, so the measured value lands at
    // ~75ch px directly: ≈ 750 on CI Linux, ≈ 765 on macOS (1ch is
    // ~10.0/10.2 px in Plex Sans 17px across the two systems).
    // Range covers both while rejecting 66ch (~660-675 px) below
    // and 95ch (~950-970 px) above.
    expect(width).toBeGreaterThan(720);
    expect(width).toBeLessThan(810);
  });

  test("Default mode: opening the sidebar makes content strictly narrower", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K cold-load: sidebar=closed → 75ch.
    const closedWidth = await getContentWidth(page);

    // Open the sidebar → sidebar=open → 66ch (the dockedAsides='present'
    // smoke chapter never widens past 75ch on toc-closed; opening the
    // sidebar tightens the cap to 66ch via the base rule).
    await page.getByRole("button", { name: /toggle sidebar/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    const openWidth = await getContentWidth(page);

    // 75ch → 66ch is a 9ch tighten (~80px in this body font); require
    // at least 50px shrinkage to verify the rule fires while tolerating
    // font-metric variance across systems. Note Sprint K inverted the
    // "default state": closed is the cold-load wide reading state,
    // open is the narrow Bringhurst optimum.
    expect(closedWidth).toBeGreaterThan(openWidth + 50);
  });

  test("Focused mode: tightens cap to 66ch (Bringhurst optimum) regardless of sidebar", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sprint K cold-load: sidebar=closed → 75ch.
    const sidebarClosedDefaultWidth = await getContentWidth(page);

    // Cycle to Focused (Sprint K: pure cap override, decoupled from
    // sidebar state). Sprint K's CSS at line ~650 caps Focused at
    // 66ch (not 75ch as the pre-Sprint-K design specified).
    await page.getByRole("button", { name: /^view:/i }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    const focusedWidth = await getContentWidth(page);

    // Focused (66ch) is strictly narrower than the cold-load 75ch.
    // Require at least 50px tighten to confirm the override fires.
    expect(sidebarClosedDefaultWidth).toBeGreaterThan(focusedWidth + 50);
  });

  test("Wide mode: view-mode override at 105ch (wider than any non-Wide state)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const defaultColdLoadWidth = await getContentWidth(page);

    // Cycle through to Wide (default → focused → wide). Sprint K
    // caps Wide at 105ch (CSS line ~654) — strictly wider than the
    // cold-load 75ch.
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
