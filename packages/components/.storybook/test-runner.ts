import {
  getStoryContext,
  type TestRunnerConfig,
  waitForPageReady,
} from "@storybook/test-runner";
import { checkA11y, injectAxe } from "axe-playwright";
import "./test-runner-setup.ts";

/**
 * Storybook test-runner config.
 *
 * Two responsibilities composed in one `postVisit` hook:
 *
 * 1. **a11y gate** (axe-core via `axe-playwright`) — mandatory per
 *    ADR 0004. `color-contrast` is excluded to match the project-wide
 *    a11y posture (every smoke spec disables it; design-system review
 *    handles contrast separately).
 * 2. **visual-regression gate** (`jest-image-snapshot` via
 *    `test-runner-setup.ts`) — per ADR 0057 (supersedes ADR 0028).
 *    One PNG per story under `__snapshots__/chromium/`. CI's Linux
 *    runner is the canonical baseline platform; local Mac runs will
 *    diff against committed PNGs and fail — regenerate via the
 *    `vr-update` workflow rather than locally.
 *
 * Both run on every story; failures in either block CI. The
 * screenshot is captured AFTER `waitForPageReady` so fonts/images are
 * settled, which also makes axe deterministic.
 */
const customSnapshotsDir = `${process.cwd()}/__snapshots__/chromium`;

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

    // Wait for fonts/images/etc. — makes both the axe check above and
    // the screenshot below deterministic.
    await waitForPageReady(page);

    // Visual-regression snapshot. Naming: `<story-id>.png` where the
    // story id is Storybook's CSF-derived slug (e.g. `aside--note`).
    // First run on a fresh checkout creates the baseline; subsequent
    // runs diff against it and write expected/actual/diff PNGs to
    // `test-results/` on failure.
    if (storyContext.parameters?.vr?.disable !== true) {
      const image = await page.screenshot({ fullPage: true });
      expect(image).toMatchImageSnapshot({
        customSnapshotsDir,
        customSnapshotIdentifier: context.id,
      });
    }
  },
};

export default config;
