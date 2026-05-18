import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 600, height: 900 };

/**
 * PR 6 — <Aside> Tufte-style margin notes.
 *
 * Per docs/plans/2026-05-13-aside-design.md:
 *
 *  - <Aside> renders as <details data-sophie-aside> inline at its
 *    MDX position.
 *  - Desktop Default mode: aside-positioning.ts sets
 *    `data-aside-docked="true"`, `style.top`, and `open` on each
 *    aside; CSS keys on those to render it absolutely-positioned
 *    in the right column area, with summary hidden.
 *  - Mobile / Focused / Wide: aside stays inline as a collapsed
 *    <details>; summary visible, body hidden until user clicks.
 *
 * Smoke chapter ships 3 asides anchored to consecutive paragraphs
 * (per the design doc's chapter-content requirement), exercising
 * the collision-avoidance cascade end-to-end.
 */

test.describe("PR 6: <Aside> on the smoke chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("smoke chapter renders asides inline (all data-sophie-aside)", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    const asides = page.locator("[data-sophie-aside]");
    // PR-C1 migration added 14 definition asides + 1 converted
    // key-insight alongside the original 3 (definition + digression
    // + key-insight) = 18. PR-7 chapter capstone added 8 misconception
    // Asides (rainbows-are-decorative, one-image-tells-the-whole-story,
    // dust-means-empty, dark-matter-is-just-hidden-normal-matter,
    // big-bang-was-an-explosion-in-space, brighter-equals-
    // intrinsically-brighter, wiens-law-absorption-spectra,
    // astronomy-is-looking-through-telescopes). 18 + 8 = 26.
    await expect(asides).toHaveCount(26);
  });

  test("each aside carries its kind via data-aside-kind", async ({ page }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    const kinds = await page
      .locator("[data-sophie-aside]")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).dataset.asideKind ?? "")
      );
    // Assert distribution rather than the exact MDX order. Post-
    // PR-7 the smoke chapter has 15 definitions + 1 digression +
    // 2 key-insights + 8 misconceptions = 26. The ordering depends
    // on prose flow; counts are the stable contract.
    const counts = kinds.reduce<Record<string, number>>(
      (acc, k) => Object.assign(acc, { [k]: (acc[k] ?? 0) + 1 }),
      {}
    );
    expect(counts).toEqual({
      definition: 15,
      digression: 1,
      "key-insight": 2,
      misconception: 8,
    });
  });

  test("desktop Default: positioning script docks asides (data-aside-docked='true', top set, open)", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    // Wait for the positioning script's rAF + at least one
    // MutationObserver pass to settle.
    await page.waitForFunction(() =>
      document
        .querySelector("[data-sophie-aside]")
        ?.hasAttribute("data-aside-docked")
    );

    const aside = page.locator("[data-sophie-aside]").first();
    await expect(aside).toHaveAttribute("data-aside-docked", "true");
    await expect(aside).toHaveAttribute("open", "");
    const top = await aside.evaluate((el) => (el as HTMLElement).style.top);
    expect(top).toMatch(/^\d+px$/);
  });

  test("desktop Default: docked asides position to the right of content", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    await page.waitForFunction(() =>
      document
        .querySelector("[data-sophie-aside]")
        ?.hasAttribute("data-aside-docked")
    );

    const asideBox = await page
      .locator("[data-sophie-aside]")
      .first()
      .boundingBox();
    const contentBox = await page.locator(".sophie-content").boundingBox();
    expect(asideBox?.x ?? 0).toBeGreaterThan(
      (contentBox?.x ?? 0) + (contentBox?.width ?? 0) - 10
    );
  });

  test("desktop Default: docked summary is visually hidden", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    await page.waitForFunction(() =>
      document
        .querySelector("[data-sophie-aside]")
        ?.hasAttribute("data-aside-docked")
    );
    const summary = page
      .locator("[data-sophie-aside]")
      .first()
      .locator("summary");
    await expect(summary).toBeHidden();
  });

  test("desktop Default: consecutive asides do not vertically overlap (collision cascade)", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    await page.waitForFunction(
      () => document.querySelectorAll("[data-aside-docked='true']").length >= 3
    );

    const tops = await page
      .locator("[data-sophie-aside]")
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).offsetTop));
    const heights = await page
      .locator("[data-sophie-aside]")
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).offsetHeight));

    // For each consecutive pair, the second must start at or below
    // the first's bottom (with the GAP rounded out).
    for (let i = 0; i < tops.length - 1; i++) {
      const firstBottom = (tops[i] ?? 0) + (heights[i] ?? 0);
      const secondTop = tops[i + 1] ?? 0;
      expect(secondTop).toBeGreaterThanOrEqual(firstBottom);
    }
  });

  test("Focused mode: asides revert to inline (no data-aside-docked, open cleared)", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    // Wait for initial docking.
    await page.waitForFunction(() =>
      document
        .querySelector("[data-sophie-aside]")
        ?.hasAttribute("data-aside-docked")
    );

    // Cycle view mode to Focused.
    await page.getByRole("button", { name: /^view:/i }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-view-mode",
      "focused"
    );

    // Wait one rAF for the positioning script to react.
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-sophie-aside]");
      return a && !a.hasAttribute("data-aside-docked");
    });

    const aside = page.locator("[data-sophie-aside]").first();
    await expect(aside).not.toHaveAttribute("data-aside-docked", "true");
    await expect(aside).not.toHaveAttribute("open", "");
  });

  test("mobile (<768px): asides render inline with visible summary", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(CHAPTER_URL);

    const aside = page.locator("[data-sophie-aside]").first();
    // No docking at mobile.
    await expect(aside).not.toHaveAttribute("data-aside-docked", "true");
    // Summary is visible (the disclosure affordance).
    const summary = aside.locator("summary");
    await expect(summary).toBeVisible();
  });

  test("mobile: clicking the summary toggles open/closed", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(CHAPTER_URL);
    const aside = page.locator("[data-sophie-aside]").first();
    const summary = aside.locator("summary");

    // Initial: collapsed.
    await expect(aside).not.toHaveAttribute("open", "");

    await summary.click();
    await expect(aside).toHaveAttribute("open", "");

    await summary.click();
    await expect(aside).not.toHaveAttribute("open", "");
  });

  test("mobile: summary meets the WCAG 44px touch-target minimum", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(CHAPTER_URL);
    const summary = page
      .locator("[data-sophie-aside]")
      .first()
      .locator("summary");
    const box = await summary.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("resize desktop → mobile: docked asides revert to inline", async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    await page.waitForFunction(() =>
      document
        .querySelector("[data-sophie-aside]")
        ?.hasAttribute("data-aside-docked")
    );

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-sophie-aside]");
      return a && !a.hasAttribute("data-aside-docked");
    });

    const aside = page.locator("[data-sophie-aside]").first();
    await expect(aside).not.toHaveAttribute("data-aside-docked", "true");
  });

  test("axe-core: zero violations on asides in docked and inline modes", async ({
    page,
  }) => {
    // Docked (desktop Default).
    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto(CHAPTER_URL);
    await page.waitForFunction(() =>
      document
        .querySelector("[data-sophie-aside]")
        ?.hasAttribute("data-aside-docked")
    );
    const dockedResults = await new AxeBuilder({ page })
      .include("[data-sophie-aside]")
      .disableRules(["color-contrast"])
      .analyze();
    expect(dockedResults.violations).toEqual([]);

    // Inline (mobile).
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-sophie-aside]");
      return a && !a.hasAttribute("data-aside-docked");
    });
    const inlineResults = await new AxeBuilder({ page })
      .include("[data-sophie-aside]")
      .disableRules(["color-contrast"])
      .analyze();
    expect(inlineResults.violations).toEqual([]);
  });
});
