import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SPOILER_ALERTS = "/chapters/spoiler-alerts";
const MEASURING_THE_SKY = "/chapters/measuring-the-sky";
const STELLAR_EVOLUTION = "/chapters/stellar-evolution";

/**
 * PR 3 — Sidebar module/chapter navigation.
 *
 * Per docs/plans/2026-05-12-sidebar-module-nav-design.md, the
 * <ModuleNav> primitive renders all modules + chapters as a
 * two-level tree in the sidebar slot. Active state is set on the
 * SSR'd link via `aria-current="page"`. No client JS.
 */

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
    // Three foundations chapters as of Intervention PR-γ: the PR-γ
    // smoke fixture (`misconception-fixture.mdx`, order=3) pairs a
    // misconception Aside with two literature-grounded interventions
    // so the extractor's pedagogy-index `interventions` collection
    // populates end-to-end.
    await expect(foundations).toHaveCount(3);
    await expect(foundations.nth(0)).toHaveText(/Spoiler Alerts/);
    await expect(foundations.nth(1)).toHaveText(/Measuring the Sky/);
    await expect(foundations.nth(2)).toHaveText(
      /Misconceptions and Interventions/
    );

    const stars = page.locator(
      ".sophie-module[data-module='stars'] .sophie-chapter-list a"
    );
    await expect(stars).toHaveCount(1);
    await expect(stars.nth(0)).toHaveText(/Stellar Evolution/);
  });

  test("aria-current='page' is on the active chapter only", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    const active = page.locator(".sophie-chapter-list a[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", "/chapters/spoiler-alerts");
  });

  test("clicking another chapter navigates and active state moves", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
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
    await page
      .locator(".sophie-chapter-list a", { hasText: /Stellar Evolution/ })
      .click();
    await expect(page).toHaveURL(STELLAR_EVOLUTION);
    const active = page.locator(".sophie-chapter-list a[aria-current='page']");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", STELLAR_EVOLUTION);
  });

  test("sidebar slot is now filled — column does not collapse", async ({
    page,
  }) => {
    await page.goto(SPOILER_ALERTS);
    // The shell has --sophie-sidebar-w defaulting to 280px in CSS;
    // empty-slot-collapse logic in TextbookLayout overrides it to 0
    // when the slot is empty. PR 3 fills the slot, so the inline
    // style override should be absent and the rendered width should
    // be > 0.
    const shellWidth = await page.evaluate(() => {
      const shell = document.querySelector(".sophie-shell") as HTMLElement;
      const style = getComputedStyle(shell);
      return style.getPropertyValue("--sophie-sidebar-w").trim();
    });
    expect(shellWidth).not.toBe("0");
  });

  test("axe-core: zero violations on the new nav region", async ({ page }) => {
    await page.goto(SPOILER_ALERTS);
    const results = await new AxeBuilder({ page })
      .include(".sophie-module-nav")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
