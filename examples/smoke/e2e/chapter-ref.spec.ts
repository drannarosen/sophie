import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

// Scope to the ChapterRef-rendered trigger anchor inside the
// `<astro-island component-export="ChapterRef">` wrapper. The
// sidebar ModuleNav ALSO renders `<a href="/units/measuring-/reading
// the-sky">` for navigation, so a bare `a[href=...]` selector
// would match both; the chapter-body trigger lives inside the
// astro-island, the sidebar link doesn't.
const SELF_CLOSING_TRIGGER =
  'astro-island[component-export="ChapterRef"] a[href="/units/measuring-the-sky/reading"]';

/**
 * PR-C4 — inline `<ChapterRef>` cross-references.
 *
 * Covers TDD test list rows E1–E5 from the PR-C4 design doc
 * (`docs/plans/2026-05-14-pr-c4-design.md`).
 *
 * The smoke chapter (`spoiler-alerts.mdx`) places two cites at the
 * "Where We're Headed" section — one of each rendering mode (mirrors
 * PR-C2's EqRef and PR-C3's FigureRef shape):
 *   - `<ChapterRef client:load slug="measuring-the-sky" />`
 *     (self-closing → renders the chapter title "Lecture 2:
 *     Measuring the Sky" per PR-C4 brainstorm Q6 — diverges from
 *     EqRef/FigureRef ordinal-by-default because chapters are
 *     *concepts* named by title, not *positions* numbered for
 *     lookup)
 *   - `<ChapterRef client:load slug="stellar-evolution">how stars
 *     live and die</ChapterRef>` (children-mode → renders custom
 *     prose linking to the chapter)
 *
 * Each trigger:
 *   - is an `<a>` whose href is `/units/{slug}/reading` (the destination
 *     chapter route — not an in-page anchor; ChapterRef navigates
 *     across pages, unlike EqRef/FigureRef which anchor within the
 *     same chapter);
 *   - carries a presentational Lucide `BookMarked` icon
 *     (aria-hidden) per ADR 0039;
 *   - on hover, opens a Radix HoverCard exposing the module
 *     breadcrumb (muted) + chapter title (prominent) + description
 *     (when present) per PR-C4 brainstorm Q2;
 *   - on click, navigates to `/units/{slug}/reading`.
 *
 * Tests **deliberately skipped** in this file (with rationale):
 *
 *   Children-mode hover/click — same `astro-island await-children`
 *   quirk that PR-C3's figure-ref.spec.ts skips for its children
 *   variant. The self-closing path exercises the full happy-path
 *   interaction; the children-mode render branch has unit coverage
 *   in `ChapterRef.test.tsx`.
 */

test.describe("PR-C4: <ChapterRef> on the smoke chapter", () => {
  test("E1: renders the self-closing cite as a link to /units/measuring-the-sky/reading with chapter title", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page.locator(SELF_CLOSING_TRIGGER).first();
    await expect(trigger).toBeAttached();
    // Self-closing ChapterRef renders the chapter title (frontmatter
    // `title`). Per smoke content, that's "Lecture 2: Measuring the Sky".
    await expect(trigger).toContainText("Measuring the Sky");
  });

  test("trigger carries a presentational Lucide BookMarked icon (aria-hidden)", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page.locator(SELF_CLOSING_TRIGGER).first();
    const icon = trigger.locator("svg");
    await expect(icon).toBeAttached();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
    // Lucide-React emits `lucide lucide-<kebab-name>` on every icon.
    // Asserting `lucide-book-marked` prevents a silent swap to a
    // different Lucide glyph (e.g. BookOpen — used by GlossaryTerm —
    // or Book) from passing this test.
    await expect(icon).toHaveClass(/lucide-book-marked/);
  });

  test("E2 + E3: hovering the trigger opens a HoverCard with module breadcrumb + title + description", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Chapter is a `client:load` React island. Wait for the
    // SPECIFIC `<ChapterRef>` trigger we'll hover to flip
    // `data-react-hydrated="true"` (via `useHydrated`) before
    // hovering — `networkidle` fires before React hydration
    // completes in full-suite runs (followup #10). Mirrors PR-C3
    // figure-ref.spec.ts pattern, but scoped to our trigger because
    // ChapterRef triggers live deep in the chapter prose and may
    // hydrate after other PR-C2/C3 islands.
    const trigger = page.locator(SELF_CLOSING_TRIGGER).first();
    await trigger.waitFor({ state: "attached" });
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute("data-react-hydrated", "true", {
      timeout: 5000,
    });
    // Closed-state precondition: portal isn't mounted yet.
    await expect(
      page.locator("[data-sophie-chapter-popover]")
    ).not.toBeAttached();
    await trigger.hover();
    const popover = page.locator("[data-sophie-chapter-popover]");
    // HoverCard.openDelay = 150ms (set in ChapterRef.tsx); explicit
    // 2000ms timeout makes the contract clear.
    await expect(popover).toBeAttached({ timeout: 2000 });
    // Module breadcrumb (muted) — measuring-the-sky belongs to the
    // `foundations` module, title "Foundations" per
    // examples/smoke/src/content/modules/01-foundations.json.
    await expect(popover).toContainText("Foundations");
    // Chapter title (prominent).
    await expect(popover).toContainText("Measuring the Sky");
    // Description (frontmatter `description`) — present for both
    // smoke chapters per Q2 fallback contract (popover skips the
    // description line only when absent).
    await expect(popover).toContainText(/Coordinates, magnitudes/);
  });

  test("E4: clicking the trigger navigates to /units/{slug}/reading", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const trigger = page.locator(SELF_CLOSING_TRIGGER).first();
    await trigger.click();
    await expect(page).toHaveURL(/\/units\/measuring-the-sky\/reading$/);
    // The destination chapter should actually have loaded — confirm
    // a marker from measuring-the-sky.mdx is visible. The chapter
    // body mentions the "astronomical sky is a sphere".
    await expect(page.getByText(/astronomical sky is a sphere/i)).toBeVisible();
  });

  test("E5: axe-clean closed-state ChapterRef trigger", async ({ page }) => {
    await page.goto(CHAPTER_URL);
    // Wait for hydration before scanning so the trigger is in its
    // final shape.
    await page.locator('[data-react-hydrated="true"]').first().waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      // Scope to the ChapterRef trigger; exclude the rest of the
      // chapter (covered by proving-chapter.spec.ts axe scan).
      .include(SELF_CLOSING_TRIGGER)
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test.skip("children-mode ChapterRef cite — anchor + slotted text", () => {
    // The children-mode ChapterRef cite (`<ChapterRef
    // slug="stellar-evolution">how stars live and die</ChapterRef>`)
    // ships its anchor inside `<astro-island await-children>`. The
    // anchor + slotted text DO ship in built HTML, but Playwright's
    // selector engine fails to traverse through the `await-children`
    // boundary at the load-state checkpoints we have today — same
    // skip rationale as PR-C3's figure-ref.spec.ts T43 dual-mode
    // skip. Unit-level coverage in `ChapterRef.test.tsx` U2
    // exercises the children-rendering branch directly. Skipping
    // pending the shared astro-island workaround.
  });
});
