---
title: Run visual regression locally
short_title: Visual regression
description: Recipes for the visual-regression dev loop — local axe validation, CI failure triage, intentional-change baseline regen, per-story opt-out, and PNG-as-review-surface.
tags: [testing, visual-regression, storybook, ci, dev-loop]
---

# Run visual regression locally

This how-to covers the day-to-day workflow around Sophie's visual-regression (VR) baselines. The decision behind the architecture is in [ADR 0057](../decisions/0057-visual-regression-baseline.md); the API surface (env vars, parameters, file layout) is in the [Visual regression reference](../reference/visual-regression.md). This page is the recipe.

:::{important} The Linux/macOS split
Mac-local `pnpm test:vr` always fails. CI's Ubuntu runner is the canonical baseline environment; macOS renders text differently (CoreText vs FreeType), so PNGs you generate locally never match what CI generates. **Don't try to regenerate baselines on Mac.** Use the CI regen workflow (recipe 3 below). For *axe* validation on Mac, use `test:storybook` (recipe 1).
:::

## 1. Validate a11y locally before pushing

For any component change, run axe-core locally to catch a11y violations before CI does. Skips the visual-regression block via `SKIP_VR=1`, which the script sets by default.

```bash
pnpm --filter @sophie/components build-storybook
pnpm dlx http-server packages/components/storybook-static --port 6006 --silent &
sleep 3
pnpm --filter @sophie/components test:storybook
```

Expected: 68/68 stories pass. Any failure is a real a11y regression — fix the component or, if intentional and justified, add `parameters.a11y.disable: true` to the specific story.

Kill the http-server when done:

```bash
pkill -f "http-server.*storybook-static"
```

## 2. Triage a failed `vr` check on a PR

When CI's `vr` job goes red, the failure is either a regression (your change broke something visually) or intentional (your change *is* the visual change). Decide which by reading the diff PNGs.

### Download the `vr-diffs` artifact

```bash
gh run download <run-id> --name vr-diffs
```

Find the run id from the PR's checks panel or `gh pr checks <pr-num>`. The artifact unzips to `packages/components/__snapshots__/chromium/__diff_output__/` and includes three PNGs per failed story:

- `<story-id>-expected.png` — the committed baseline (canonical Linux render)
- `<story-id>-actual.png` — what CI just rendered (the result of your change)
- `<story-id>-diff.png` — a visual diff highlighting changed pixels in red

### Read the diffs

You can `Read` PNGs directly in Claude Code (multimodal) — open `expected`, `actual`, `diff` side by side and judge whether the change matches your intent. If you're working with Claude as an AI co-author, paste the three PNG paths and ask "do these diffs match the change I described?"

### Decide

- **Regression** (change altered something you didn't intend): fix the component, push, CI re-runs. Skip to recipe 1 if you want to validate locally first.
- **Intentional** (change *is* the visual change you wanted): proceed to recipe 3 to update baselines.

## 3. Update baselines for an intentional visual change

You've decided the diff is correct. Regenerate baselines on CI Linux (the only environment that matches the committed baselines).

```bash
gh workflow run vr-update --ref <branch-name> --field branch=<branch-name>
```

Both `--ref` and `--field branch=` are required. `--ref` tells GitHub Actions which checkout to run from; `--field branch=` tells the workflow which branch to push the regenerated PNGs back to. The bare `--ref` form fails — both are load-bearing.

Watch the workflow:

```bash
gh run list --workflow=vr-update.yml --branch <branch-name> --limit 1
gh run watch <run-id>
```

Typical runtime: ~2 minutes. When it completes, it pushes a bot commit `chore(vr): regenerate baselines via vr-update workflow` to your branch.

### Trigger a fresh CI run on the bot commit

The bot push uses `GITHUB_TOKEN`, which by design does *not* fire `pull_request: synchronize` events (GitHub's loop-prevention rule). Your PR's `vr` check won't auto-rerun. Force a fresh CI run by closing and reopening the PR:

```bash
gh pr close <pr-num>
gh pr reopen <pr-num>
```

This fires a `reopened` event, CI runs against the bot commit (which has the new baselines), and the `vr` check goes green.

## 4. Skip VR on a specific story

Some stories are genuinely non-deterministic — live timestamps, randomized fixtures, animation frames captured at variable times. For those, opt out:

```tsx
// Foo.stories.tsx
export const NonDeterministic: Story = {
  parameters: {
    vr: { disable: true },   // skips the screenshot comparison
  },
  args: { /* ... */ },
};
```

This is symmetric with `parameters.a11y.disable` and only skips the VR block in the test-runner's `postVisit` hook. Axe still runs.

**When to use this:**

- Story renders `Date.now()` or other clock-dependent content.
- Story uses randomized fixture data (`Math.random()`, `faker`, etc.).
- Story captures an animation mid-frame and the frame is timing-dependent.

**When NOT to use this:**

- You're tired of baseline diffs. The fix is to make the component deterministic, not to skip its VR coverage.
- The diff is intentional. Use recipe 3 instead.
- The story passes axe but has a contrast/spacing concern you'd rather not address. That's a real bug; file it.

Document the reason in a comment above the `parameters` block. Future contributors should be able to tell why VR is off.

## 5. Use baselines as a review surface

[ADR 0057 §3](../decisions/0057-visual-regression-baseline.md) names this as a first-class use case: PNG baselines are reviewable artifacts independent of the running app. You — or Claude as an AI co-author — can `Read` any PNG in `packages/components/__snapshots__/chromium/` and judge visual quality without spinning up Storybook.

```text
packages/components/__snapshots__/chromium/components-keyequation--short-form.png
packages/components/__snapshots__/chromium/components-aside--note.png
packages/components/__snapshots__/chromium/components-learningobjectives--three-objectives.png
```

### AI-co-author workflow

When working with Claude on component design:

1. **You ask**: "Does the KeyEquation `ShortForm` baseline look right? I'm worried about the subscript spacing."
2. **Claude reads** `components-keyequation--short-form.png` and describes what it sees — the Greek letter, baseline alignment, kerning, surrounding prose.
3. **Claude proposes** specific CSS changes if there's a visible defect, citing what would change in the rendered output.
4. **You verify** by pushing the CSS change and reading the regenerated baseline (via recipe 3).

This works because the baselines are CI-Linux-rendered, deterministic, and committed — they're a stable visual contract Claude can read and reason about. The dev loop without this is "blind CSS edits with no feedback signal until a human runs the dev server."

### PR-review workflow

When reviewing a PR with `vr` baseline diffs:

1. Open the PR's **Files changed** tab.
2. GitHub renders PNG diffs inline (slider, before/after, or onion-skin views) for committed binary changes.
3. For each changed baseline, decide: is the new render an improvement, a regression, or neutral? Apply your judgment, comment on the PR.

This is design review at the file-diff level. It scales — a 17-component polish sprint produces ~17 reviewable PNG diffs in one place rather than 17 manual Storybook walks.

## Troubleshooting

- **`vr` check fails on first push of a new component.** Expected — there's no baseline yet. Trigger `vr-update` (recipe 3) to create the initial baseline. Subsequent PRs gate against it.
- **`vr` check passes locally on Mac via some workaround.** Don't trust it. Mac PNGs structurally diverge from Linux. Push to CI and trust the CI result.
- **`vr-update` workflow fails with permission error.** The workflow uses `GITHUB_TOKEN` with job-level `contents: write` permission. If branch protection blocks bot pushes to your branch, that's an admin concern — escalate to Anna.
- **`pnpm test:storybook` fails locally with snapshot diffs.** Check that `SKIP_VR=1` is being passed. The `test:storybook` script prefixes it; if you're running `test-storybook` directly, set the env var manually.
- **CI's `vr` job and `storybook` job both fail with the same diffs.** Pre-PR-#58 coupling — should not happen on `main` after 2026-05-16. If it does recur, the SKIP_VR gate has regressed; file an issue.

## See also

- [Visual regression reference](../reference/visual-regression.md) — env vars, story parameters, snapshot dir layout, CI job anatomy, known limitations.
- [ADR 0057](../decisions/0057-visual-regression-baseline.md) — the architectural decision and rationale (canonical Linux baseline; dual-purpose framing).
- [`packages/components/__snapshots__/README.md`](https://github.com/drannarosen/sophie/blob/main/packages/components/__snapshots__/README.md) — operational details adjacent to the baseline files themselves.
- [Add a custom component](add-a-custom-component.md) — the broader component-authoring recipe; VR baselines land automatically on first CI run.
