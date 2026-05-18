import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";

/**
 * PR-C3 — misconceptions on the smoke chapter, regression check.
 *
 * Originally exercised the legacy `<Callout variant="misconception"
 * title="Misconception Alert">` block. PR-7 (the chapter capstone)
 * converted that callout — plus introduced 7 additional misconceptions —
 * to the canonical `<Aside kind="misconception">` + nested
 * `<Intervention>` pattern declared by ADR 0044. The assertion below
 * verifies the converted Aside renders, and that one of the new PR-7
 * misconception pairs (the Spoiler 9 dark-matter case) is reachable on
 * the chapter route.
 *
 * Sort/render behavior of `<ChapterMisconceptions>` itself is exercised
 * indirectly by `<CourseMisconceptions>` on `/misconceptions` (same
 * data shape; see `course-misconceptions.spec.ts`).
 */

test.describe("PR-7: misconception Asides on the smoke chapter", () => {
  test("the converted astronomy-is-looking-through-telescopes misconception still renders", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // <Aside kind="misconception"> renders as a <details> with
    // data-aside-kind="misconception" and title inside <summary>.
    const aside = page.locator('details[data-aside-kind="misconception"]', {
      hasText: "astronomers spend their time at eyepieces",
    });
    await expect(aside).toBeAttached();
    await expect(aside).toContainText(
      /Many imagine astronomers peering through eyepieces/
    );
  });

  test("a PR-7-introduced misconception (dark-matter-is-just-hidden-normal-matter) renders with its intervention", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const aside = page.locator('details[data-aside-kind="misconception"]', {
      hasText: "dark matter is just hidden normal matter",
    });
    await expect(aside).toBeAttached();
    // The intervention body's worked-example structure should be
    // present inside this misconception Aside.
    await expect(aside).toContainText(/MACHOs/);
    await expect(aside).toContainText(/worked example/i);
  });

  test.skip("T42: <ChapterMisconceptions chapter='spoiler-alerts'> renders with length-discriminator class", () => {
    // The smoke chapter does NOT include
    // `<ChapterMisconceptions chapter="spoiler-alerts" />`.
    // Adding an inline chapter-end misconceptions summary is a
    // content-authoring decision. Sort/render behavior is exercised
    // on /misconceptions via `<CourseMisconceptions />`.
  });
});
