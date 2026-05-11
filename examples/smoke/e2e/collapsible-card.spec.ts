import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

const DEEP_DIVES = [
  "Deep Dive: Hydrogen's Atomic Fingerprint",
  "Deep Dive: How the Distance Ladder Works",
  "Deep Dive: Nucleosynthesis Sites",
  "Deep Dive: The 21-cm Hydrogen Line",
];

test.describe("<CollapsibleCard> Deep Dives in spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders 4 Deep Dive cards, each collapsed by default", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    for (const title of DEEP_DIVES) {
      const trigger = page.getByRole("button", { name: title });
      await expect(trigger).toBeVisible();
      // controlProps.disabled lifts after hydration.
      await expect(trigger).toBeEnabled({ timeout: 5000 });
      // Closed by default per design — "skippable on first read".
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
  });

  test("click expands; reload preserves expanded state via IndexedDB", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    const trigger = page.getByRole("button", {
      name: "Deep Dive: How the Distance Ladder Works",
    });
    await expect(trigger).toBeEnabled({ timeout: 5000 });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.reload();
    const reloaded = page.getByRole("button", {
      name: "Deep Dive: How the Distance Ladder Works",
    });
    await expect(reloaded).toBeEnabled({ timeout: 5000 });
    await expect(reloaded).toHaveAttribute("aria-expanded", "true");

    // Verify the persisted IDB key directly. The migrated CollapsibleCards
    // use course="smoke" (matching the InteractiveCallout pattern in this
    // chapter), so the database is "sophie-smoke". The component's
    // useInteractive key is "collapsible-card:distance-ladder:open"; the
    // full IDB key is namespaced by profile + chapter to
    // `student:spoiler-alerts:collapsible-card:distance-ladder:open`.
    const storedValue = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("sophie-smoke");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        const tx = db.transaction("responses", "readonly");
        const store = tx.objectStore("responses");
        const value = await new Promise<unknown>((resolve, reject) => {
          const req = store.get(
            "student:spoiler-alerts:collapsible-card:distance-ladder:open"
          );
          req.onerror = () => reject(req.error);
          req.onsuccess = () => resolve(req.result);
        });
        return value;
      } finally {
        db.close();
      }
    });
    // Per ADR 0029, IDB records are `{ value, ts }`.
    expect((storedValue as { value: boolean }).value).toBe(true);
    expect((storedValue as { ts: number }).ts).toBeGreaterThan(0);
  });

  test("axe-core: zero accessibility violations on the Deep Dive surfaces", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for at least one Deep Dive trigger to finish hydrating.
    await page
      .getByRole("button", { name: DEEP_DIVES[0] })
      .waitFor({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
