# Workstream 3 — Visual-regression baseline (design)

**Status:** design committed; ADR 0057 + implementation plan to follow.
**Workstream:** 3 (visual polish; this is the prep ADR + setup PR before any
component polish work begins).
**Scope:** stand up the Storybook + Playwright snapshot infrastructure
that supports both regression-gate and review-surface workflows.

## Context

The cheerful-eagle session plan locked "Chromatic-style Storybook
screenshot baseline" as Workstream 3's prereq. ADR 0028 originally
deferred visual regression pending Linux-native baselines; that
blocker no longer applies because CI's Ubuntu runner is now accepted
as the canonical baseline environment.

Workstream 3 is per-component visual polish (17 components in scope
per the [Bucket B + C architecture audit](../reviews/2026-05-15-bucket-b-c-architecture-audit.md)).
Polish PRs need three things VR delivers:

1. **A regression gate** — committed baselines + CI diffs catch
   accidental regressions across components when a later PR refactors
   shared infrastructure (theme tokens, layout primitives).
2. **A review surface** — PNG artifacts every story produces let me
   (Claude, via `Read` on PNG files), Anna (in PR review), and future
   contributors look at what the components actually render outside the
   running app. This is the load-bearing purpose for Workstream 3
   because pre-launch Sophie has zero pre-existing baseline to regress
   from — every component PR initially *establishes* its baseline.
3. **A multimodal AI review primitive** — explicitly: I use these
   snapshots as my visual-review channel during component polish. Read
   the PNG, describe what I see, critique against the
   `frontend-design` skill's standards, propose specific CSS changes.
   The dev loop without this is "blind CSS edits."

## Scope decisions (locked via brainstorming)

| Decision | Outcome |
|---|---|
| SaaS vs self-hosted | **Self-hosted Playwright via `@storybook/test-runner`.** Zero ongoing cost; aligns with AGPL/open-source posture. No Chromatic. |
| Canonical platform | **CI's Linux runner.** Mac-local snapshot generation impossible (CoreText vs FreeType font rendering); local dev relies on `sophie start` + Storybook in the browser for visual iteration, then pushes to CI to verify snapshots. |
| Per-story coverage | **One snapshot per story, light theme, natural viewport.** Dark + mobile variants are opt-in (additional story names for components where behavior genuinely changes). YAGNI on combinatorial coverage. |
| Diff workflow | **CI uploads `expected.png` + `actual.png` + `diff.png` as build artifact.** Reviewer downloads, judges intentional vs regression. |
| Regen workflow | **Manual-trigger `vr-update` GitHub Action.** Runs the test-runner with `--update-snapshots`, commits new baselines back to the branch. One command from `gh` CLI. |
| ADR shape | **Supersedes ADR 0028** explicitly. 0028's Status flips to `superseded`; 0057 takes over the visual-regression decision. |

## Tool composition

Three layers stack:

1. **Storybook** (already configured at `packages/components/.storybook/`)
   keeps doing what it does today — stories at
   `packages/components/src/components/*/*.stories.tsx` are the
   canonical visual contract.
2. **`@storybook/test-runner`** (new devDependency on
   `@sophie/components`) is a CLI tool that iterates every story,
   renders it in a real Chromium via Playwright, and runs assertions
   per story. The runner CONFIG at
   `packages/components/.storybook/test-runner.ts` already exists from
   the axe-core wiring; this work extends its `postRender` hook to
   take + compare screenshots in addition to running axe.
3. **Playwright** (already at workspace root, from the e2e suite)
   provides the browser binaries the test-runner uses. No new
   Playwright install.

Effective workflow per story:
```
Story renders in Storybook → test-runner postRender fires →
  run axe (existing) → take screenshot → compare to baseline →
  on diff, save expected/actual/diff to test-results/
```

## File layout

```
packages/components/
├── .storybook/
│   └── test-runner.ts        # extends existing config for VR
├── __snapshots__/
│   ├── chromium/
│   │   ├── Aside--note.png
│   │   ├── Aside--definition.png
│   │   ├── (... ~60 more, one per story)
│   │   └── Search--searchmodal-default.png
│   └── README.md             # explains the dir, regen workflow
└── package.json              # +test:vr, +test:vr:update scripts
```

Naming: `<Component>--<story-slug>.png`. Storybook's CSF makes slugs
deterministic from story export names. `chromium/` subdirectory leaves
room for future Firefox/WebKit baselines without restructuring.

PNGs checked into git as regular files (not LFS):
- ~30-50KB each × ~64 stories = ~2-3MB total
- Well below LFS thresholds
- Standard git binary handling fine at this size

## Scripts added

In `packages/components/package.json`:

```json
"test:vr": "test-storybook --browsers chromium",
"test:vr:update": "test-storybook --updateSnapshot --browsers chromium"
```

Workspace-root `turbo.json`: `test:vr` added to the pipeline with
`dependsOn: ["build-storybook"]` so the snapshot test always runs
against a fresh Storybook build.

## CI integration

New `vr` job in `.github/workflows/ci.yml`:

```yaml
vr:
  needs: storybook  # reuses the storybook-static/ build output
  runs-on: ubuntu-latest
  steps:
    - checkout
    - setup-node + pnpm install
    - download storybook-static artifact
    - pnpm exec turbo run test:vr --filter=@sophie/components
    - on failure: upload-artifact test-results/ (contains diff PNGs)
```

Separate job from `storybook` (not folded in) because VR failures are
categorically different from a11y failures:
- a11y is a hard gate (ADR 0004 mandate); WCAG violations block merge
- VR is review-gated — diff fires, reviewer decides "regression or
  intentional"

A `vr-update` workflow at `.github/workflows/vr-update.yml` is
manually triggered:

```bash
gh workflow run vr-update --ref <branch>
```

Internally: checks out the branch, runs `pnpm test:vr:update`,
commits the regenerated PNGs back via the bot's GitHub token. PR
auto-updates with the new baselines; reviewer sees the new PNGs in
the "Files changed" tab.

## ADR 0057 shape

The ADR (next available number; 0056 is taken by your parallel-session
validation tracker work) supersedes ADR 0028. Frontmatter follows the
new convention from ADR 0056:

```yaml
---
date: 2026-05-15T00:00:00.000Z
tags:
  - tooling
  - storybook
  - dx
  - testing
  - visual-regression
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---
```

ADR sections: Context (cite 0028's deferral + cheerful-eagle scope) →
Decision (self-hosted Playwright via Storybook test-runner; Linux CI
as canonical baseline) → Rationale (cost + alignment + dual-purpose
snapshots) → Alternatives considered (Chromatic SaaS; Loki) →
Consequences (named: local Mac can't generate; CI regen workflow;
snapshots committed; review-surface use for human + multimodal AI
review) → References (0028 cross-ref, cheerful-eagle plan).

ADR 0028 gets a small amendment: `Status: superseded` + `Superseded by: 0057`
in its admonition block. Don't rewrite its Body; superseded ADRs stay
intact for historical traceability.

## Out of scope (deferred)

- Firefox/WebKit baselines. The `chromium/` subdir leaves room; YAGNI
  until cross-browser becomes a real concern.
- Mobile-viewport snapshots beyond explicit per-story opt-in.
- Animated/interactive snapshot sequences (e.g., reveal animations
  before/after). Use static stories that capture the relevant frame.
- Docker-on-Mac for local snapshot parity. Defer until CI regen loop
  becomes too slow for iteration.

## Verification

The setup PR is "done" when:

- [ ] `@storybook/test-runner` installed; existing axe-core tests
      still pass
- [ ] `test-runner.ts` extended with screenshot logic
- [ ] All ~64 stories produce baseline PNGs (first run creates them;
      committed in the same PR)
- [ ] `pnpm exec turbo run test:vr --filter=@sophie/components`
      passes locally after baselines committed
- [ ] CI `vr` job green
- [ ] `vr-update` workflow created and one round-trip verified (open
      a test PR; touch a component; trigger regen; PR auto-updates)
- [ ] ADR 0057 published; ADR 0028 marked superseded
- [ ] Docs added at `packages/components/__snapshots__/README.md`
      explaining the regen workflow

## Implementation plan reference

To be written at `docs/plans/2026-05-15-vr-baseline-plan.md` after
this design lands.

## References

- [Bucket B + C architecture audit](../reviews/2026-05-15-bucket-b-c-architecture-audit.md)
  — D6 storybook coverage; D7 a11y posture (axe runner pattern to
  extend).
- [ADR 0028](../website/decisions/0028-storybook-setup.md) — the
  deferral this ADR supersedes.
- [ADR 0004](../website/decisions/0004-component-contract-revisions.md)
  — axe-core mandate; test-runner already runs it.
- [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md)
  — squash-merge for the setup PR.
- [ADR 0056](../website/decisions/0056-validation-tracker.md) —
  frontmatter convention this ADR's frontmatter follows.
- [`@storybook/test-runner` docs](https://storybook.js.org/docs/writing-tests/test-runner)
  — the runner this design adopts.
- [cheerful-eagle session plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
  — Workstream 3 scope.
