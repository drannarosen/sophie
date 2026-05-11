import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/chapters/spoiler-alerts";
const GLOSSARY_TITLE = "Mini-Glossary (Orientation Only)";
const GLOSSARY_ID = "mini-glossary";
const SAMPLE_TERMS = [
  { term: "Photon", slug: "photon" },
  { term: "Wavelength (λ)", slug: "wavelength" },
  { term: "Dark matter", slug: "dark-matter" },
  { term: "Redshift", slug: "redshift" },
];

test.describe("<MiniGlossary> block in spoiler-alerts chapter", () => {
  test("renders MiniGlossary with title, lede, and 14 term/definition pairs", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    const region = page.getByRole("region", { name: GLOSSARY_TITLE });
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute("id", GLOSSARY_ID);
    await expect(
      region.getByRole("heading", { level: 3, name: GLOSSARY_TITLE })
    ).toBeVisible();
    await expect(
      region.getByText(/This glossary is here to help you recognize terms/)
    ).toBeVisible();

    // Definition lists don't have an implicit ARIA role, so locate by element.
    const dts = region.locator("dt");
    const dds = region.locator("dd");
    await expect(dts).toHaveCount(14);
    await expect(dds).toHaveCount(14);
  });

  test("each <dt> has a namespaced id of form mini-glossary-term-<slug>", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const region = page.getByRole("region", { name: GLOSSARY_TITLE });
    for (const { term, slug } of SAMPLE_TERMS) {
      const dt = region.locator(`dt#${GLOSSARY_ID}-term-${slug}`);
      await expect(dt).toBeVisible();
      await expect(dt).toHaveText(term);
    }
  });

  test("hash navigation: #mini-glossary scrolls the section into view", async ({
    page,
  }) => {
    await page.goto(`${CHAPTER_URL}#${GLOSSARY_ID}`);
    const region = page.getByRole("region", { name: GLOSSARY_TITLE });
    await expect(region).toBeVisible();
    await expect(region).toBeInViewport();
  });

  test("per-term hash: #mini-glossary-term-photon scrolls Photon <dt> into view", async ({
    page,
  }) => {
    await page.goto(`${CHAPTER_URL}#${GLOSSARY_ID}-term-photon`);
    const dt = page.locator(`dt#${GLOSSARY_ID}-term-photon`);
    await expect(dt).toBeVisible();
    await expect(dt).toBeInViewport();
  });

  test("axe-core: zero accessibility violations on the chapter", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    await page
      .getByRole("region", { name: GLOSSARY_TITLE })
      .waitFor({ timeout: 5000 });

    const results = await new AxeBuilder({ page })
      .exclude(".margin-note")
      .exclude(".task-list-item input[type='checkbox']")
      .exclude("li > input[type='checkbox'][disabled]")
      .disableRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
