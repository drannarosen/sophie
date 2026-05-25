import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

test.describe("Self-assessment family in spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders the four widgets with their prompts", async ({ page }) => {
    await page.goto(CHAPTER_URL);

    // Heading for the demo block.
    await expect(
      page.getByRole("heading", { name: "How was the reading?" })
    ).toBeVisible();

    // ConfidenceCheck: 5-point Likert
    await expect(
      page.getByText(/How confident do you feel about/)
    ).toBeVisible();

    // ComprehensionGate
    await expect(page.getByRole("radio", { name: "I got it" })).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "I need to revisit" })
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: "I'm stuck" })).toBeVisible();

    // EffortLog
    await expect(page.getByRole("radio", { name: "Skimmed" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Read" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Studied" })).toBeVisible();

    // Reflection
    await expect(
      page.getByRole("textbox", { name: /most confusing thing/ })
    ).toBeVisible();
  });

  test("each widget persists its value across reload via IndexedDB under the self-assessment: key prefix", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // Pick: ComprehensionGate "I'm stuck"
    const stuck = page.getByRole("radio", { name: "I'm stuck" });
    await expect(stuck).toBeEnabled();
    await stuck.check();
    await expect(stuck).toBeChecked();

    // Pick: EffortLog "Studied"
    const studied = page.getByRole("radio", { name: "Studied" });
    await expect(studied).toBeEnabled();
    await studied.check();
    await expect(studied).toBeChecked();

    // Reload — both should re-hydrate.
    await page.reload();
    await expect(page.getByRole("radio", { name: "I'm stuck" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Studied" })).toBeChecked();

    // Verify IDB keys use the `self-assessment:${widget}:${id}` prefix.
    const stored = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("sophie-astr201");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const tx = db.transaction("responses", "readonly");
        const store = tx.objectStore("responses");
        const get = (key: string) =>
          new Promise((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
          });
        return {
          comprehension: await get(
            "student:spoiler-alerts:self-assessment:comprehension:post-reading-comprehension"
          ),
          effort: await get(
            "student:spoiler-alerts:self-assessment:effort:post-reading-effort"
          ),
        };
      } finally {
        db.close();
      }
    });
    // Per ADR 0029, IDB records are `{ value, ts }`.
    expect((stored.comprehension as { value: string }).value).toBe("stuck");
    expect((stored.comprehension as { ts: number }).ts).toBeGreaterThan(0);
    expect((stored.effort as { value: string }).value).toBe("studied");
    expect((stored.effort as { ts: number }).ts).toBeGreaterThan(0);
  });

  test("axe-core: zero accessibility violations on the self-assessment block", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for any of the four widgets to finish hydrating.
    await expect(page.getByRole("radio", { name: "I got it" })).toBeEnabled();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
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
