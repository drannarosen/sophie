# Component visual-regression snapshots

Baseline PNGs for [`@storybook/test-runner`](https://storybook.js.org/docs/writing-tests/test-runner). One PNG per story, captured in Chromium on CI's Ubuntu runner per ADR 0057.

> For day-to-day recipes (triaging CI failures, regenerating baselines, per-story opt-out, using PNGs as a review surface), see the docs site:
>
> - [Run visual regression locally](../../../docs/website/how-to/run-visual-regression-locally.md) — the recipes.
> - [Visual regression reference](../../../docs/website/reference/visual-regression.md) — env vars, story parameters, file layout, CI job anatomy, known limitations.
>
> This README is the operational note adjacent to the baseline files themselves.

## Regenerating baselines

Intentional visual changes require regenerating snapshots. Two paths:

**Recommended — CI regen (canonical baselines):**

1. Push your branch with the component changes.
2. Once CI's `vr` job fails (diffs surface as artifacts), trigger:

   ```bash
   gh workflow run vr-update --ref <branch-name> --field branch=<branch-name>
   ```

3. CI regenerates baselines on Linux and commits them back to the branch.
4. Close + reopen the PR to fire a fresh CI run on the bot commit (`GITHUB_TOKEN` doesn't trigger `pull_request: synchronize` by design).
5. Review the new PNGs in the PR's Files changed tab.

**Local-only (will produce Mac-rendered PNGs that diverge from CI):**

- Build Storybook: `pnpm --filter @sophie/components build-storybook`
- Serve it: `pnpm dlx http-server packages/components/storybook-static --port 6006`
- Regen: `pnpm --filter @sophie/components exec test-storybook --browsers chromium --updateSnapshot`

Mac-local baselines fail in CI because of CoreText (macOS) vs FreeType (Linux) font rendering differences. Use the CI path for actual baseline updates.

## Structure

- `chromium/` — current Chromium baselines.
- (`firefox/`, `webkit/` reserved for future cross-browser coverage; not used in v1.)
