import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * Hardens against silent regressions of :focus-visible styles on Sophie's
 * interactive controls (added in PR for P1-4 of the hardening audit).
 *
 * Two test strategies, complementary:
 *
 * 1. CSS-bundle assertion: parse every loaded stylesheet and confirm the
 *    `:focus-visible` rules are present for each Sophie control class
 *    (radio, checkbox, trigger, textarea). Catches deletion regressions
 *    cheaply and robustly. Independent of focus-visible's user-input-
 *    modality heuristic.
 *
 * 2. Runtime keyboard traversal: actually press Tab and verify that a
 *    Sophie control's outline becomes non-zero. Tests the end-to-end
 *    behavior (CSS bundled → rule applied on keyboard focus).
 */
test.describe("keyboard focus rings on Sophie interactive controls", () => {
  test("every Sophie control class has a :focus-visible rule in the bundled CSS", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    const css = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules ?? []).map((r) => r.cssText);
          } catch {
            return [] as string[];
          }
        })
        .join("\n");
    });

    // Class names are CSS-Modules-hashed in production, but the source
    // identifier (.radio, .checkbox, .trigger, .textarea) is preserved
    // as a prefix or substring under Vite's default classNameStrategy.
    const requiredPatterns: Array<{ name: string; pattern: RegExp }> = [
      {
        name: "radio (CG/CC/EL)",
        pattern: /\.[\w-]*radio[\w-]*:focus-visible/,
      },
      {
        name: "checkbox (IC/LO/Callout-reviewedRow)",
        pattern:
          /\.[\w-]*checkbox[\w-]*:focus-visible|input\[type="checkbox"\]:focus-visible/,
      },
      {
        name: "trigger (Dropdown)",
        pattern: /\.[\w-]*trigger[\w-]*:focus-visible/,
      },
      {
        name: "textarea (Predict/Reflection)",
        pattern: /\.[\w-]*textarea[\w-]*:focus-visible/,
      },
    ];
    for (const { name, pattern } of requiredPatterns) {
      expect(css, `missing :focus-visible rule for ${name}`).toMatch(pattern);
    }
  });

  test("the first interactive control reached by Tab gets a visible focus outline", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    // Wait for hydration to settle so persistence-bearing controls are
    // not still in their disabled-while-loading state (which would
    // cause Tab to skip them).
    await page
      .locator("label", { hasText: /Mark as reviewed/ })
      .first()
      .waitFor({ timeout: 5000 });

    // Walk forward from page start. Stop at the first Sophie interactive
    // control (a button, checkbox, or radio inside the chapter content).
    // Cap iterations to prevent runaway loops if the test environment
    // mis-renders.
    const MAX_TABS = 30;
    let foundControl = false;
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const result = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const tag = el.tagName.toLowerCase();
        const type = (el as HTMLInputElement).type;
        const isSophieControl =
          (tag === "input" && (type === "checkbox" || type === "radio")) ||
          tag === "button" ||
          tag === "textarea";
        if (!isSophieControl) return null;
        const style = window.getComputedStyle(el);
        return {
          tag,
          type,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
        };
      });
      if (result !== null) {
        foundControl = true;
        // The outline must be present and not 'none'. Sophie's focus
        // tokens render `2px solid color-mix(...)` — both browser
        // defaults and Sophie's rules produce non-zero outline width.
        expect(result.outlineStyle).not.toBe("none");
        expect(result.outlineWidth).not.toBe("0px");
        break;
      }
    }
    expect(
      foundControl,
      `no Sophie interactive control reached within ${MAX_TABS} Tabs`
    ).toBe(true);
  });
});
