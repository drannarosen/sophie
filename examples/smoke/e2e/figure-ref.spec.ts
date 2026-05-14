import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C3 — inline `<FigureRef>` cross-references.
 *
 * Covers TDD test list rows T43 + T44 + T45 from the PR-C3 design
 * doc (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) places two cites — one
 * of each rendering mode (mirrors the PR-C2 EqRef spec shape):
 *   - line 876: `<FigureRef client:load name="decoder-ring" />`
 *     (self-closing → renders "Fig. 16" — decoder-ring is the
 *     16th `<Figure name>` in the source MDX, so the extractor
 *     assigns it per-chapter `number: 16` and anchor
 *     `fig-decoder-ring-16`)
 *   - line 491:
 *     `<FigureRef client:load name="cosmic-distance-ladder">This distance ladder</FigureRef>`
 *     (children → renders "This distance ladder" — cosmic-
 *     distance-ladder is the 4th `<Figure name>` in the source,
 *     so the chapter anchor is `fig-cosmic-distance-ladder-4`)
 *
 * Each trigger:
 *   - is an `<a>` whose href is
 *     `/chapters/spoiler-alerts#fig-{slugify(name)}-{number}`
 *     (the canonical usage's anchor; in v1 the smoke chapter is
 *     the only chapter, so the canonical IS the first usage);
 *   - carries a presentational Lucide ImageIcon (`aria-hidden`,
 *     class includes `lucide-image`) per PR-C3 decision #13 +
 *     ADR 0039;
 *   - on hover, opens a Radix HoverCard exposing the registry
 *     thumbnail (`<img>`) + caption text;
 *   - on click, navigates to the source anchor and scrolls to
 *     the `<Figure>` block.
 *
 * Tests **deliberately skipped** in this file (with rationale):
 *
 *   Miss-fallback (T46 in the design list): bare-prose rendering
 *   for a name not in the registry. Covered by the unit test in
 *   `packages/components/src/components/FigureRef/FigureRef.test.tsx`
 *   (TDD test list row T18 — same pattern as PR-C2's EqRef T27
 *   skip). The miss-case is a pure component render branch —
 *   happy-path integration is the e2e's job; adding a fixture
 *   page to the smoke target to exercise the miss path costs more
 *   than the unit test already covers.
 */

test.describe("PR-C3: <FigureRef> on the smoke chapter", () => {
  test("T43: renders the self-closing cite as 'Fig. 16' linking to the source anchor (decoder-ring)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#fig-decoder-ring-16"]')
      .first();
    await expect(trigger).toBeAttached();
    await expect(trigger).toContainText("Fig. 16");
  });

  test("T43 dual-mode: renders the children cite as 'This distance ladder' (cosmic-distance-ladder)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator(
        'a[href="/chapters/spoiler-alerts#fig-cosmic-distance-ladder-4"]'
      )
      .first();
    await expect(trigger).toBeAttached();
    await expect(trigger).toContainText("This distance ladder");
  });

  test("trigger carries a presentational Lucide ImageIcon (aria-hidden)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#fig-decoder-ring-16"]')
      .first();
    const icon = trigger.locator("svg");
    await expect(icon).toBeAttached();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    // Lucide-React emits `lucide lucide-<kebab-name>` on every
    // icon. Asserting `lucide-image` prevents a silent swap to a
    // different Lucide glyph (e.g. ImagePlus, ImageOff) from
    // passing this test. Mirrors the PR-C2 EqRef `lucide-sigma`
    // assertion.
    await expect(icon).toHaveClass(/lucide-image/);
  });

  test("T44: hovering the trigger opens a HoverCard with thumbnail + caption", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Chapter is a `client:load` React island. Wait for
    // hydration before hovering so HoverCard handlers are
    // attached (matches the EqRef + GlossaryTerm patterns).
    await page.waitForLoadState("networkidle");
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#fig-decoder-ring-16"]')
      .first();
    // Closed-state precondition: portal isn't mounted yet.
    await expect(
      page.locator("[data-sophie-figure-popover]")
    ).not.toBeAttached();
    await trigger.hover();
    const popover = page.locator("[data-sophie-figure-popover]");
    // HoverCard.openDelay = 150ms (set in FigureRef.tsx);
    // explicit 2000ms timeout makes the contract clear.
    await expect(popover).toBeAttached({ timeout: 2000 });
    // Thumbnail <img> from the registry (lazy-loaded).
    const thumb = popover.locator("img");
    await expect(thumb).toBeAttached();
    await expect(thumb).toHaveAttribute("src", /\S/);
    await expect(thumb).toHaveAttribute("alt", /\S/);
    // Caption text — figcaption renders the resolved caption
    // (captionOverride → registry.caption → name fallback). For
    // the decoder-ring usage, the registry caption is non-empty.
    const caption = popover.locator("figcaption");
    await expect(caption).toBeAttached();
    const captionText = (await caption.textContent())?.trim() ?? "";
    expect(captionText.length).toBeGreaterThan(0);
  });

  test("T44 dismissal: moving the pointer away closes the popover", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page.waitForLoadState("networkidle");
    const trigger = page
      .locator(
        'a[href="/chapters/spoiler-alerts#fig-cosmic-distance-ladder-4"]'
      )
      .first();
    await trigger.hover();
    await expect(page.locator("[data-sophie-figure-popover]")).toBeAttached();
    // Neutral position outside the trigger; HoverCard.closeDelay
    // = 120ms (set in FigureRef.tsx).
    await page.mouse.move(0, 0);
    await expect(
      page.locator("[data-sophie-figure-popover]")
    ).not.toBeAttached();
  });

  test("T45: clicking the trigger navigates to the canonical anchor", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/chapters/spoiler-alerts#fig-decoder-ring-16"]')
      .first();
    await trigger.click();
    await expect(page).toHaveURL(
      /\/chapters\/spoiler-alerts#fig-decoder-ring-16$/
    );
  });

  test.skip("T46: miss-fallback — bare-prose rendering when name doesn't resolve", () => {
    // Covered by the unit test in
    // `packages/components/src/components/FigureRef/FigureRef.test.tsx`
    // (TDD test list row T18 — miss-case render branch + dev
    // console.warn). E2e is for happy-path integration; the unit
    // test gives stronger guarantees on the miss path without
    // requiring a fixture page in the smoke target. Mirrors the
    // PR-C2 EqRef T27 skip rationale.
  });
});
