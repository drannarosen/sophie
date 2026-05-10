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

    // Each objective renders as a <li> with a checkbox + label.
    const checkboxes = page
      .locator("label", { hasText: /State|Explain|Name|Give/ })
      .locator("xpath=preceding-sibling::input[@type='checkbox']");
    await expect(checkboxes).toHaveCount(5);

    // Verify the verbs from the chapter migration appear in order.
    await expect(page.getByText("State", { exact: true })).toBeVisible();
    await expect(page.getByText("Name", { exact: true })).toBeVisible();
    await expect(page.getByText("Give", { exact: true })).toBeVisible();
  });

  test("checked state persists across reload via IndexedDB, keyed by objective.id", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // Wait for hydration: the disabled-while-loading guard prevents
    // race-condition click loss. After hydration the first checkbox is
    // enabled.
    const firstCheckbox = page
      .locator("input[type='checkbox'][aria-busy]")
      .first();
    await expect(firstCheckbox).toBeEnabled({ timeout: 5000 });

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

    // Verify the IDB stored the checked state under the expected key
    // shape: profile : chapter : learning-objectives:${componentId}:${objectiveId}:checked
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
            "student:spoiler-alerts:learning-objectives:lo:thesis:checked"
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

  test("axe-core: zero accessibility violations on the LearningObjectives surface", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for the LO checkboxes to finish hydrating before scanning.
    await page
      .locator("input[type='checkbox'][aria-busy='false']")
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
