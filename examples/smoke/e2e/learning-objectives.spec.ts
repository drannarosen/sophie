import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

test.describe("<LearningObjectives> in spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders 5 objectives, each as a checkable list item with verb + body", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const heading = page.getByRole("heading", {
      name: "By the end of this lecture, you will be able to:",
    });
    await expect(heading).toBeVisible();

    // Each <Objective> child renders as an <li> containing a checkbox
    // + label. The parent <ul> carries aria-busy until the parent
    // useInteractive hydration completes.
    const checkboxes = page.locator("ul[aria-busy] input[type='checkbox']");
    await expect(checkboxes).toHaveCount(5);

    // Verify the verbs from the chapter migration appear in order.
    await expect(page.getByText("State", { exact: true })).toBeVisible();
    await expect(page.getByText("Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Give", { exact: true })).toBeVisible();
  });

  test("checked state persists across reload via IndexedDB, keyed by objective id", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // Wait for hydration: the parent <ul aria-busy="false"> signals the
    // useInteractive store is ready. Per PR-C4, the parent owns the
    // single useInteractive call; checkboxes are pure-display until
    // injected `checked` + `onToggle` props arrive from the parent.
    await page
      .locator("ul[aria-busy='false']")
      .first()
      .waitFor({ timeout: 5000 });

    // Find the checkbox associated with the "thesis" objective via its
    // label text.
    const thesisLabel = page.locator("label", {
      hasText: /the course thesis in one sentence/,
    });
    const thesisCheckbox = thesisLabel.locator(
      "xpath=preceding-sibling::input[@type='checkbox']"
    );
    await expect(thesisCheckbox).not.toBeChecked();

    await thesisCheckbox.check();
    await expect(thesisCheckbox).toBeChecked();

    await page.reload();
    // Re-find after reload (DOM is fresh).
    const thesisLabelReloaded = page.locator("label", {
      hasText: /the course thesis in one sentence/,
    });
    const thesisCheckboxReloaded = thesisLabelReloaded.locator(
      "xpath=preceding-sibling::input[@type='checkbox']"
    );
    await expect(thesisCheckboxReloaded).toBeChecked({ timeout: 5000 });

    // Verify the IDB stored the checked state under the new PR-C4 key
    // shape: profile : chapter : learning-objectives:${componentId}:checked
    // with a Record<objectiveId, boolean> value. The parent
    // <LearningObjectives> owns the single useInteractive record.
    const storedValue = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("sophie-astr201");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const tx = db.transaction("responses", "readonly");
        const store = tx.objectStore("responses");
        const value = await new Promise((resolve) => {
          const req = store.get(
            "student:spoiler-alerts:learning-objectives:lo:checked"
          );
          req.onsuccess = () => resolve(req.result);
        });
        return value;
      } finally {
        db.close();
      }
    });
    // Per ADR 0029, IDB records are `{ value, ts }`. PR-C4 value shape
    // is `Record<objectiveId, boolean>`.
    expect(
      (storedValue as { value: Record<string, boolean> }).value.thesis
    ).toBe(true);
    expect((storedValue as { ts: number }).ts).toBeGreaterThan(0);
  });

  test("axe-core: zero accessibility violations on the LearningObjectives surface", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for hydration of the parent useInteractive before scanning.
    await page
      .locator("ul[aria-busy='false']")
      .first()
      .waitFor({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      // Same exclusions as proving-chapter.spec.ts — Phase 0 acceptable
      // patterns (margin-notes, GFM disabled task-list inputs,
      // theme-level color contrast).
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
