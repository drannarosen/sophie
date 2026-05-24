import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const MISCONCEPTIONS_URL = "/library/misconceptions";

/**
 * PR-C3 — `<CourseMisconceptions />` on `/library/misconceptions`.
 *
 * Covers TDD test list row T39 from the PR-C3 design doc
 * (`docs/plans/2026-05-14-pr-c3-design.md`).
 *
 * The smoke target ships twelve misconceptions post-ASTR 201 M2-L3
 * pilot + the `brighter-equals-closer` follow-up:
 *
 *  - `spoiler-alerts.mdx`: nine `<Aside kind="misconception">` entries
 *    (rainbows-are-decorative, one-image-tells-the-whole-story,
 *    dust-means-empty, dark-matter-is-just-hidden-normal-matter,
 *    big-bang-was-an-explosion-in-space,
 *    brighter-equals-intrinsically-brighter,
 *    brighter-equals-closer — the sibling confusion added in the
 *    Sprint-K-adjacent content pass — wiens-law-absorption-spectra,
 *    astronomy-is-looking-through-telescopes).
 *  - `misconception-fixture.mdx`: one `<Aside kind="misconception"
 *    name="universe-with-a-center">` (Intervention PR-γ).
 *  - `spectra-and-composition.mdx` (M2-L3 pilot): two
 *    `<Callout variant="misconception">` long-form entries
 *    (`two-myths-to-kill-now`, `common-student-confusions`).
 *
 * Ten are Aside-sourced (`--short` modifier); two are Callout-sourced
 * (`--long` modifier) per decision #12 (length-based visual
 * distinction).
 */

test.describe("PR-C3: <CourseMisconceptions /> on /library/misconceptions", () => {
  test("T39: renders the page with all course misconceptions", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const block = page.locator("[data-sophie-course-misconceptions]");
    await expect(block).toBeAttached();
    const terms = block.locator(".sophie-course-misconceptions__term");
    // Twelve misconceptions post-M2-L3 pilot + `brighter-equals-closer`
    // follow-up (9 Aside in spoiler-alerts + 1 Aside in
    // misconception-fixture + 2 Callout in the pilot chapter). Pin by
    // anchor id selector rather than text — robust to label changes.
    await expect(terms).toHaveCount(12);
    // Pin two PR-7 anchors, the legacy fixture anchor, and one of the
    // M2-L3 pilot's Callout-sourced entries.
    await expect(
      page.locator("dt#dark-matter-is-just-hidden-normal-matter")
    ).toHaveCount(1);
    await expect(
      page.locator("dt#astronomy-is-looking-through-telescopes")
    ).toHaveCount(1);
    await expect(page.locator("dt#universe-with-a-center")).toHaveCount(1);
    await expect(page.locator("dt#two-myths-to-kill-now")).toHaveCount(1);
  });

  test("Callout-sourced entries carry the `length: 'long'` modifier class on both <dt> and <dd>", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    // M2-L3 pilot reintroduced Callout-sourced misconceptions. Two
    // long-form entries are sourced from `<Callout
    // variant="misconception">` blocks in spectra-and-composition.mdx.
    const calloutTerms = page.locator(
      ".sophie-course-misconceptions__term.sophie-course-misconceptions__term--long"
    );
    await expect(calloutTerms).toHaveCount(2);
    const calloutBody = calloutTerms
      .first()
      .locator("xpath=following-sibling::dd[1]");
    await expect(calloutBody).toHaveClass(
      /sophie-course-misconceptions__body--long/
    );
  });

  test("all Aside-sourced entries carry the `length: 'short'` modifier class on both <dt> and <dd>", async ({
    page,
  }) => {
    await page.goto(MISCONCEPTIONS_URL);
    // Ten of twelve misconceptions are Aside-sourced (`--short`); the
    // other two are Callout-sourced from the M2-L3 pilot.
    const asideTerms = page.locator(
      ".sophie-course-misconceptions__term.sophie-course-misconceptions__term--short"
    );
    await expect(asideTerms).toHaveCount(10);
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
      "/units/spoiler-alerts/reading#dark-matter-is-just-hidden-normal-matter"
    );
    await expect(
      page.locator("#dark-matter-is-just-hidden-normal-matter")
    ).toBeAttached();
  });

  test("/library/misconceptions is axe-clean", async ({ page }) => {
    await page.goto(MISCONCEPTIONS_URL);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .exclude("astro-island")
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
