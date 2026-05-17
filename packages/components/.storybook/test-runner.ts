import {
  getStoryContext,
  type TestRunnerConfig,
  waitForPageReady,
} from "@storybook/test-runner";
import { checkA11y, injectAxe } from "axe-playwright";
import { toMatchImageSnapshot } from "jest-image-snapshot";

/**
 * Storybook test-runner config.
 *
 * Three responsibilities composed across lifecycle hooks:
 *
 * 1. **matcher registration** (`setup()`) — `expect.extend` for
 *    `toMatchImageSnapshot`. Must happen inside the `setup()` hook
 *    because Storybook's CLI process loads this file at config time
 *    (where `expect` is NOT a global), whereas `setup()` runs inside
 *    the Jest worker (where `expect` IS global). The TypeScript
 *    augmentation lives alongside in `test-runner.d.ts`.
 * 2. **a11y gate** (axe-core via `axe-playwright`) — mandatory per
 *    ADR 0004. `color-contrast` is excluded to match the project-wide
 *    a11y posture (every smoke spec disables it; design-system review
 *    handles contrast separately). Runs once per story against the
 *    default theme; structural axe rules (labels/landmarks/ARIA/focus)
 *    are mode-invariant, so the light-mode pass covers both schemes.
 * 3. **visual-regression gate** (`jest-image-snapshot`) — per ADR 0057
 *    (supersedes ADR 0028). One PNG per story per theme under
 *    `__snapshots__/chromium/`. CI's Linux runner is the canonical
 *    baseline platform; local Mac runs will diff against committed
 *    PNGs and fail — regenerate via the `vr-update` workflow rather
 *    than locally.
 *
 * Theme coverage (per dark-mode-palette.md):
 * - Default light pass writes `<story-id>.png`.
 * - Then re-navigate to the same story with `?globals=theme:dark`
 *   appended (Storybook's URL-globals syntax — toolbar + URL +
 *   test-runner all flip theme via the same `@storybook/addon-themes`
 *   `withThemeByDataAttribute` decorator wired in preview.tsx).
 * - Dark pass writes `<story-id>--dark.png`.
 * - URL-globals is the SoTA path over a direct DOM mutation: the
 *   addon owns the full theme-application lifecycle (any future side
 *   effects beyond `data-theme` ride along automatically).
 *
 * Set `SKIP_VR=1` (env var) to disable both VR passes while keeping
 * axe. The `test:storybook` script does this by default so local Mac
 * runs don't get blocked by CoreText/FreeType baseline divergence;
 * the `test:vr` script omits it so the VR gate runs in CI.
 *
 * Both gates run on every story; failures in either block CI. The
 * screenshot is captured AFTER `waitForPageReady` so fonts/images are
 * settled, which also makes axe deterministic.
 */
const customSnapshotsDir = `${process.cwd()}/__snapshots__/chromium`;
const skipVR = process.env.SKIP_VR === "1";

/**
 * Append (or replace) a `globals=key:value;...` query parameter on a
 * Storybook iframe URL. Uses URL/URLSearchParams so existing params
 * (`id`, `viewMode`, `args`) survive untouched. Per Storybook's globals
 * URL syntax (essentials/toolbars-and-globals docs).
 */
function withTheme(url: string, theme: string): string {
  const u = new URL(url);
  u.searchParams.set("globals", `theme:${theme}`);
  return u.toString();
}

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

    // Wait for fonts/images/etc. — makes both the axe check above and
    // the screenshot below deterministic.
    await waitForPageReady(page);

    if (skipVR || storyContext.parameters?.vr?.disable === true) {
      return;
    }

    // Light VR baseline. Naming: `<story-id>.png` where the story id
    // is Storybook's CSF-derived slug (e.g. `aside--note`). First run
    // on a fresh checkout creates the baseline; subsequent runs diff
    // against it and write expected/actual/diff PNGs to
    // `test-results/` on failure.
    const lightImage = await page.screenshot({ fullPage: true });
    expect(lightImage).toMatchImageSnapshot({
      customSnapshotsDir,
      customSnapshotIdentifier: context.id,
    });

    // Dark VR baseline. Re-navigate to the same story with the
    // `theme:dark` global set via URL. addon-themes' decorator picks
    // up the global and applies `data-theme="dark"` to the iframe's
    // <html>; the @sophie/theme CSS variable graph re-resolves
    // automatically. waitForPageReady ensures fonts + CSS settle
    // before the screenshot.
    await page.goto(withTheme(page.url(), "dark"));
    await waitForPageReady(page);

    const darkImage = await page.screenshot({ fullPage: true });
    expect(darkImage).toMatchImageSnapshot({
      customSnapshotsDir,
      customSnapshotIdentifier: `${context.id}--dark`,
    });
  },
};

export default config;
