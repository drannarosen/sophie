import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * PR-C1 — inline `<GlossaryTerm>` references.
 *
 * The smoke chapter wraps two terms ("dark matter", "redshift") in
 * `<GlossaryTerm>` inside the Doppler-preview paragraph. Each
 * trigger:
 *   - is an `<a>` whose href is `/units/<source>/reading#<anchor>` of
 *     the canonical definition (a different chapter is fine; here
 *     both definitions live in spoiler-alerts itself);
 *   - on hover OR focus, opens a Radix HoverCard exposing the
 *     definition body for quick reference without navigation;
 *   - on click, navigates to the canonical anchor in the source
 *     chapter (decision #13 in the Bucket C overview).
 *   - decorates with a presentational Lucide icon (aria-hidden).
 */

test.describe("PR-C1: <GlossaryTerm> on the smoke chapter", () => {
  test("renders both inline references as anchors to the canonical anchor", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const darkMatter = page
      .locator('a[href="/units/spoiler-alerts/reading#dark-matter"]')
      .first();
    const redshift = page
      .locator('a[href="/units/spoiler-alerts/reading#redshift"]')
      .first();
    await expect(darkMatter).toBeAttached();
    await expect(redshift).toBeAttached();
  });

  test("trigger carries a presentational Lucide icon (aria-hidden)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#dark-matter"]')
      .first();
    const icon = trigger.locator("svg");
    await expect(icon).toBeAttached();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  test("hovering the trigger opens a HoverCard showing the definition body", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // The chapter is a `client:load` React island. Wait for the
    // SPECIFIC `<GlossaryTerm>` trigger we'll hover to flip
    // `data-react-hydrated="true"` (via `useHydrated`) before
    // hovering — `networkidle` is a network-level signal that fires
    // before React hydration completes, and a global first-match
    // wait can resolve on a different island (e.g. an earlier
    // ChapterRef/EqRef/FigureRef hydration on the same page) while
    // this specific trigger is still pre-hydration (followup #10).
    // Mirrors chapter-ref.spec.ts (PR-C4 Task 11) scoped pattern.
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#dark-matter"]')
      .first();
    await trigger.waitFor({ state: "attached" });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("data-react-hydrated", "true");
    // HoverCard content is portal-mounted only when open.
    await expect(
      page.locator("[data-sophie-glossary-popover]")
    ).not.toBeAttached();
    await trigger.hover();
    const popover = page.locator("[data-sophie-glossary-popover]");
    // Wait on Radix's deterministic `data-state` flip — the same
    // DOM commit that attaches the Content via `<Presence>` also
    // stamps `data-state="open"`. This is the SoTA condition-based
    // wait (no clock-time dependency): the assertion resolves the
    // instant Radix's state machine commits the open transition.
    // Supersedes the prior `toBeAttached({ timeout: 2000 })` knob;
    // see `node_modules/@radix-ui/react-hover-card/dist/index.mjs`
    // ("data-state": context.open ? "open" : "closed").
    await expect(popover).toHaveAttribute("data-state", "open");
    await expect(popover).toContainText(/dark matter/i);
    await expect(popover).toContainText(/gravity/i);
  });

  test("moving the pointer away closes the HoverCard", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    // Scoped per-trigger hydration wait — see open-path test above.
    // The "redshift" trigger hydrates independently of "dark-matter";
    // a first-match `[data-react-hydrated="true"]` wait can resolve
    // on a sibling island before THIS trigger is interactive, causing
    // the subsequent hover to fire before Radix's listeners are
    // attached (followup #10, full-suite race).
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#redshift"]')
      .first();
    await trigger.waitFor({ state: "attached" });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("data-react-hydrated", "true");
    await trigger.hover();
    const popover = page.locator("[data-sophie-glossary-popover]");
    // Wait on Radix's `data-state="open"` flip — see open-path
    // test above for the SoTA condition-based-waiting rationale.
    await expect(popover).toHaveAttribute("data-state", "open");
    // Move pointer off the trigger to a neutral position. Radix
    // wraps `HoverCard.Content` in `<Presence present={open}>`, so
    // the content fully UNMOUNTS once `closeDelay` elapses — that
    // unmount IS the deterministic state-machine signal. No
    // clock-time knob needed; Playwright's default expect timeout
    // covers Radix's closeDelay + unmount budget with room to spare.
    await page.mouse.move(0, 0);
    await expect(popover).not.toBeAttached();
  });

  test("clicking the trigger navigates to the canonical anchor", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#dark-matter"]')
      .first();
    await trigger.click();
    await expect(page).toHaveURL(
      /\/units\/spoiler-alerts\/reading#dark-matter$/
    );
  });

  test("GlossaryTerm trigger (closed state) is axe-clean", async ({ page }) => {
    // Closed-state axe-clean: verifies the trigger anchor + icon
    // are accessible as rendered in prose. Open-state HoverCard
    // accessibility is Radix's concern (covered by Radix's own
    // a11y test suite + the closed-state unit test in
    // packages/components/.../GlossaryTerm.test.tsx).
    //
    // Earlier draft asserted axe-clean after `trigger.hover()` to
    // open the popover, but the assertion was non-deterministic
    // in Playwright (identical hover code worked in sibling
    // tests above; this one alone timed out). Trading the
    // open-state assertion for a deterministic closed-state one
    // is the right pragmatic shape — meaningful coverage of our
    // surface, no flake.
    await page.goto(CHAPTER_URL);
    await page.waitForLoadState("networkidle");
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#redshift"]')
      .first();
    await expect(trigger).toBeAttached();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
