---
date: 2026-05-15T00:00:00.000Z
tags:
  - tooling
  - storybook
  - dx
  - testing
  - visual-regression
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0057: Visual regression baseline — self-hosted Playwright via Storybook test-runner

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
- **Supersedes**: [0028](./0028-storybook-setup.md)
:::

## Context

[ADR 0028](./0028-storybook-setup.md) shipped Storybook with axe-only
checks and deferred visual regression after three CI iterations
surfaced an architectural mismatch: single-OS-generated baselines
fail against cross-platform rendering. The deferral named three
candidate resolutions (Docker-based Linux baselines, per-platform
baselines, Chromatic SaaS) and explicitly invited revisiting once
Sophie scaled.

The trigger for revisiting is **Workstream 3 — per-component visual
polish** (17 components in scope per the
[Bucket B + C architecture audit](../../reviews/2026-05-15-bucket-b-c-architecture-audit.md)).
Polish PRs need three things visual regression delivers:

1. **A regression gate.** Once a component lands a polished baseline,
   subsequent PRs that refactor theme tokens, layout primitives, or
   shared chrome must not regress that polish accidentally. Without a
   gate, cross-cutting refactors silently drift the visual contract.
2. **A review surface.** PNG artifacts every story produces become
   reviewable outside the running app. Anna in PR review and future
   contributors can `Read` the PNG and judge whether the design is
   good — independent of whether it differs from a baseline. This is
   the load-bearing purpose pre-launch: every component PR initially
   *establishes* its baseline, so the regression-gate doesn't bite
   until the second PR touches the same component.
3. **A multimodal AI review primitive.** Claude (this assistant) uses
   snapshots as the visual-review channel during component-polish
   work. Read the PNG, describe what's rendered, critique against the
   `frontend-design` skill's standards, propose concrete CSS changes.
   The dev loop without this is "blind CSS edits." Naming this
   explicitly in the ADR is unusual but load-bearing for how
   Workstream 3 operates.

The cheerful-eagle session plan locked "Chromatic-style Storybook
screenshot baseline" as Workstream 3's prereq — meaning the
*workflow* (committed baselines, CI diff in every PR, regen on
intentional change), not the *vendor*.

## Decision

**Self-hosted visual regression via `@storybook/test-runner` +
Playwright + CI's Linux runner as the canonical baseline
environment.**

Concretely:

1. **Storybook stays the canonical visual contract.** Stories at
   `packages/components/src/components/*/*.stories.tsx` declare
   component states; one snapshot per story.
2. **`@storybook/test-runner`** (the official Storybook CLI; uses
   Playwright under the hood) iterates every story, takes a Chromium
   screenshot, and compares to a baseline committed at
   `packages/components/__snapshots__/chromium/<Component>--<story>.png`.
3. **CI's Ubuntu runner is the only environment that generates or
   verifies snapshots.** Mac-local snapshot generation is impossible
   without Docker because CoreText (macOS) and FreeType (Linux) render
   identical HTML/CSS to byte-different PNGs. Local dev iterates via
   `sophie start` + Storybook in the browser; CI is the gate.
4. **One PNG per story, light theme, natural viewport.** Dark-theme
   and mobile-viewport variants are opt-in: explicit additional story
   names (e.g., `KeyEquation--dark`, `Aside--mobile`) when the
   component's behavior genuinely diverges.
5. **Diff workflow:** CI fails the `vr` job on any diff; uploads
   `test-results/<story>/{expected,actual,diff}.png` as a build
   artifact for review.
6. **Regen workflow:** manual-trigger `.github/workflows/vr-update.yml`
   re-runs the test-runner with `--update-snapshots`, commits new
   baselines back to the branch via the bot token.

## Rationale

**Self-hosted Playwright over Chromatic SaaS.** ADR 0028's deferral
section already weighed this; the conclusion holds, and three forces
reinforce it:

- **Cost.** Chromatic's free tier is 5,000 snapshots/month. Sophie has
  ~64 stories today; per-PR snapshot runs would burn through fast.
  Standard tier is $149/month. Pre-launch, zero-revenue,
  Cottrell/CAREER funding still in proposal stage — recurring spend
  without a revenue offset is the wrong shape.
- **Open-source posture.** Sophie ships under AGPL ([ADR 0024](./0024-license-agpl.md));
  external instructors adopting Sophie shouldn't be forced into a SaaS
  dependency. Self-hosted snapshots committed to the repo travel with
  the source.
- **Infrastructure already exists.** The Playwright e2e suite has been
  running in CI since Phase 0 ([ADR 0025](./0025-phase-0-actual-scope.md)).
  Storybook test-runner uses the same Playwright binaries. No new
  infrastructure to maintain.

**CI Linux as canonical baseline, not Docker-on-Mac.** Per ADR 0028's
deferral option list, two technical paths exist for cross-platform
parity: Docker-based Linux baselines (path 1) or per-platform
baselines (path 2). This ADR picks neither, on a YAGNI argument:
local Mac dev iterates visually via `sophie start` (the browser shows
what the component will look like, OS-rendering and all); CI's Linux
runner generates and verifies snapshots. The dev never sees a
snapshot diff locally because the dev never runs the test-runner
locally. Docker-on-Mac becomes the natural escalation if the
push-to-CI regen loop proves too slow for iteration — defer that work
until the friction is real.

**Dual purpose framed explicitly.** ADR 0028's deferral framed VR as
a regression-detection mechanism. This ADR adds the review-surface
framing because pre-launch (no existing baselines to regress from)
the regression role doesn't fire on the first 17 polish PRs. The
review-surface role does — PNGs as reviewable artifacts is the
load-bearing function during Workstream 3.

**Multimodal AI review naming.** Anna requested explicit verification
of UI/UX during component polish, not just CI pass/fail. Claude has
three tools for this: `Read` on PNG files (multimodal), Playwright
MCP for local browser-driven screenshots, and `gh run download` for
CI artifacts. The snapshots produced by this ADR's infrastructure
serve all three. Naming this in the ADR commits the architecture to
the way it'll actually be used.

## Alternatives considered

- **Chromatic SaaS visual regression.** Pros: best-in-class diff UI;
  PR-comment integration; team-collaboration baseline approval. Cons:
  paid recurring service; vendor lock-in once baseline history
  accumulates; external dependency. Rejected for the cost +
  open-source-posture reasons above.

- **Per-platform baselines** (ADR 0028 deferral option 2). Pros:
  Mac-local snapshot regen works. Cons: 2× baseline file count;
  bootstrap complexity; the "macOS-only-correct" baselines drift
  silently from "Linux-only-correct" baselines without anyone
  noticing because no test compares them. Rejected — single canonical
  baseline is the SoTA shape; multi-platform baselines are
  multi-source-of-truth.

- **Docker-on-Mac for local snapshot parity** (ADR 0028 deferral
  option 1). Pros: local regen matches CI exactly; full
  Mac/Linux fidelity. Cons: Docker boot cost per regen run; one more
  build dependency for local dev; not needed until the push-to-CI
  regen loop becomes a real friction point. Rejected for now,
  documented as the natural escalation if friction emerges.

- **Loki + Storybook test-runner.** Pros: purpose-built for Storybook
  VR. Cons: adds another tool to a stack that already has Playwright;
  Loki's maintenance cadence is concerning (last meaningful release
  ~18 months stale); duplicates Playwright's snapshot mechanics.
  Rejected.

- **Snapshot every (theme × viewport) combination per story.** Pros:
  exhaustive coverage. Cons: combinatorial explosion — 64 stories × 2
  themes × 3 viewports = 384 snapshots. Most components don't change
  visually across theme/viewport. Rejected on YAGNI; explicit
  per-story variants only when behavior genuinely changes.

## Consequences

**Easier:**

- Component-polish PRs in Workstream 3 land with reviewable visual
  artifacts (PNGs in the diff). PR review includes design judgment,
  not just code review.
- The `Read` tool on snapshot PNGs gives Claude a multimodal review
  channel — critique against `frontend-design` standards becomes
  concrete rather than handwavy.
- Cross-cutting refactors (theme-token changes, layout-primitive
  edits) surface visual regressions at the test-runner layer instead
  of in production.
- Adding a new component automatically inherits VR coverage as soon
  as its stories land — no per-component fixture authoring.

**Harder:**

- Mac-local snapshot generation is structurally impossible without
  Docker. The dev loop for "intentional visual change" is: push the
  PR; CI flags the diff; trigger `vr-update` workflow; CI commits new
  baselines back. ~5-minute round-trip per regen.
- ~64 baseline PNGs (~2-3MB total) added to the git repo. Standard
  binary handling at this scale; well below LFS thresholds.
- One additional CI job (`vr`), adding ~1-2 minutes to the critical
  path. Parallelizes with `e2e` so total CI wall-clock impact is bounded.
- ADR 0028's "Visual regression deferral" section is superseded; this
  ADR is now the authoritative VR decision. ADR 0028's Body stays
  intact (historical record); its `Status` flips to `superseded`.

**Triggers:**

- Setup PR: install `@storybook/test-runner`; extend
  `packages/components/.storybook/test-runner.ts`'s `postRender` hook
  to add the screenshot comparison; generate baselines for all ~64
  stories; commit PNGs; add `vr` job to `.github/workflows/ci.yml`;
  add `.github/workflows/vr-update.yml` regen workflow; add
  `__snapshots__/README.md` documenting the regen flow.
- `packages/components/package.json`: add `test:vr` + `test:vr:update`
  scripts.
- `turbo.json`: add `test:vr` task with `dependsOn: ["build-storybook"]`.
- ADR 0028: amend Status to `superseded`; add `Superseded by: 0057`
  to its admonition.
- `docs/website/contributing/coding-standards.md` § Visual regression:
  update from "deferred" to "ships per ADR 0057."

## References

- [ADR 0028](./0028-storybook-setup.md) — superseded by this ADR. Its
  "Visual regression deferral" section names the three resolution
  paths; this ADR picks none of them and instead resolves the gap by
  accepting CI as the canonical environment with no local-platform
  dependency.
- [ADR 0004](./0004-component-contract-revisions.md) — axe-core
  mandate; `test-runner.ts` already runs it, and this ADR extends the
  same runner with screenshot comparison.
- [ADR 0024](./0024-license-agpl.md) — AGPL posture rules out paid
  recurring SaaS for the platform's CI gate.
- [ADR 0055](./0055-squash-merge-for-code-prs.md) — squash-merge for
  the setup PR.
- [ADR 0056](./0056-validation-tracker.md) — frontmatter convention
  this ADR follows.
- [`@storybook/test-runner` test-hook API](https://storybook.js.org/docs/writing-tests/integrations/test-runner#test-hook-api)
  — the `postRender` extension point this ADR's implementation uses.
- [Bucket B + C architecture audit](../../reviews/2026-05-15-bucket-b-c-architecture-audit.md)
  — Workstream 3 scope: 17 components.
- [VR baseline design](../../plans/2026-05-15-vr-baseline-design.md) —
  validated design output from the brainstorming session.
- [cheerful-eagle session plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
  — Workstream 3 entry decisions.
