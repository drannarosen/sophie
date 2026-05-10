import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

test.describe("Phase 0 vertical-slice acceptance — spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    // Each test gets a fresh IDB by isolating origin storage. The
    // BroadcastChannel persistence survives within a single test run
    // but doesn't leak across tests.
    await context.clearCookies();
  });

  test("renders prose, math, figures, callouts, and tables", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    await expect(page).toHaveTitle(/Spoiler Alerts/);

    // Static structure expectations (matches @sophie/components README's
    // 14→4 mapping table for this chapter).
    // Was 36 in Phase 0; dropped to 35 in Trio 2 when the Prediction
    // Moment Callout migrated to <Predict> (which renders as a section,
    // not role="note"). See examples/smoke/e2e/predict.spec.ts for the
    // <Predict> coverage.
    await expect(page.locator("[role='note']")).toHaveCount(35);
    await expect(page.locator("figure")).toHaveCount(19);
    await expect(page.locator("table")).toHaveCount(9);

    // KaTeX rendered all math (no raw `$...$` left behind).
    const katexCount = await page.locator(".katex").count();
    expect(katexCount).toBeGreaterThan(100);

    // First figure has alt text and a usable src.
    const firstImg = page.locator("figure img").first();
    await expect(firstImg).toHaveAttribute("alt", /\w+/);
    const src = await firstImg.getAttribute("src");
    expect(src).toBeTruthy();
    if (src) {
      const response = await page.request.get(src);
      expect(response.status()).toBe(200);
    }
  });

  test("interactive callout: toggle persists across reload via IndexedDB", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // Six "Mark as reviewed" labels = six interactive callouts.
    const reviewLabels = page.locator("label", {
      hasText: /Mark as reviewed/,
    });
    await expect(reviewLabels).toHaveCount(6);

    // Toggle the first one. Wait briefly for the IDB write before
    // navigating away.
    const firstLabel = reviewLabels.first();
    await firstLabel.click();
    await expect(
      page.locator("label", { hasText: "Reviewed" }).first()
    ).toBeVisible();

    // Reload. The state must rehydrate from IndexedDB.
    await page.reload();
    await expect(
      page.locator("label", { hasText: "Reviewed" }).first()
    ).toBeVisible({ timeout: 5000 });

    // Verify the underlying DB exists with the expected key.
    const storedValue = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("sophie-smoke");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const tx = db.transaction("responses", "readonly");
        const store = tx.objectStore("responses");
        const value = await new Promise((resolve) => {
          const req = store.get(
            "student:spoiler-alerts:callout:check-yourself-1:reviewed"
          );
          req.onsuccess = () => resolve(req.result);
        });
        return value;
      } finally {
        db.close();
      }
    });
    expect(storedValue).toBe(true);
  });

  test("axe-core: zero accessibility violations on platform-rendered surface", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for hydration to settle so dynamic regions are present.
    await page
      .locator("label", { hasText: /Mark as reviewed/ })
      .first()
      .waitFor();

    const results = await new AxeBuilder({ page })
      // Exclusions document Phase-0 known-acceptable patterns:
      // - `.margin-note`: 22 column-margin <aside> elements from MDX.
      //   Phase 1 replaces these with a <MarginNote> component (per
      //   ADR-queue) that carries role="note" + a unique label.
      // - GFM task-list checkboxes: remark-gfm renders `[x]` lists as
      //   `<input type="checkbox" disabled>` siblings of text without
      //   wrapping `<label>`. Markdown convention; not actionable
      //   from Sophie's side without a custom rehype plugin.
      // - color-contrast: theme-level concern; @sophie/theme runs its
      //   own WCAG-AA contrast check at build time.
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
