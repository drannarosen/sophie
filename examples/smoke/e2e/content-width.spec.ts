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
 * "Measure (prose max-width)" — 66ch Default, with Focused/Wide
 * relaxing for code+math / diagrams respectively.
 *
 * | State                    | Content cap     | Role                                  |
 * |---                       |---              |---                                    |
 * | Default + sidebar=open   | min(66ch, 100%) | Bringhurst optimum — best for reading |
 * | Default + sidebar=closed | min(75ch, 100%) | Match Focused — use freed space       |
 * | Focused                  | min(75ch, 100%) | Code+math get breathing room          |
 * | Wide                     | min(95ch, 100%) | Diagrams, tables, overviews           |
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

  test("Default mode + sidebar='closed': content widens to ~75ch", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await sidebarToggle.click();
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
    // and 95ch (~950-970 px) above. See content-area follow-up:
    // the actual chars/line is now ≈ 66 (75ch border-box − 96px
    // padding), down from the pre-Sprint J ~75ch reading area.
    expect(width).toBeGreaterThan(720);
    expect(width).toBeLessThan(810);
  });

  test("Default mode: closing the sidebar makes content strictly wider", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const openWidth = await getContentWidth(page);

    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await sidebarToggle.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
    const closedWidth = await getContentWidth(page);

    // Closed content must be wider than open content by a meaningful
    // amount. 66ch → 75ch is a 9ch shift (~80px in this body font);
    // require at least 50px to verify the rule actually fires while
    // tolerating font-metric variance across systems.
    expect(closedWidth).toBeGreaterThan(openWidth + 50);
  });

  test("Focused mode: matches Default+sidebar-closed cap (both at 75ch)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Close the sidebar first.
    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await sidebarToggle.click();
    const sidebarClosedDefaultWidth = await getContentWidth(page);

    // Cycle to Focused.
    const viewModeToggle = page.getByRole("button", { name: /^view:/i });
    await viewModeToggle.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    const focusedWidth = await getContentWidth(page);

    // Both modes cap at 75ch (the upper edge of Bringhurst's
    // acceptable range). They tie within a few pixels of font
    // variance. Focused removes the side chrome; sidebar-closed
    // Default keeps it. The semantic distinction is chrome
    // presence, not prose width.
    expect(Math.abs(focusedWidth - sidebarClosedDefaultWidth)).toBeLessThan(10);
  });

  test("Wide mode: view-mode override at 95ch (wider than any Default state)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const defaultOpenWidth = await getContentWidth(page);

    // Cycle through to Wide (default → focused → wide).
    const viewModeToggle = page.getByRole("button", { name: /^view:/i });
    await viewModeToggle.click(); // focused
    await viewModeToggle.click(); // wide
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    const wideWidth = await getContentWidth(page);

    // Wide (95ch) > Default+sidebar-open (66ch).
    expect(wideWidth).toBeGreaterThan(defaultOpenWidth);
  });
});
