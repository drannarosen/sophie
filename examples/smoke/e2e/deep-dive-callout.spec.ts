import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * Migrated by Session 9 P3 (PR-A, 2026-05-19): the 4 Deep Dives in
 * the smoke chapter moved from `<CollapsibleCard>` to
 * `<Callout variant="deep-dive">`. The new variant composes native
 * `<details>` for disclosure (no JS, no persistence) — see
 * `packages/components/src/components/Callout/Callout.tsx` and the
 * P3 PR description for the design tradeoff (lost CollapsibleCard's
 * per-student persistence in exchange for native a11y +
 * print-mode auto-expand via CSS, plus the unified pedagogy surface).
 *
 * Renamed from `collapsible-card.spec.ts` in the same PR-A migration
 * commit so the filename matches what the spec actually tests.
 */
const DEEP_DIVES = [
  "Deep Dive: Hydrogen's Atomic Fingerprint",
  "Deep Dive: How the Distance Ladder Works",
  "Deep Dive: Nucleosynthesis Sites",
  "Deep Dive: The 21-cm Hydrogen Line",
];

test.describe("<Callout variant='deep-dive'> Deep Dives in spoiler-alerts chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("renders 4 Deep Dive callouts, each collapsed by default", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    for (const title of DEEP_DIVES) {
      // Each deep-dive renders as <aside role="note"> containing a
      // <details><summary>...</summary>...</details>. The aria-label
      // on the aside carries the prefixed title.
      const callout = page.getByRole("note", { name: title });
      await expect(callout).toBeVisible();

      // The inner <details> defaults to collapsed (no `open` attribute).
      const details = callout.locator("details");
      await expect(details).toHaveCount(1);
      await expect(details).not.toHaveAttribute("open", /.*/);
    }
  });

  test("clicking the summary expands the disclosure", async ({ page }) => {
    await page.goto(CHAPTER_URL);

    const callout = page.getByRole("note", {
      name: "Deep Dive: How the Distance Ladder Works",
    });
    const details = callout.locator("details");
    await expect(details).not.toHaveAttribute("open", /.*/);

    // <summary> is the disclosure trigger (native semantics).
    await callout.getByText("Deep Dive: How the Distance Ladder Works").click();
    await expect(details).toHaveAttribute("open", "");
  });

  test("axe-core: zero accessibility violations on the Deep Dive surfaces", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page
      .getByRole("note", { name: DEEP_DIVES[0] })
      .waitFor({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
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
