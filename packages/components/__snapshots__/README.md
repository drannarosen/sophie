# Component visual-regression snapshots

Baseline PNGs for [`@storybook/test-runner`](https://storybook.js.org/docs/writing-tests/test-runner). One PNG per story, captured in Chromium on CI's Ubuntu runner per ADR 0057.

## Regenerating baselines

Intentional visual changes require regenerating snapshots. Two paths:

**Recommended — CI regen (canonical baselines):**

1. Push your branch with the component changes.
2. Once CI's `vr` job fails (diffs surface as artifacts), trigger:

   ```bash
   gh workflow run vr-update --ref <branch-name> --field branch=<branch-name>
   ```

3. CI regenerates baselines on Linux and commits them back to the branch.
4. PR auto-updates; review the new PNGs in the Files changed tab.

**Local-only (will produce Mac-rendered PNGs that diverge from CI):**

- Build Storybook: `pnpm --filter @sophie/components build-storybook`
- Serve it: `pnpm dlx http-server packages/components/storybook-static --port 6006`
- Regen: `pnpm --filter @sophie/components test:vr:update -- --url http://127.0.0.1:6006`

Mac-local baselines fail in CI because of CoreText (macOS) vs FreeType (Linux) font rendering differences. Use the CI path for actual baseline updates.

## Structure

- `chromium/` — current Chromium baselines.
- (`firefox/`, `webkit/` reserved for future cross-browser coverage; not used in v1.)
