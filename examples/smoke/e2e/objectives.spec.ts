import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const OBJECTIVES_URL = "/objectives";

/**
 * PR-C4 — `/objectives` course-wide LO roll-up.
 *
 * Covers TDD test list rows E6–E9 from the PR-C4 design doc
 * (`docs/plans/2026-05-14-pr-c4-design.md`).
 *
 * The route is server-rendered Astro consuming `PedagogyIndex.modules`,
 * `PedagogyIndex.chapters`, and `PedagogyIndex.objectives` via
 * `<CourseObjectives>`. Hierarchy: module (course-outline order via
 * `ModuleEntry.order`) → chapter (authoring order via
 * `ChapterEntry.order`) → objectives (extractor source-walk order).
 *
 * Chapter headings render as plain `<a href="/chapters/{slug}">` (not
 * `<ChapterRef>` — see PR-C4 design doc "Chapter heading uses a plain
 * `<a href>`"; the page is pure Astro and ChapterRef is React, so we
 * preserve the clickable affordance without paying hydration cost).
 *
 * Smoke content:
 *   - module `foundations` (Foundations, order 1)
 *       → `spoiler-alerts` (5 objectives)
 *       → `measuring-the-sky` (1 objective: "stub")
 *   - module `stars` (Stars & Spectra, order 2)
 *       → `stellar-evolution` (1 objective: "stub")
 */

test.describe("PR-C4: /objectives course roll-up", () => {
  test("E6: lists every module from the content collection with its chapters", async ({
    page,
  }) => {
    await page.goto(OBJECTIVES_URL);
    // Scope to the `<CourseObjectives>` surface — the sidebar
    // ModuleNav ALSO renders `<h2>Foundations</h2>` /
    // `<h2>Stars &amp; Spectra</h2>` for navigation, so a page-wide
    // `getByRole("heading", { level: 2 })` would strict-mode-collide.
    const main = page.locator("[data-sophie-course-objectives]");
    await expect(main).toBeAttached();

    // Module h2s — Foundations + Stars & Spectra inside the
    // CourseObjectives container.
    await expect(
      main.getByRole("heading", { level: 2, name: "Foundations" })
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { level: 2, name: "Stars & Spectra" })
    ).toBeVisible();
    // Module-order assertion: Foundations precedes Stars & Spectra in
    // the DOM (the `<CourseObjectives>` sort is course-outline order).
    const moduleHeadings = main.getByRole("heading", { level: 2 });
    await expect(moduleHeadings.first()).toHaveText("Foundations");

    // All three chapter headings appear.
    await expect(
      main.getByRole("heading", { level: 3, name: /Spoiler Alerts/ })
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { level: 3, name: /Measuring the Sky/ })
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { level: 3, name: /Stellar Evolution/ })
    ).toBeVisible();
  });

  test("E7: each chapter heading is a clickable <a> to /chapters/{slug}", async ({
    page,
  }) => {
    await page.goto(OBJECTIVES_URL);
    // spoiler-alerts heading wraps an anchor; PR-C4 design doc spec.
    const spoilerAnchor = page
      .getByRole("heading", { level: 3 })
      .filter({ hasText: /Spoiler Alerts/ })
      .locator("a");
    await expect(spoilerAnchor).toHaveAttribute(
      "href",
      "/chapters/spoiler-alerts"
    );

    const measuringAnchor = page
      .getByRole("heading", { level: 3 })
      .filter({ hasText: /Measuring the Sky/ })
      .locator("a");
    await expect(measuringAnchor).toHaveAttribute(
      "href",
      "/chapters/measuring-the-sky"
    );

    const stellarAnchor = page
      .getByRole("heading", { level: 3 })
      .filter({ hasText: /Stellar Evolution/ })
      .locator("a");
    await expect(stellarAnchor).toHaveAttribute(
      "href",
      "/chapters/stellar-evolution"
    );

    // Clicking navigates.
    await spoilerAnchor.click();
    await expect(page).toHaveURL(/\/chapters\/spoiler-alerts$/);
  });

  test("E8: objectives render with verb + body in authoring order", async ({
    page,
  }) => {
    await page.goto(OBJECTIVES_URL);

    // spoiler-alerts has 5 objectives migrated in PR-C4 Task 4.
    // Their verbs in source-walk order: State, Explain, Name,
    // Explain, Give. Their `id`s: thesis, inference, quantities,
    // fls, wavelength. Anchors: `lo-${id}`.
    const spoilerArticle = page
      .locator("article")
      .filter({ has: page.locator('a[href="/chapters/spoiler-alerts"]') });
    const spoilerItems = spoilerArticle.locator("li");
    await expect(spoilerItems).toHaveCount(5);

    // First item: verb "State", body mentions the course thesis.
    const firstItem = spoilerItems.nth(0);
    await expect(firstItem).toHaveAttribute("id", "lo-thesis");
    await expect(firstItem.locator("strong")).toHaveText("State");
    await expect(firstItem).toContainText(/course thesis in one sentence/);

    // Third item: verb "Name", body mentions key physical quantities.
    const thirdItem = spoilerItems.nth(2);
    await expect(thirdItem).toHaveAttribute("id", "lo-quantities");
    await expect(thirdItem.locator("strong")).toHaveText("Name");

    // Last item: verb "Give".
    const lastItem = spoilerItems.nth(4);
    await expect(lastItem).toHaveAttribute("id", "lo-wavelength");
    await expect(lastItem.locator("strong")).toHaveText("Give");

    // measuring-the-sky has 1 stub objective with verb "Recognize".
    const measuringArticle = page
      .locator("article")
      .filter({ has: page.locator('a[href="/chapters/measuring-the-sky"]') });
    const measuringItems = measuringArticle.locator("li");
    await expect(measuringItems).toHaveCount(1);
    await expect(measuringItems.first().locator("strong")).toHaveText(
      "Recognize"
    );
  });

  test("E9: axe-clean /objectives page", async ({ page }) => {
    await page.goto(OBJECTIVES_URL);
    const results = await new AxeBuilder({ page })
      // Same exclusions as proving-chapter / theme-toggle specs —
      // theme-level color contrast is a Phase 0 acceptable pattern;
      // margin-notes / GFM task-list inputs aren't applicable here
      // but excluded for consistency with the existing axe surfaces.
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
