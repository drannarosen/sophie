import { expect, test } from "@playwright/test";
import { expectChapterA11y } from "./_helpers/axe";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * PR 2 — `definePreference` + `<ThemeToggle>`.
 *
 * Per docs/plans/2026-05-12-theme-toggle-design.md, the toggle:
 *
 * - Cycles `system → light → dark → system`.
 * - Persists stored value to localStorage key `sophie:theme`.
 * - Resolves stored value onto `data-theme="light"|"dark"` on
 *   `<html>` (system → matches `prefers-color-scheme`).
 * - Syncs across tabs via the `storage` event.
 * - Tracks the OS via `matchMedia` only while stored === "system".
 *
 * The CSS swap happens in `@sophie/theme` (per ADR 0005) keyed on
 * `data-theme`; this spec verifies the attribute machinery only.
 */

test.describe("PR 2: ThemeToggle on the smoke chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("toggle renders in the top bar with default aria-label", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^theme:/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("data-theme-pref", "system");
  });

  test("empty localStorage + prefers-color-scheme: dark → data-theme='dark'", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(CHAPTER_URL);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("empty localStorage + prefers-color-scheme: light → data-theme='light'", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("click cycles system → light → dark → system; localStorage and html stay in sync", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^theme:/i });

    // Initial: system (resolves to light via emulated prefers-color-scheme)
    await expect(toggle).toHaveAttribute("data-theme-pref", "system");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Click 1 → light (explicit)
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveAccessibleName(/theme: light/i);

    // Click 2 → dark (explicit; OS still light, but user override wins)
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAccessibleName(/theme: dark/i);

    // Click 3 → back to system (which resolves to OS light)
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme-pref", "system");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(toggle).toHaveAccessibleName(/theme: system/i);

    // Stored value should be the most recent click's value.
    const stored = await page.evaluate(() =>
      localStorage.getItem("sophie:theme")
    );
    expect(stored).toBe("system");
  });

  test("stored value survives reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^theme:/i });
    await toggle.click(); // → light
    await toggle.click(); // → dark
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: /^theme:/i })
    ).toHaveAttribute("data-theme-pref", "dark");
  });

  test("cross-tab: toggling in one tab updates the other via storage event", async ({
    context,
  }) => {
    await context.clearCookies();
    const tabA = await context.newPage();
    await tabA.emulateMedia({ colorScheme: "light" });
    await tabA.goto(CHAPTER_URL);

    const tabB = await context.newPage();
    await tabB.emulateMedia({ colorScheme: "light" });
    await tabB.goto(CHAPTER_URL);

    // Both tabs start at system → light.
    await expect(tabA.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(tabB.locator("html")).toHaveAttribute("data-theme", "light");

    // Toggle in tab A → light → dark.
    await tabA.getByRole("button", { name: /^theme:/i }).click(); // light
    await tabA.getByRole("button", { name: /^theme:/i }).click(); // dark

    await expect(tabA.locator("html")).toHaveAttribute("data-theme", "dark");
    // Storage event propagates to tab B.
    await expect(tabB.locator("html")).toHaveAttribute("data-theme", "dark");

    await tabA.close();
    await tabB.close();
  });

  test("matchMedia change with stored='system' flips data-theme live", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("matchMedia change with stored='light' is ignored", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    await page.getByRole("button", { name: /^theme:/i }).click(); // → light explicit
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.emulateMedia({ colorScheme: "dark" });
    // The explicit light choice should survive the OS change.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("shell background actually changes between light and dark (not just the attribute)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^theme:/i });

    // Force explicit light, capture the shell's computed background.
    await toggle.click(); // → light explicit
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const lightBg = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".sophie-shell") as Element)
          .backgroundColor
    );

    // Toggle to dark; the shell background must actually swap. If it
    // stays equal to the light value (or to the hardcoded white
    // fallback), the layout CSS isn't wired to @sophie/theme's tokens.
    await toggle.click(); // → dark explicit
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const darkBg = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".sophie-shell") as Element)
          .backgroundColor
    );
    expect(darkBg).not.toBe(lightBg);
    // Dark mode resolves to a very dark color; sanity-check the
    // luminance is on the dark side (R+G+B < 384 ~= halfway).
    const rgb = darkBg.match(/\d+/g);
    expect(rgb).not.toBeNull();
    const [r, g, b] = (rgb as RegExpMatchArray).slice(0, 3).map(Number);
    expect(r + g + b).toBeLessThan(384);
  });

  test("axe-core: zero violations on the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(CHAPTER_URL);
    await expectChapterA11y(page);
  });
});
