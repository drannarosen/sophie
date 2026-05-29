import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * LaTeX→speech accessibility e2e (ADR 0089) — asserts the build-time SRE
 * speech layer reaches the rendered DOM on real built pages:
 *
 *  - **Display + inline math** carry a non-empty `aria-label` (SRE
 *    ClearSpeak) + `role="math"` on the inner `.katex` container
 *    (`rehypeKatexSpeech`).
 *  - **Math-only formative choice radios** carry a non-empty explicit
 *    `aria-label` (`rehypeChoiceSpeech`), so axe's `label` rule passes
 *    without reading MathML.
 *  - **No double-speak** on display math: the outer `.katex-display`
 *    scroll region keeps its generic `role="group"` + "Equation,
 *    scrollable" label (`rehypeKatexDisplayA11y`) while the inner
 *    `.katex` carries the content speech — distinct roles, distinct
 *    nodes (plan resolved-decision #2).
 *  - **axe is clean WITHOUT disabling `label`** on a math-choice page.
 *
 * Targets:
 *   - `mobile-a11y-fixture/reading` — display math (`$$…$$`) + inline
 *     math (`$E = mc^2$`).
 *   - `chrome-primitives-demo/practice` — MCQ/MultiSelect with math-only
 *     and math-mixed choices.
 */

const MATH_READING = "/units/mobile-a11y-fixture/reading";
const PRACTICE = "/units/chrome-primitives-demo/practice";
const A11Y_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("LaTeX→speech accessibility (ADR 0089)", { tag: "@axe" }, () => {
  test("display math carries SRE aria-label + role=math (no double-speak with scroll region)", async ({
    page,
  }) => {
    await page.goto(MATH_READING);
    // The display equation's outer scroll region.
    const displayRegion = page.locator(".katex-display").first();
    await expect(displayRegion).toBeVisible();
    // Resolved-decision #2: outer region keeps the generic group label.
    await expect(displayRegion).toHaveAttribute("role", "group");
    await expect(displayRegion).toHaveAttribute(
      "aria-label",
      "Equation, scrollable"
    );

    // Inner .katex container carries the content speech + role=math.
    const innerMath = displayRegion.locator(".katex").first();
    await expect(innerMath).toHaveAttribute("role", "math");
    const innerLabel = await innerMath.getAttribute("aria-label");
    expect(innerLabel, "display .katex aria-label").toBeTruthy();
    expect((innerLabel ?? "").length).toBeGreaterThan(0);
    // The two labels differ — the region's is generic, the math's is
    // content (so AT reads "Equation, scrollable" then the expression,
    // not the expression twice).
    expect(innerLabel).not.toBe("Equation, scrollable");
  });

  test("inline math carries a non-empty SRE aria-label", async ({ page }) => {
    await page.goto(MATH_READING);
    // The inline `$E = mc^2$` renders as a `.katex` NOT inside any
    // `.katex-display` wrapper.
    const inline = page
      .locator(".katex")
      .filter({ hasNot: page.locator(".katex-display") });
    // At least one inline math element exists and is labeled.
    const inlineCount = await inline.count();
    expect(inlineCount).toBeGreaterThan(0);
    const first = inline.first();
    await expect(first).toHaveAttribute("role", "math");
    const label = await first.getAttribute("aria-label");
    expect(label, "inline .katex aria-label").toBeTruthy();
  });

  test("math-only choice radios carry a non-empty explicit aria-label", async ({
    page,
  }) => {
    await page.goto(PRACTICE);
    const mcq = page.locator('[data-pedagogy-role="mcq"]');
    // Wait for the formative controller to hydrate (condition-based).
    await expect(
      mcq.locator('[data-react-hydrated="true"]').first()
    ).toBeVisible();

    // The two math-only choices (`$n=2 \to n=1$`, `$n=3 \to n=2$`) must
    // carry an explicit aria-label attribute (not just a computed name).
    const mathRadios = mcq.locator("input[data-choice-input][aria-label]");
    const count = await mathRadios.count();
    expect(count, "math choice inputs with aria-label").toBeGreaterThanOrEqual(
      2
    );
    const labels = await mathRadios.evaluateAll((els) =>
      els.map((e) => e.getAttribute("aria-label") ?? "")
    );
    for (const label of labels) {
      expect(label.length, "choice aria-label non-empty").toBeGreaterThan(0);
    }

    // Every radio still resolves to a non-empty accessible name.
    const radios = mcq.getByRole("radio");
    const radioCount = await radios.count();
    for (let i = 0; i < radioCount; i++) {
      const name = await radios.nth(i).evaluate((el) => {
        // Prefer the explicit aria-label; fall back to the browser's
        // computed name from the wrapping label (pure-text choices).
        const explicit = el.getAttribute("aria-label");
        if (explicit && explicit.length > 0) return explicit;
        const labelledBy = (el as HTMLInputElement).labels;
        return labelledBy && labelledBy.length > 0
          ? (labelledBy[0]?.textContent ?? "").trim()
          : "";
      });
      expect(name.length, `radio ${i} accessible name`).toBeGreaterThan(0);
    }
  });

  test("practice page is axe-clean WITHOUT disabling label", async ({
    page,
  }) => {
    await page.goto(PRACTICE);
    await expect(
      page
        .locator('[data-pedagogy-role="mcq"] [data-react-hydrated="true"]')
        .first()
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(A11Y_TAGS)
      .analyze();
    expect(results.violations, "axe violations (label strict)").toEqual([]);
  });
});
