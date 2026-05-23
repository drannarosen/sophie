import { expect, test } from "@playwright/test";

const CHAPTER_URL = "/units/spoiler-alerts/reading";

/**
 * 2026-05-19 architecture audit P2 #9 — `<DisclosuresToggle>` binary
 * toggle that forces every `<Callout variant="deep-dive">` (and
 * `the-more-you-know`) to render open via the
 * `data-disclosures="expanded"` CSS rule.
 *
 * The spoiler-alerts smoke chapter has 4 deep-dive callouts (per
 * PR-B's index dump). Toggling expands all 4 at once with no
 * per-element JavaScript.
 */
test.describe("DisclosuresToggle on the smoke chapter", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("toggle renders in the top bar with default 'collapsed' state", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^disclosures:/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("data-disclosures-pref", "collapsed");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "collapsed"
    );
  });

  test("clicking the toggle flips state and updates aria + data-disclosures", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);
    const toggle = page.getByRole("button", { name: /^disclosures:/i });

    // Initial: collapsed.
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "collapsed"
    );

    // Click 1 → expanded.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-disclosures-pref", "expanded");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "expanded"
    );
    await expect(toggle).toHaveAccessibleName(/disclosures: expanded/i);

    // Click 2 → back to collapsed.
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-disclosures-pref", "collapsed");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "collapsed"
    );
    await expect(toggle).toHaveAccessibleName(/disclosures: collapsed/i);
  });

  test("expanding the toggle reveals all deep-dive callout bodies", async ({
    page,
  }) => {
    await page.goto(CHAPTER_URL);

    // The spoiler-alerts chapter has 4 <Callout variant="deep-dive">
    // callouts. Each renders an <aside id="..."> wrapping a
    // <details><summary>...</summary><div class="body">...</div></details>.
    const ddAnchors = [
      "hydrogen-fingerprint",
      "distance-ladder",
      "nucleosynthesis-sites",
      "hydrogen-21cm",
    ];

    // Pre-toggle: each <details> is closed (no `open` attribute).
    for (const anchor of ddAnchors) {
      const detailsHandle = page.locator(`#${anchor} details`).first();
      await expect(detailsHandle).not.toHaveAttribute("open", /.+/);
    }

    // Click the toggle.
    const toggle = page.getByRole("button", { name: /^disclosures:/i });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "expanded"
    );

    // Post-toggle: each <details> has the native `open` attribute.
    // The DisclosuresToggle script sets `details.open = true` on every
    // collapsible callout when the pref flips. This is the SoTA path
    // (vs CSS-only) because Chrome's UA stylesheet uses
    // content-visibility:hidden on closed details, which is awkward
    // to override via cascading. Per 2026-05-19 audit P2 #9.
    for (const anchor of ddAnchors) {
      const detailsHandle = page.locator(`#${anchor} details`).first();
      await expect(detailsHandle).toHaveJSProperty("open", true);
      // And the body content is now visible.
      const bodyHandle = page.locator(`#${anchor} details > div`).first();
      await expect(bodyHandle).toBeVisible();
    }

    // Click again → collapse all.
    await toggle.click();
    for (const anchor of ddAnchors) {
      const detailsHandle = page.locator(`#${anchor} details`).first();
      await expect(detailsHandle).not.toHaveAttribute("open", /.+/);
    }
  });

  test("toggle state survives a reload", async ({ page }) => {
    await page.goto(CHAPTER_URL);

    const toggle = page.getByRole("button", { name: /^disclosures:/i });
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "expanded"
    );

    await page.reload();
    // Pre-paint boot script reads localStorage and sets data-disclosures
    // before first paint. Expanded state should persist.
    await expect(page.locator("html")).toHaveAttribute(
      "data-disclosures",
      "expanded"
    );
    const reloadedToggle = page.getByRole("button", {
      name: /^disclosures:/i,
    });
    await expect(reloadedToggle).toHaveAttribute(
      "data-disclosures-pref",
      "expanded"
    );
  });
});
