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
    // 66ch at the 17px body font measures ≈ 600px (1ch ≈ 9px). Range
    // covers font + scrollbar variance while rejecting 75ch above
    // (~675px) and 50ch below (~450px).
    expect(width).toBeGreaterThan(450);
    expect(width).toBeLessThan(680);
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
    // 75ch at the body font measures ≈ 680px. Range covers font +
    // system variance while rejecting 66ch (~600px) below and 95ch
    // (~860px) above.
    expect(width).toBeGreaterThan(620);
    expect(width).toBeLessThan(800);
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
