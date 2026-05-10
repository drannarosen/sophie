import path from "node:path";
import {
  getStoryContext,
  type TestRunnerConfig,
  waitForPageReady,
} from "@storybook/test-runner";
import { checkA11y, injectAxe } from "axe-playwright";
import { toMatchImageSnapshot } from "jest-image-snapshot";

const customSnapshotsDir = path.join(process.cwd(), "__snapshots__");

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);

    if (storyContext.parameters?.a11y?.disable !== true) {
      // axe-playwright's checkA11y fails on violations (not inconclusive).
      //
      // `color-contrast` is excluded to match the project-wide a11y posture
      // established in `examples/smoke/e2e/*.spec.ts` (every spec disables
      // it). Color contrast is treated as a design-system review concern,
      // not a per-feature gate. The structural axe rules (labels, landmarks,
      // focus, ARIA usage, etc.) ARE enforced and catch the failures that
      // matter for component correctness. See ADR 0028 § Consequences.
      await checkA11y(page, "#storybook-root", {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: {
          rules: { "color-contrast": { enabled: false } },
        },
      });
    }

    await waitForPageReady(page);

    // Visual snapshot diff via SSIM (structural similarity), not raw
    // pixel diff. SSIM is the right tool for cross-platform baselines:
    // macOS-generated baselines vs Ubuntu CI rendering produce 1–2.4%
    // raw-pixel diffs purely from anti-aliasing / font hinting, even
    // though the structure (layout, colors, shapes) is identical.
    // SSIM ignores sub-pixel rendering and measures perceptual
    // similarity — small enough that the baseline files stay
    // platform-agnostic, large enough to catch real UI regressions
    // (layout shifts, missing elements, color drift).
    //
    // Threshold 0.05 (5% SSIM dissimilarity) is generous for first land;
    // tighten once we have empirical cross-platform diff data.
    const image = await page.screenshot();
    expect(image).toMatchImageSnapshot({
      customSnapshotsDir,
      customSnapshotIdentifier: context.id,
      comparisonMethod: "ssim",
      failureThreshold: 0.05,
      failureThresholdType: "percent",
    });
  },
};

export default config;
