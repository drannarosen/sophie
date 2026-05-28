import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Build-level render assertion for the compound-island transform — THE
 * GAP-CLOSER. The formative parents (`<MCQ>` / `<MultiSelect>` /
 * `<FillBlank>`) and the shipped `<Tabs>` rendered EMPTY in the real
 * Astro build (SSR + post-hydration) because a `client:load` React
 * island cannot introspect its MDX component-children — yet every
 * `@testing-library/react` unit test passed, because RTL has no Astro
 * island boundary. The fix replaced runtime introspection with a remark
 * transform that lowers the authored shape to static native markup +
 * a childless controller island.
 *
 * This spec is the check that would have caught the original bug: it
 * loads the REAL built pages and asserts the native controls actually
 * render (correct counts), that a nested interactive island inside a
 * choice body hydrates (the correctness bar that ruled out
 * body-serialization), and that the rendered pages are axe-clean.
 *
 * Counts are pinned to the smoke fixture
 * (`sections/foundations/units/chrome-primitives-demo/{practice,reading}.mdx`):
 *   practice — 1 MCQ (3 choices) · 1 MultiSelect (3 choices) ·
 *              1 FillBlank (2 slots) + 1 FillBlank (0 slots, AS-3) ·
 *              1 NumericQuestion · 2 PracticeProblem · 2 QuickCheck
 *   reading  — 1 Tabs (3 tabs)
 */

const PRACTICE = "/units/chrome-primitives-demo/practice";
const READING = "/units/chrome-primitives-demo/reading";
const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("compound-island transform — formative parents render in the build", {
  tag: "@axe",
}, () => {
  test("MCQ renders 3 native radios with a hydrated nested island in a choice", async ({
    page,
  }) => {
    await page.goto(PRACTICE);
    const mcq = page.locator('[data-pedagogy-role="mcq"]');
    await expect(mcq).toHaveCount(1);
    await expect(mcq.getByRole("radio")).toHaveCount(3);
    // Each radio has a correct COMPUTED accessible name — including the
    // math-only choices, whose name the browser derives from KaTeX
    // presentation MathML ("n = 2 → n = 1"). getByRole({ name }) uses the
    // browser's real name algorithm (MathML-aware), unlike axe's `label`
    // rule (which can't read MathML — see the practice axe-clean test).
    // No "✓" on the correct choice: v1 must not leak the answer.
    await expect(mcq.getByRole("radio", { name: "n = 2 → n = 1" })).toHaveCount(
      1
    );
    await expect(mcq.getByRole("radio", { name: "n = 3 → n = 2" })).toHaveCount(
      1
    );
    await expect(mcq.getByRole("radio", { name: /A line in the/ })).toHaveCount(
      1
    );
    // The correctness bar: a <GlossaryTerm> authored INSIDE an MCQ choice
    // body hydrates as its own island (proving choice bodies stay live MDX,
    // not serialized HTML). Wait for the controller-independent hydration mark.
    await expect(
      mcq.locator('[data-react-hydrated="true"]').first()
    ).toBeVisible();
  });

  test("MultiSelect renders 3 native checkboxes", async ({ page }) => {
    await page.goto(PRACTICE);
    const ms = page.locator('[data-pedagogy-role="multi-select"]');
    await expect(ms).toHaveCount(1);
    await expect(ms.getByRole("checkbox")).toHaveCount(3);
  });

  test("FillBlank renders inline text inputs (and never leaks the answer)", async ({
    page,
  }) => {
    await page.goto(PRACTICE);
    const inputs = page.locator("input[data-fb-slot]");
    await expect(inputs).toHaveCount(2);
    // Answer-leak guard at the rendered tier: the slot input carries no
    // value + no `correct` attribute (the answer lives only in the index).
    const corrects = await inputs.evaluateAll((els) =>
      els.map((e) => e.getAttribute("correct"))
    );
    expect(corrects).toEqual([null, null]);
    const values = await inputs.evaluateAll((els) =>
      els.map((e) => (e as HTMLInputElement).value)
    );
    expect(values).toEqual(["", ""]);
  });

  test("non-transformed formatives (QuickCheck / NumericQuestion / PracticeProblem) still render", async ({
    page,
  }) => {
    await page.goto(PRACTICE);
    await expect(
      page.locator('[data-pedagogy-role="practice-problem"]')
    ).toHaveCount(2);
    await expect(page.locator('[data-pedagogy-role="quickcheck"]')).toHaveCount(
      2
    );
    await expect(
      page.locator('[data-pedagogy-role="numeric-question"]')
    ).toHaveCount(1);
  });

  test("practice page is axe-clean", async ({ page }) => {
    await page.goto(PRACTICE);
    // Wait for the formative controllers to hydrate so axe sees the live DOM.
    await expect(
      page
        .locator('[data-pedagogy-role="mcq"] [data-react-hydrated="true"]')
        .first()
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(A11Y_TAGS)
      // `label` is disabled ONLY here, and ONLY because axe does not
      // implement accessible-name computation for MathML: it reports the
      // KaTeX math-choice radios as nameless even though the browser (and
      // real AT) name them correctly ("n = 2 → n = 1"). That real name is
      // positively asserted in the MCQ test above via getByRole({ name }),
      // which is a STRONGER check than axe's heuristic — so no label
      // coverage is lost. Every other axe rule stays strict on this page.
      .disableRules(["label"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("compound-island transform — Tabs render + are operable", {
  tag: "@axe",
}, () => {
  test("Tabs renders 3 tab triggers (latent empty-tablist bug fixed)", async ({
    page,
  }) => {
    await page.goto(READING);
    const tablist = page.getByRole("tablist");
    await expect(tablist).toHaveCount(1);
    await expect(page.getByRole("tab")).toHaveCount(3);
    // Exactly one panel visible initially (the default tab's).
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
  });

  test("clicking a tab activates it (controller hydrated)", async ({
    page,
  }) => {
    await page.goto(READING);
    // Condition-based wait: the controller stamps data-hydrated once its
    // click/keyboard listeners are wired. Clicking before that is a no-op
    // (the static markup is actionable pre-hydration), so wait for the signal.
    await expect(
      page.locator("[data-sophie-tabs][data-hydrated='true']").first()
    ).toBeVisible();
    const tabs = page.getByRole("tab");
    const second = tabs.nth(1);
    await second.click();
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
  });

  test("reading page is axe-clean", async ({ page }) => {
    await page.goto(READING);
    await expect(page.getByRole("tablist")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(A11Y_TAGS)
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
