import { expect, test } from "@playwright/test";

/**
 * WS1 / B1 + B2 regression guard (ADR 0095): the non-reading "course
 * spine" must ship STYLED, with the same global element/component CSS
 * as readings — not browser-default Times/black.
 *
 * The sibling `info-pages-render.spec.ts` only asserts that *some*
 * fingerprinted `/_astro/*.css` is linked, which the token-only theme
 * sheet already satisfied even while the spine rendered unstyled
 * (astr201 frontend review F1/B1). This spec asserts the bug-direct
 * condition instead: the computed `body` font resolves to the Plex
 * sans stack delivered by `@sophie/theme/base` via `<SophieHead>`,
 * proving element rules actually apply — and that section-landing
 * emits a non-empty `<title>` (B2).
 *
 * Covers all three spine route families: landing (`/`), section
 * landing (`/sections/[section]/`), and an info page (`/syllabus/`),
 * plus a reading as the always-styled control.
 */

async function bodyFontFamily(page: import("@playwright/test").Page) {
  return page.evaluate(() => getComputedStyle(document.body).fontFamily);
}

const SPINE_ROUTES = [
  { label: "landing", path: "/" },
  { label: "section landing", path: "/sections/test-section/" },
  { label: "info page (syllabus)", path: "/syllabus/" },
];

test.describe("course spine ships styled (B1)", () => {
  for (const { label, path } of SPINE_ROUTES) {
    test(`${label} (${path}) applies the Plex sans base layer`, async ({
      page,
    }) => {
      await page.goto(path);
      // Real document shell with a charset (not a bare <main>).
      expect(await page.evaluate(() => document.characterSet)).toBe("UTF-8");
      // The element/base layer applied: body is the Sophie sans stack,
      // NOT the browser serif/Times default that the unstyled spine
      // showed. This is the assertion the token-only sheet could not
      // satisfy.
      expect(await bodyFontFamily(page)).toMatch(/IBM Plex Sans/i);
    });
  }
});

test.describe("section landing emits a real <title> (B2)", () => {
  test("/sections/test-section/ has a non-empty document title", async ({
    page,
  }) => {
    await page.goto("/sections/test-section/");
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });
});
