import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/**
 * PR 6 — sidebar-driven content-width calibration.
 *
 * Per docs/plans/2026-05-13-aside-design.md "Sixth decision":
 * collapsing the left sidebar should widen content to use the
 * freed horizontal space, capped at min(95ch, 100%) for
 * readability. View modes (Focused/Wide) override per PR 5.
 *
 * | State | Content cap |
 * |---|---|
 * | Default + sidebar=open   | min(75ch, 100%)  |
 * | Default + sidebar=closed | min(95ch, 100%)  |
 * | Focused                  | min(85ch, 100%)  |
 * | Wide                     | min(105ch, 100%) |
 *
 * Asserts use relative comparisons (closed > open, Wide > Focused)
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

  test("Default mode + sidebar='open': content at 75ch (current behavior)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    const width = await getContentWidth(page);
    // 75ch at 16px body font ≈ 600px. Allow generous tolerance for
    // font + scrollbar variance across systems.
    expect(width).toBeGreaterThan(500);
    expect(width).toBeLessThan(700);
  });

  test("Default mode + sidebar='closed': content widens to ~95ch", async ({
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
    // 95ch at the body font measures ≈ 860px (1ch ≈ 9px in this
    // smoke chapter's font). Range covers font + system variance
    // while rejecting 75ch (~620px) below and 105ch (~945px) above.
    expect(width).toBeGreaterThan(720);
    expect(width).toBeLessThan(910);
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
    // amount (at least 100px) — verifies the rule actually fires,
    // not just that some computed style changed.
    expect(closedWidth).toBeGreaterThan(openWidth + 100);
  });

  test("Focused mode: view-mode override wins even with sidebar='closed'", async ({
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

    // Focused is 85ch — narrower than Default+sidebar-closed (95ch).
    // The view-mode override beats the sidebar-state widening.
    expect(focusedWidth).toBeLessThan(sidebarClosedDefaultWidth);
  });

  test("Wide mode: view-mode override at 105ch (wider than any Default state)", async ({
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

    // Wide (105ch) > Default+sidebar-open (75ch).
    expect(wideWidth).toBeGreaterThan(defaultOpenWidth);
  });
});
