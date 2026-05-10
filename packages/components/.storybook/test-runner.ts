import {
  getStoryContext,
  type TestRunnerConfig,
  waitForPageReady,
} from "@storybook/test-runner";
import { checkA11y, injectAxe } from "axe-playwright";

/**
 * Storybook test-runner config.
 *
 * Phase-1-first-land scope: per-story axe-core check only.
 *
 * Visual regression (jest-image-snapshot) was scoped in ADR 0028 but
 * deferred during the first CI run because macOS-generated baselines
 * produce 1–5% sub-pixel differences against Ubuntu CI rendering. SSIM
 * comparison closed most of that gap but left UI-element-dense
 * components (LearningObjectives, Reflection) just above threshold.
 * Re-enabling visual regression requires Linux-native baseline
 * generation (Docker-based, matching CI's chromium exactly). See
 * ADR 0028 § Visual regression deferral.
 */
const config: TestRunnerConfig = {
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

    // Wait for fonts/images/etc. — even though we don't snapshot, this
    // makes the axe check more deterministic by ensuring the story has
    // finished rendering before we re-assert.
    await waitForPageReady(page);
  },
};

export default config;
