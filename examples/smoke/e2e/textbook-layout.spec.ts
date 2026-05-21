import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR 1 — Layout shell foundation (book-theme + sidebar toggle).
 *
 * Per docs/plans/2026-05-12-layout-shell-foundation-design.md, the
 * <TextbookLayout> compound component ships:
 *
 * - Top bar (sticky): `.sophie-topbar`
 * - Left sidebar (collapsible): `.sophie-sidebar`
 * - Center content column (75ch cap in Default mode): `.sophie-content`
 * - Right column (placeholder for ToC + asides in PRs 4 + 6): `.sophie-right`
 * - <SidebarToggle> button in <TopBar> by default
 *
 * Sidebar state lives in `data-sidebar="open"|"closed"` on `<html>`,
 * managed by a tiny vanilla-JS inline script. Persists via localStorage
 * key `sophie:sidebar`. Cross-tab sync via the `storage` event.
 *
 * View modes (Default/Focused/Wide), theme toggle, sidebar nav contents,
 * ToC contents, asides, and search are all OUT OF SCOPE for PR 1 (land
 * in PRs 2-7).
 */

test.describe("PR 1: TextbookLayout shell on the smoke chapter", () => {
  test.beforeEach(async ({ context }) => {
    // Each test gets a fresh context (Playwright default), so
    // localStorage is empty at start. We only need to explicitly
    // clear cookies (matches the pattern in deep-dive-callout.spec.ts
    // and others). DO NOT use addInitScript to clear localStorage —
    // it would re-clear on every page reload, breaking persistence
    // tests like the toggle's `survives across reload` assertion.
    await context.clearCookies();
  });

  test("renders top bar + structural primitives (sidebar/content/right exist in DOM)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await expect(page.locator(".sophie-topbar")).toBeVisible();
    await expect(page.locator(".sophie-content")).toBeVisible();
    // The sidebar and right column are structural primitives that exist
    // in DOM even when their slots are empty (so consumers can compose
    // them later). When empty, they collapse to 0 width — see the
    // "empty *: column collapses" tests below.
    await expect(page.locator(".sophie-sidebar")).toBeAttached();
    await expect(page.locator(".sophie-right")).toBeAttached();
  });

  // The PR 1 "empty sidebar slot collapses" + "empty right-column
  // slot collapses" tests lived here. The PR 1 ADR 0034 feature still
  // works, but as of PRs 3 + 4 the smoke chapter's slots are both
  // filled (sidebar = <ModuleNav>, right = <TocSidebar>), so neither
  // test's premise applies on the spoiler-alerts chapter. Coverage
  // moved to spec files closer to the features:
  //   - PR 3 module-nav.spec.ts:82 asserts the sidebar column
  //     does NOT collapse on a filled chapter.
  //   - PR 4 in-page-toc.spec.ts:81 asserts the right column DOES
  //     collapse on a stub chapter (no H2 headings → empty slot).

  // Sprint K (2026-05-21, commit 997e545): the sidebar default flipped
  // from "open on desktop / closed on mobile" to "closed on every
  // viewport" — MyST-style "chapter is the content, chrome opens on
  // demand." Tests below assert the new contract; cold-load default-
  // closed is also covered explicitly by sidebar-initial-state.spec.ts.

  test("default state: html has data-sidebar='closed' (Sprint K)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await expect(page.locator("html")).toHaveAttribute(
      "data-sidebar",
      "closed"
    );
  });

  test("clicking sidebar toggle: opens sidebar and persists across reload", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /toggle sidebar/i });
    await expect(toggle).toBeVisible();

    // Default is closed under Sprint K — clicking opens.
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "open");
  });

  test("mobile (<768px): sidebar defaults to 'closed' so it doesn't obscure content", async ({
    browser,
  }) => {
    // Use a fresh mobile-viewport context so default behavior is honored.
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const page = await context.newPage();
    try {
      await page.goto(CHAPTER_URL);
      await expect(page.locator(".sophie-topbar")).toBeVisible();
      // Default on mobile must be "closed" so the slide-over sidebar
      // doesn't obscure the chapter content the user came to read.
      await expect(page.locator("html")).toHaveAttribute(
        "data-sidebar",
        "closed"
      );
    } finally {
      await context.close();
    }
  });

  test("desktop (>=768px): sidebar also defaults to 'closed' (Sprint K design)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    try {
      await page.goto(CHAPTER_URL);
      await expect(page.locator(".sophie-topbar")).toBeVisible();
      // Sprint K design: desktop and mobile share the default-closed
      // convention (was open-on-desktop pre-997e545).
      await expect(page.locator("html")).toHaveAttribute(
        "data-sidebar",
        "closed"
      );
    } finally {
      await context.close();
    }
  });

  test("axe-core: zero violations on the new layout chrome", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.locator(".sophie-topbar").waitFor({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .include(
        ".sophie-topbar, .sophie-sidebar, .sophie-content, .sophie-right"
      )
      // .margin-note is the existing chapter-content aside markup;
      // its a11y is the responsibility of the margin-note-PR (PR 6),
      // not this chrome PR. Other specs follow the same exclusion.
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      // list/listitem suppression — see proving-chapter.spec.ts for
      // the LearningObjectives astro-slot follow-up rationale.
      .disableRules(["color-contrast", "list", "listitem"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
