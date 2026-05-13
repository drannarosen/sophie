import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR 5 — `<ViewModeToggle>` (Default / Focused / Wide) +
 * keyboard shortcut.
 *
 * Per docs/plans/2026-05-12-view-modes-design.md, the toggle:
 *
 *  - Cycles `default → focused → wide → default`.
 *  - Persists stored value to localStorage key `sophie:view-mode`.
 *  - Reflects stored value onto `data-view-mode` on `<html>`
 *    (no resolve indirection — stored === attribute value).
 *  - Syncs across tabs via the `storage` event.
 *  - Cycles on the global `v` keyboard shortcut, with
 *    input-focus guard.
 *
 * Layout orchestration is CSS-only: `data-view-mode='focused'|
 * 'wide'` collapses both side columns regardless of `sidebarPref`,
 * widens the content cap, and hides the per-element sidebar
 * toggle. `sidebarPref` is NOT touched — cycling back to Default
 * reveals the sidebar in its last state.
 */

test.describe("PR 5: ViewModeToggle on the smoke chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("toggle renders in the top bar with default aria-label", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "default");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
  });

  test("click cycles default → focused → wide → default", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });

    // Initial state.
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "default");
    await expect(toggle).toHaveAccessibleName(/view: default/i);

    // Click 1 → focused.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "focused");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    await expect(toggle).toHaveAccessibleName(/view: focused/i);

    // Click 2 → wide.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "wide");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    await expect(toggle).toHaveAccessibleName(/view: wide/i);

    // Click 3 → back to default.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-view-mode-pref", "default");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    await expect(toggle).toHaveAccessibleName(/view: default/i);

    const stored = await page.evaluate(() =>
      localStorage.getItem("sophie:view-mode")
    );
    expect(stored).toBe("default");
  });

  test("Focused: sidebar + right column collapse to zero width", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // → focused

    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    // Sidebar collapsed: --sophie-sidebar-w should be 0 and the
    // computed visibility hidden.
    const sidebarBox = await page.locator(".sophie-sidebar").boundingBox();
    expect(sidebarBox?.width ?? 0).toBe(0);

    const rightBox = await page.locator(".sophie-right").boundingBox();
    expect(rightBox?.width ?? 0).toBe(0);
  });

  test("Wide: side columns collapsed AND content cap relaxes vs Focused", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });

    await toggle.click(); // → focused
    const focusedContentBox = await page
      .locator(".sophie-content")
      .boundingBox();

    await toggle.click(); // → wide
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    const wideContentBox = await page.locator(".sophie-content").boundingBox();

    // Wide must be wider than Focused (105ch > 85ch at this viewport).
    expect(
      (wideContentBox?.width ?? 0) - (focusedContentBox?.width ?? 0)
    ).toBeGreaterThan(80);
  });

  test("cycling back to Default with sidebarPref='open' restores the sidebar", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Sidebar pref defaults to 'open' on desktop. Verify, then cycle
    // through focused → wide → default.
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    const sidebarOpenWidth = (
      await page.locator(".sophie-sidebar").boundingBox()
    )?.width;
    expect(sidebarOpenWidth ?? 0).toBeGreaterThan(0);

    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    await toggle.click(); // wide
    await toggle.click(); // back to default

    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    // sidebarPref was never touched — should still be 'open'.
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    const restored = (await page.locator(".sophie-sidebar").boundingBox())
      ?.width;
    expect(restored).toBe(sidebarOpenWidth);
  });

  test("cycling back to Default with sidebarPref='closed' leaves sidebar closed", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Close sidebar via its toggle first; verify the closed state.
    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await sidebarToggle.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );

    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    await toggle.click(); // wide
    await toggle.click(); // default

    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    // sidebarPref was never written by view-mode cycling.
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
  });

  test("<SidebarToggle> is hidden in Focused and Wide modes", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(sidebarToggle).toBeVisible();

    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    await expect(sidebarToggle).toBeHidden();

    await toggle.click(); // wide
    await expect(sidebarToggle).toBeHidden();

    await toggle.click(); // default
    await expect(sidebarToggle).toBeVisible();
  });

  test("stored mode survives a reload", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    await toggle.click(); // wide

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    await expect(page.getByRole("button", { name: /^view:/i })).toHaveAttribute(
      "data-view-mode-pref",
      "wide"
    );
  });

  test("cross-tab: cycling in one tab updates the other via storage event", async ({
    context,
  }) => {
    await context.clearCookies();
    const tabA = await context.newPage();
    await tabA.goto(CHAPTER_URL);

    const tabB = await context.newPage();
    await tabB.goto(CHAPTER_URL);

    await expect(tabA.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    await expect(tabB.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );

    await tabA.getByRole("button", { name: /^view:/i }).click(); // → focused
    await tabA.getByRole("button", { name: /^view:/i }).click(); // → wide

    await expect(tabA.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    // storage event propagates to tab B.
    await expect(tabB.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );

    await tabA.close();
    await tabB.close();
  });

  test("keyboard shortcut: pressing `v` cycles the mode", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    // Wait for the toggle script to install the keydown listener.
    // The bindToggle marker indicates the script's setup ran;
    // installViewModeKeyboardShortcut runs immediately after it.
    await expect(page.getByRole("button", { name: /^view:/i })).toHaveAttribute(
      "data-sophie-pref-sophie-view-mode",
      ""
    );
    // Blur any initially-focused element so the keypress goes to
    // body, not to a button whose default keydown handling might
    // swallow it (Space + Enter on focused button activate the
    // button; 'v' shouldn't, but blurring removes the variable).
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur?.();
    });
    await page.keyboard.press("v");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );
    await page.keyboard.press("v");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "wide"
    );
    await page.keyboard.press("v");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
  });

  test("keyboard shortcut: pressing `v` inside a text input does NOT cycle", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Synthesize a text input on the page; focus it; verify `v` is
    // captured by the input and does NOT cycle the view mode.
    // Per the design doc, the smoke chapter content stays stable —
    // we inject the input from the test rather than authoring it
    // into the MDX.
    await page.evaluate(() => {
      const input = document.createElement("input");
      input.id = "view-mode-guard-test-input";
      input.type = "text";
      document.body.appendChild(input);
      input.focus();
    });

    await page.keyboard.press("v");
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    // The 'v' character should have ended up in the input.
    const value = await page
      .locator("#view-mode-guard-test-input")
      .inputValue();
    expect(value).toBe("v");
  });

  test("axe-core: zero violations on the view-mode toggle in all three states", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });

    for (const expected of ["default", "focused", "wide"]) {
      await expect(toggle).toHaveAttribute("data-view-mode-pref", expected);
      const results = await new AxeBuilder({ page })
        .include(".sophie-view-mode-toggle")
        .disableRules(["color-contrast"])
        .analyze();
      expect(results.violations).toEqual([]);
      // Cycle to the next state for the next iteration; the loop
      // ends with one extra click that brings us back to "default"
      // — harmless.
      await toggle.click();
    }
  });
});
