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

  // Sprint K (2026-05-21): view-mode is now a pure content-cap preset
  // (Default → no override / Focused → 66ch / Wide → 105ch),
  // orthogonal to sidebar visibility owned by SidebarToggle. The
  // previous coupling ("Focused/Wide collapse sidebar to zero width,
  // hide the SidebarToggle") was replaced because it made "I want
  // narrow reading but keep my margin notes" impossible. See the
  // inline comment in textbook-layout.css around line 422 + the
  // 2026-05-21 code-review Agent 2 "Wins" entry on view-mode
  // reconceptualization.

  test("Focused: content cap narrows; sidebar visibility unchanged", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^view:/i });

    const defaultContentBox = await page
      .locator(".sophie-content")
      .boundingBox();

    await toggle.click(); // → focused

    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );

    // Focused tightens the content cap; sidebar pref state is left
    // alone (Sprint K decoupling).
    const focusedContentBox = await page
      .locator(".sophie-content")
      .boundingBox();
    // Focused (66ch) ≤ Default (no override, so capped by parent column)
    // — width should decrease or hold steady, never grow.
    expect(focusedContentBox?.width ?? 0).toBeLessThanOrEqual(
      defaultContentBox?.width ?? Infinity
    );
  });

  test("Wide: content cap relaxes vs Focused (105ch > 66ch)", async ({
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

    // Wide must be wider than Focused (105ch > 66ch at this viewport).
    expect(
      (wideContentBox?.width ?? 0) - (focusedContentBox?.width ?? 0)
    ).toBeGreaterThan(80);
  });

  test("view-mode cycling does NOT touch sidebar pref (Sprint K decoupling)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Default sidebar state is 'closed' (Sprint K default-flip).
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );

    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "closed");
    await toggle.click(); // wide
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "closed");
    await toggle.click(); // back to default
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
  });

  test("opening sidebar then cycling view modes preserves sidebar=open", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Open sidebar via toggle.
    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await sidebarToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");

    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    await toggle.click(); // wide
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
    await toggle.click(); // default
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "default"
    );
    // sidebarPref was never touched by view-mode cycling — still 'open'.
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
  });

  test("<SidebarToggle> remains visible in every view mode (Sprint K decoupling)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const sidebarToggle = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(sidebarToggle).toBeVisible();

    const toggle = page.getByRole("button", { name: /^view:/i });
    await toggle.click(); // focused
    // Sprint K: SidebarToggle is no longer hidden by view-mode —
    // the user can always open the sidebar from any reading mode.
    await expect(sidebarToggle).toBeVisible();

    await toggle.click(); // wide
    await expect(sidebarToggle).toBeVisible();

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
