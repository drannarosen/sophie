import { expect, test } from "@playwright/test";
import { expectChapterA11y } from "./_helpers/axe";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * PR-C3 — inline `<FigureRef>` cross-references.
 *
 * Covers TDD test list rows T43 + T44 + T45 from the PR-C3 design
 * doc (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) places two cites — one
 * of each rendering mode (mirrors the PR-C2 EqRef spec shape):
 *   - line 876: `<FigureRef client:load name="decoder-ring" />`
 *     (self-closing → renders "Fig. 1.16" via Sprint F's
 *     "Fig. C.N" label form — the chapter declares
 *     `chapterNumber: 1` and decoder-ring is the 16th `<Figure
 *     name>` in the source MDX, so the extractor assigns it
 *     per-chapter `number: 16` and anchor `fig-decoder-ring-16`.
 *     See FigureRef.tsx around line 62 for the "C.N when
 *     chapterNumber is defined, else N" fallback.)
 *   - line 491:
 *     `<FigureRef client:load name="cosmic-distance-ladder">This distance ladder</FigureRef>`
 *     (children → renders "This distance ladder" — cosmic-
 *     distance-ladder is the 4th `<Figure name>` in the source,
 *     so the chapter anchor is `fig-cosmic-distance-ladder-4`)
 *
 * Each trigger:
 *   - is an `<a>` whose href is
 *     `/units/spoiler-alerts/reading#fig-{slugify(name)}-{number}`
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
  test("T43: renders the self-closing cite as 'Fig. 1.16' linking to the source anchor (decoder-ring)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#fig-decoder-ring-16"]')
      .first();
    await expect(trigger).toBeAttached();
    // Sprint F label form ("Fig. C.N") fires when the chapter declares
    // `chapterNumber`. spoiler-alerts.mdx declares chapter 1, so the
    // label is "Fig. 1.16" (chapterNumber.number), not "Fig. 16".
    await expect(trigger).toContainText("Fig. 1.16");
    await expectChapterA11y(page);
  });

  test("T43 dual-mode: renders the children cite as 'This distance ladder' (cosmic-distance-ladder)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Children-mode FigureRef lives inside the chapter's single
    // `<astro-island await-children>` (SophieChapter). Wait for THIS
    // trigger to flip `data-react-hydrated="true"` before asserting —
    // the scoped per-element hydration wait (same pattern as the T44
    // open test below + chapter-ref E2/E3) bridges the pre-commit
    // window. The original skip blamed an "await-children traversal"
    // limit, but in-browser inspection (2026-05-29) showed both the
    // attribute selector AND `getByRole` resolve the hydrated anchor —
    // the failure was timing at the unscoped load checkpoints, not the
    // slot boundary. Bare href is unique (in-page figure anchor), as
    // for the decoder-ring trigger.
    const trigger = page
      .locator(
        'a[href="/units/spoiler-alerts/reading#fig-cosmic-distance-ladder-4"]'
      )
      .first();
    await trigger.waitFor({ state: "attached" });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("data-react-hydrated", "true");
    // Children-mode renders the slotted prose, not the "Fig. C.N" label.
    await expect(trigger).toContainText("This distance ladder");
    await expect(trigger).toHaveAttribute(
      "href",
      "/units/spoiler-alerts/reading#fig-cosmic-distance-ladder-4"
    );
  });

  test("trigger carries a presentational Lucide ImageIcon (aria-hidden)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#fig-decoder-ring-16"]')
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
    // Chapter is a `client:load` React island. Wait for the
    // SPECIFIC `<FigureRef>` trigger we'll hover to flip
    // `data-react-hydrated="true"` (via `useHydrated`) before
    // hovering — a global first-match `[data-react-hydrated="true"]`
    // wait can resolve on a different island (e.g. an earlier
    // ChapterRef/EqRef/GlossaryTerm hydration on the same page)
    // while this specific FigureRef trigger is still pre-hydration
    // in full-suite runs (followup #10). Mirrors chapter-ref.spec.ts
    // (PR-C4 Task 11) scoped pattern.
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#fig-decoder-ring-16"]')
      .first();
    await trigger.waitFor({ state: "attached" });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("data-react-hydrated", "true");
    // Closed-state precondition: portal isn't mounted yet.
    await expect(
      page.locator("[data-sophie-figure-popover]")
    ).not.toBeAttached();
    await trigger.hover();
    const popover = page.locator("[data-sophie-figure-popover]");
    // Wait on Radix's deterministic `data-state` flip — the same
    // DOM commit that attaches the Content via `<Presence>` also
    // stamps `data-state="open"`. SoTA condition-based wait (no
    // clock-time dependency); the assertion resolves the instant
    // Radix's state machine commits the open transition. Supersedes
    // the prior `toBeAttached({ timeout: 2000 })` knob. See
    // `node_modules/@radix-ui/react-hover-card/dist/index.mjs`
    // ("data-state": context.open ? "open" : "closed").
    await expect(popover).toHaveAttribute("data-state", "open");
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
    // Dismiss-path coverage (hover-open → pointer-away → close), tested
    // on the decoder-ring self-closing trigger — the same one the open
    // test above hovers. Decoder-ring sits in open prose and is reliably
    // hoverable. The children-mode cosmic-distance-ladder cite (T43)
    // lives inside a collapsible `<Aside>` `<details>` disclosure
    // (verified 2026-05-29: closed details → zero box → not a stable
    // hover target); its render branch is covered by T43, and Radix's
    // close behavior is identical across trigger modes (same FigureRef
    // HoverCard). Condition-based assertions on Radix's deterministic
    // `data-state` (no clock guesses).
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#fig-decoder-ring-16"]')
      .first();
    await trigger.waitFor({ state: "attached" });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("data-react-hydrated", "true");
    await trigger.hover();
    const popover = page.locator("[data-sophie-figure-popover]");
    await expect(popover).toHaveAttribute("data-state", "open");
    // Move the pointer off both trigger and content; the HoverCard
    // closes after its closeDelay and Radix unmounts the Content via
    // <Presence>. `toBeHidden()` resolves whether it unmounts or stays
    // mounted-but-hidden during the exit transition.
    await page.mouse.move(0, 0);
    await expect(popover).toBeHidden();
  });

  test("T45: clicking the trigger navigates to the canonical anchor", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page
      .locator('a[href="/units/spoiler-alerts/reading#fig-decoder-ring-16"]')
      .first();
    await trigger.click();
    await expect(page).toHaveURL(
      /\/units\/spoiler-alerts\/reading#fig-decoder-ring-16$/
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
