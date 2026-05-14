import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C2 — inline `<EqRef>` cross-references.
 *
 * Covers TDD test list rows T24 + T25 from the PR-C2 design doc
 * (`docs/plans/2026-05-13-pr-c2-equations-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) places two cites — one of
 * each rendering mode per design decision #13:
 *   - line ~302: `<EqRef slug="inverse-square-law" client:load />`
 *     (self-closing → renders "Eq. 1")
 *   - line ~1082: `<EqRef slug="wiens-law" client:load>Wien's law</EqRef>`
 *     (children → renders "Wien's law" with curly apostrophe via
 *     remark smart-quote pass)
 *
 * Each trigger:
 *   - is an `<a>` whose href is `/chapters/spoiler-alerts#<slug>`
 *     (the source `<KeyEquation>`'s anchor; invariant: `anchor === slug`);
 *   - on hover, opens a Radix HoverCard exposing the title + a
 *     KaTeX-rendered display-math preview of `entry.tex`;
 *   - on click, navigates to the source anchor and scrolls to the
 *     `<KeyEquation>` block.
 *
 * Tests **deliberately skipped** in this file (with rationale):
 *
 *   T26: `pnpm dev` HMR — edit `<KeyEquation title>` and verify
 *   index updates within ~1s. HMR e2e requires modifying source
 *   files during the test against a `pnpm dev` server (this suite
 *   runs against `astro preview` per `playwright.config.ts`).
 *   Deferred to manual verification (PR-C2 design doc's
 *   "Verification" section step 1).
 *
 *   T27: bare-prose fallback for a missing slug. Covered by the
 *   unit test in `packages/components/src/components/EqRef/EqRef.test.tsx`
 *   (TDD test list row T18). The miss-case is a pure component
 *   render branch — happy-path integration is the e2e's job.
 */

test.describe("PR-C2: <EqRef> on the smoke chapter", () => {
  test("renders the self-closing cite as 'Eq. 1' linking to the source anchor (T25 setup)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#inverse-square-law"]')
      .first();
    await expect(trigger).toBeAttached();
    await expect(trigger).toContainText("Eq. 1");
  });

  test("renders the children cite as 'Wien's law' linking to the source anchor", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#wiens-law"]')
      .first();
    await expect(trigger).toBeAttached();
    // Source MDX has a straight apostrophe; remark renders it as
    // U+2019 (curly). Regex matcher tolerates both encodings.
    await expect(trigger).toContainText(/Wien.s law/);
  });

  test("trigger carries a presentational Lucide Sigma icon (aria-hidden)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#inverse-square-law"]')
      .first();
    const icon = trigger.locator("svg");
    await expect(icon).toBeAttached();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  test("T24: hovering the trigger opens a HoverCard with KaTeX-rendered tex", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Chapter is a `client:load` React island. Wait for hydration
    // before hovering so HoverCard handlers are attached (matches
    // the glossary-term.spec.ts pattern for the GlossaryTerm trigger).
    await page.waitForLoadState("networkidle");
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#inverse-square-law"]')
      .first();
    // Closed-state precondition: portal isn't mounted yet.
    await expect(
      page.locator("[data-sophie-equation-popover]")
    ).not.toBeAttached();
    await trigger.hover();
    const popover = page.locator("[data-sophie-equation-popover]");
    // HoverCard.openDelay = 150ms (set in EqRef.tsx); default
    // Playwright timeout covers this, but explicit timeout makes
    // the contract clear.
    await expect(popover).toBeAttached({ timeout: 2000 });
    await expect(popover).toContainText("Eq. 1");
    await expect(popover).toContainText("Inverse-Square Law");
    // KaTeX renders display math into elements with the `.katex`
    // class (and `.katex-display` for displayMode: true).
    await expect(popover.locator(".katex").first()).toBeVisible();
  });

  test("T24 dismissal: moving the pointer away closes the popover", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.waitForLoadState("networkidle");
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#wiens-law"]')
      .first();
    await trigger.hover();
    await expect(page.locator("[data-sophie-equation-popover]")).toBeAttached();
    // Neutral position outside the trigger; HoverCard's closeDelay
    // is 120ms (set in EqRef.tsx).
    await page.mouse.move(0, 0);
    await expect(
      page.locator("[data-sophie-equation-popover]")
    ).not.toBeAttached();
  });

  test("T25: clicking the trigger navigates to the canonical anchor", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#inverse-square-law"]')
      .first();
    await trigger.click();
    await expect(page).toHaveURL(
      /\/chapters\/spoiler-alerts#inverse-square-law$/
    );
    // The source `<KeyEquation id="inverse-square-law">` renders a
    // `<section id="inverse-square-law">` (Phase 0 primitive).
    // Verify the anchor element exists so the hash navigation
    // actually scrolls somewhere.
    await expect(page.locator("section#inverse-square-law")).toBeAttached();
  });

  test.skip("T26: pnpm dev HMR updates the index when a KeyEquation title is edited", () => {
    // HMR e2e requires running against `astro dev` (not `astro
    // preview`) AND modifying source files mid-test. The shared
    // playwright.config.ts boots `astro preview` against the
    // prebuilt static target. Manual verification per the PR-C2
    // design doc's "Verification" section step 1 covers this.
  });

  test.skip("T27: bare-prose fallback when slug doesn't resolve", () => {
    // Covered by the unit test in
    // `packages/components/src/components/EqRef/EqRef.test.tsx`
    // (TDD test list row T18 — miss-case render branch + dev
    // console.warn). E2e is for happy-path integration; the unit
    // test gives stronger guarantees on the miss path without
    // requiring a fixture page in the smoke target.
  });
});
