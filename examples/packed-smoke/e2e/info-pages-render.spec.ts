import { expect, test } from "@playwright/test";

/**
 * Regression guard for the course-info / landing projection in the
 * PACKED (tarball/dist) consumer — the path that surfaced the 5
 * packaging/render bugs fixed in PR #212. examples/smoke's workspace
 * path masks the dist-resolution bugs (fixes 1-3); only this packed
 * consumer exercises `dist/components.js` + `dist/lib/compose-evaluator.js`
 * resolution from the copied-verbatim .astro layouts/routes.
 *
 * The build itself guards fixes 1-3 (a dist-resolution regression fails
 * `astro build`). This spec guards fixes 4 + 5 (render-correctness a bare
 * build won't flag):
 *   - #4 course-landing renders (was Astro `NoMatchingImport` on the
 *     dynamic `<Layout client:load/>`) inside a real document shell.
 *   - #5 a fingerprinted theme stylesheet is injected (was a hard-coded
 *     `/_astro/sophie-styles.css` link Astro never emits → unstyled),
 *     plus a `<meta charset>` (was a bare `<main>` with no `<head>`).
 */

async function stylesheetHrefs(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) =>
      l.getAttribute("href")
    )
  );
}

function assertThemedDocument(hrefs: (string | null)[]) {
  // A fingerprinted theme stylesheet is present...
  expect(hrefs.some((h) => /^\/_astro\/.+\.css$/.test(h ?? ""))).toBe(true);
  // ...and the broken hard-coded path is gone (fix #5).
  expect(hrefs.every((h) => !(h ?? "").includes("sophie-styles.css"))).toBe(
    true
  );
}

test.describe("course-info projection renders in the packed consumer", () => {
  test("landing ( / ) renders inside a themed document shell", async ({
    page,
  }) => {
    await page.goto("/");
    // Real <head> with charset (fix #4: was a bare <main>, no <head>).
    expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
    assertThemedDocument(await stylesheetHrefs(page));
    // The landing actually rendered its content (fix #4: the dynamic
    // `<Layout client:load/>` NoMatchingImport would have failed the
    // build / produced no landing body). The H1 is `identity.title`.
    await expect(
      page.getByRole("heading", { level: 1, name: "Packed Smoke Course" })
    ).toBeVisible();
  });

  test("syllabus ( /syllabus/ ) renders the composed sections + prose", async ({
    page,
  }) => {
    await page.goto("/syllabus/");
    expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
    assertThemedDocument(await stylesheetHrefs(page));
    // The `compose:` list resolved: the `prose/policies` fragment body
    // rendered (proves dist resolution of the layout + compose-evaluator).
    await expect(page.getByText("Late work")).toBeVisible();
    // A composed data section rendered (grading category name).
    await expect(page.getByText("Homework").first()).toBeVisible();
  });
});
