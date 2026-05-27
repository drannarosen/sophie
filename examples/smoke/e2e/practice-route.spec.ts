import { expect, test } from "@playwright/test";

test("link-bar navigates Reading → Practice", async ({ page }) => {
  await page.goto("/units/chrome-primitives-demo/reading");
  await expect(page.locator('nav[aria-label="Unit views"]')).toBeVisible();
  await page
    .locator('nav[aria-label="Unit views"]')
    .getByText("Practice")
    .click();
  await expect(page).toHaveURL(/\/units\/chrome-primitives-demo\/practice$/);
  await expect(page.locator('a[aria-current="page"]')).toHaveText("Practice");
});

test("link-bar omits Slides tab when no slides artifact", async ({ page }) => {
  await page.goto("/units/chrome-primitives-demo/reading");
  const tabs = page.locator('nav[aria-label="Unit views"] a');
  await expect(tabs).toHaveCount(2); // Reading, Practice — no Slides
});

test("trailing CTA links to practice", async ({ page }) => {
  await page.goto("/units/chrome-primitives-demo/reading");
  const cta = page.locator(".sophie-reading-end-cta a");
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page).toHaveURL(/\/units\/chrome-primitives-demo\/practice$/);
});
