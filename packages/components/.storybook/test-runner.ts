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
 * - Then flip `data-theme="dark"` on the iframe's <html> via a direct
 *   DOM mutation (`@sophie/theme`'s CSS variable graph re-resolves
 *   immediately — no navigation, no story re-mount).
 * - Dark pass writes `<story-id>--dark.png`.
 * - Restore `data-theme="light"` so the page state is stable for the
 *   next story's test-runner handoff.
 * - URL-globals (`?globals=theme:dark`) was tried first as the
 *   "single source of truth" path, but mid-postVisit navigation
 *   disrupts test-runner internals (`globalThis.__getContext`
 *   re-registration race against `getStoryContext` in the next
 *   story's postVisit). addon-themes' `withThemeByDataAttribute`
 *   produces byte-identical DOM under either path, so direct
 *   mutation costs nothing visually while staying compatible with
 *   the test-runner lifecycle. The toolbar/URL paths (interactive
 *   theme-switching) continue to flow through the addon decorator
 *   in preview.tsx — that mechanism is unchanged.
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

// VR pixel-diff tolerance. 0.5% absorbs sub-pixel anti-aliasing
// variance between renders (Observable Plot's SVG rasterization is
// not byte-deterministic across separate renders on the same Linux
// runner; BlackbodyExplorer reliably produces 0.08–0.15% diffs from
// anti-aliasing decisions alone). The default failureThreshold of 0
// catches *any* pixel change — too strict for SVG-heavy chrome.
// Real visual regressions (chrome rebinds, color shifts, layout
// drift) move pixels well above 0.5%; PR-1 through PR-4 produced
// zero VR diffs against existing baselines under this threshold.
// Per ADR 0057: CI Linux remains the canonical baseline platform.
const snapshotOpts = {
  customSnapshotsDir,
  failureThreshold: 0.005,
  failureThresholdType: "percent" as const,
};

/**
 * Set `data-theme="<theme>"` on the iframe's <html>. The
 * `@storybook/addon-themes` `withThemeByDataAttribute` decorator
 * (preview.tsx) uses this same attribute when responding to globals
 * updates, so DOM-direct mutation produces a byte-identical end
 * state. `@sophie/theme`'s CSS variable graph re-resolves on the
 * attribute selector match — no relayout, no story re-mount.
 */
async function setTheme(
  page: import("@playwright/test").Page,
  theme: string
): Promise<void> {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },
  async preVisit(page) {
    // Block known cross-origin iframe-embed hosts so `waitForPageReady`
    // (network-idle) stays deterministic on CI. Stories rendering real
    // <iframe> elements (e.g. <Video> embed) would otherwise hang
    // waiting for hosts CI cannot reach (or can but slowly). The
    // blocked iframe still renders its element box, so axe still
    // validates `frame-title` + the figure landmark, and VR captures
    // a deterministic empty iframe rectangle. Pattern, not patch:
    // future embed stories that point at additional hosts extend
    // this regex rather than each opting out individually.
    await page.route(
      /(?:youtube-nocookie\.com|youtube\.com\/embed|player\.vimeo\.com|example\.org|example\.com|example\.edu)/,
      (route) => route.abort()
    );
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
          // `color-contrast` is excluded pending a focused token-audit
          // + per-component remediation pass. Tracked in GitHub issue
          // #152 (https://github.com/drannarosen/sophie/issues/152) —
          // 59 violations across 10 components (MultiRep × 15,
          // EquationBiography × 15, Intervention × 6, Aside × 6,
          // Callout × 5, Figure × 4, KeyEquation × 3, ConfidenceCheck
          // × 3, Predict × 1, EquationRef × 1). Component-family
          // clustering suggests systemic per-variant token violations
          // (`--sophie-text-muted` / `--sophie-callout-*-title-bg`),
          // not per-story author issues — a 1-2 day token-audit +
          // remediation pass, not a single-PR fix. Do NOT re-enable
          // without first reading the issue.
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
      ...snapshotOpts,
      customSnapshotIdentifier: context.id,
    });

    // Dark VR baseline. Flip data-theme on the iframe <html>; the
    // @sophie/theme CSS variable graph re-resolves immediately. No
    // navigation — keeps the test-runner lifecycle (`__getContext`,
    // `getStoryContext`) intact for the next story's postVisit.
    await setTheme(page, "dark");
    await waitForPageReady(page);

    const darkImage = await page.screenshot({ fullPage: true });
    expect(darkImage).toMatchImageSnapshot({
      ...snapshotOpts,
      customSnapshotIdentifier: `${context.id}--dark`,
    });

    // Restore default theme for the next story's handoff. Without
    // this, addon-themes' globals → data-theme path could race
    // against our direct mutation on the next iframe mount.
    await setTheme(page, "light");
  },
};

export default config;
