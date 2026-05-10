import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

test.describe("<Predict> in spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders the heading + description + 2 prompt textareas + closing", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    await expect(
      page.getByRole("heading", { name: "Prediction Moment" })
    ).toBeVisible();
    await expect(
      page.getByText(/Look at the first image in the spoiler reel/)
    ).toBeVisible();

    const colorsBox = page.getByRole("textbox", {
      name: /different colors might represent/,
    });
    const darksBox = page.getByRole("textbox", {
      name: /dark regions/,
    });
    await expect(colorsBox).toBeVisible();
    await expect(darksBox).toBeVisible();

    await expect(page.getByText(/no wrong answer.*intuitions/)).toBeVisible();
  });

  test("each prompt's textarea persists across reload via IndexedDB, keyed by prompt.id", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    const colorsBox = page.getByRole("textbox", {
      name: /different colors might represent/,
    });
    // Wait for hydration: the controlProps guard disables until ready.
    await expect(colorsBox).toBeEnabled({ timeout: 5000 });

    await colorsBox.fill("emission from hydrogen alpha and OIII");
    await expect(colorsBox).toHaveValue(
      "emission from hydrogen alpha and OIII"
    );

    await page.reload();
    const reloaded = page.getByRole("textbox", {
      name: /different colors might represent/,
    });
    await expect(reloaded).toHaveValue(
      "emission from hydrogen alpha and OIII",
      { timeout: 5000 }
    );

    // Verify the IDB stored the per-prompt answer under the expected key.
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
            "student:spoiler-alerts:predict:nebulae-colors:colors:answer"
          );
          req.onsuccess = () => resolve(req.result);
        });
        return value;
      } finally {
        db.close();
      }
    });
    expect(storedValue).toBe("emission from hydrogen alpha and OIII");
  });

  test("axe-core: zero accessibility violations on the Predict surface", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for hydration so textareas have their final aria state.
    await page
      .getByRole("textbox", { name: /different colors might represent/ })
      .waitFor({ state: "attached" });
    await expect(
      page.getByRole("textbox", { name: /different colors might represent/ })
    ).toBeEnabled({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      // Same exclusions as the other smoke specs (Phase 0 acceptable patterns).
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
