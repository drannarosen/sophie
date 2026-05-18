import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const MISCONCEPTIONS_URL = "/misconceptions";

/**
 * PR-C3 — `<CourseMisconceptions />` on `/misconceptions`.
 *
 * Covers TDD test list row T39 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke target ships nine misconceptions post-PR-7 chapter
 * capstone:
 *
 *  - `spoiler-alerts.mdx`: eight `<Aside kind="misconception">` entries
 *    authored by PR-7's chapter rebuild (rainbows-are-decorative,
 *    one-image-tells-the-whole-story, dust-means-empty,
 *    dark-matter-is-just-hidden-normal-matter,
 *    big-bang-was-an-explosion-in-space,
 *    brighter-equals-intrinsically-brighter,
 *    wiens-law-absorption-spectra,
 *    astronomy-is-looking-through-telescopes — the last one converted
 *    from the legacy `<Callout variant="misconception">`).
 *  - `misconception-fixture.mdx`: one `<Aside kind="misconception"
 *    name="universe-with-a-center">` (Intervention PR-γ).
 *
 * All nine are Aside-sourced post-PR-7. The Callout-sourced
 * (`length: 'long'`) code path has no representative in the smoke
 * target anymore — the `--long` modifier behavior is unit-tested at
 * the component level. The architectural test would be re-enabled
 * if a future chapter introduces a `<Callout variant="misconception">`.
 *
 * Per decision #12 (length-based visual distinction), the
 * `<CourseMisconceptions />` template emits `--short` for Aside-
 * sourced (brief) entries.
 */

test.describe("PR-C3: <CourseMisconceptions /> on /misconceptions", () => {
  test("T39: renders the page with all course misconceptions", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const block = page.locator("[data-sophie-course-misconceptions]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-misconceptions__term");
    // Nine misconceptions post-PR-7 (8 in spoiler-alerts + 1 in
    // misconception-fixture). Pin by anchor id selector rather than
    // text — robust to label-text changes.
    await expect(terms).toHaveCount(9);
    // Pin two specific PR-7 anchors + the legacy fixture anchor.
    await expect(
      page.locator("dt#dark-matter-is-just-hidden-normal-matter")
    ).toHaveCount(1);
    await expect(
      page.locator("dt#astronomy-is-looking-through-telescopes")
    ).toHaveCount(1);
    await expect(page.locator("dt#universe-with-a-center")).toHaveCount(1);
  });

  test.skip("Callout-sourced entry carries the `length: 'long'` modifier class on both <dt> and <dd>", () => {
    // Architectural test for the `--long` modifier behavior. After
    // PR-7's chapter capstone, the smoke target's only Callout-
    // sourced misconception was converted to an Aside, so no
    // representative is on the page. The `--long` rendering is
    // unit-tested at the component level. Re-enable when any chapter
    // introduces a `<Callout variant="misconception">` block again.
  });

  test("all Aside-sourced entries carry the `length: 'short'` modifier class on both <dt> and <dd>", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    // All nine misconceptions post-PR-7 are Aside-sourced.
    const asideTerms = page.locator(
      ".sophie-course-misconceptions__term.sophie-course-misconceptions__term--short"
    );
    await expect(asideTerms).toHaveCount(9);
    // Spot-check one: matching <dd> sibling carries the body modifier.
    const asideBody = asideTerms
      .first()
      .locator("xpath=following-sibling::dd[1]");
    await expect(asideBody).toHaveClass(
      /sophie-course-misconceptions__body--short/
    );
  });

  test("an Aside-sourced entry has a back-link to the chapter anchor", async ({
    page,
  }) => {
    // Anchor derivation for Aside-sourced misconceptions: the
    // `name="..."` attr is the anchor source (per Intervention PR-δ's
    // anchor-precedence fix). Pin to the PR-7
    // `dark-matter-is-just-hidden-normal-matter` entry.
    await page.goto(MISCONCEPTIONS_URL);
    const backlink = page.locator(
      "#dark-matter-is-just-hidden-normal-matter + dd .sophie-course-misconceptions__backlink a"
    );
    await expect(backlink).toBeAttached();
    await expect(backlink).toHaveAttribute(
      "href",
      "/chapters/spoiler-alerts#dark-matter-is-just-hidden-normal-matter"
    );
    await expect(
      page.locator("#dark-matter-is-just-hidden-normal-matter")
    ).toBeAttached();
  });

  test("/misconceptions is axe-clean", async ({ page }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const results = await new AxeBuilder({ page })
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
