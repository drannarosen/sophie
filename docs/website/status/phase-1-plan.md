---
title: Phase 1 plan
short_title: Phase 1 plan
description: Handoff from Phase 0 to Phase 1 — what shipped, what's deferred, architectural lessons, first-week priorities, known issues.
tags: [phase-1, handoff, planning, status]
---

# Phase 1 plan

This document is the bridge between Phase 0 (foundation) and Phase 1
(core schema + components + first real chapters). It captures:

1. What Phase 0 actually shipped.
2. What Phase 0 deliberately deferred (with priority hints).
3. Architectural lessons from Phase 0.
4. Phase 1 first-week priorities.
5. Known issues inherited from Phase 0.
6. Triggered tasks (CLA, CI investigation) that fire on first
   contributor PR.

## 1. What Phase 0 shipped

Verified 2026-05-10. See
[ADR 0025](../decisions/0025-phase-0-actual-scope.md) for the
ten-step decomposition and calendar.

- ✅ `drannarosen/sophie` GitHub repo (public, AGPL-3.0-or-later
  per [ADR 0024](../decisions/0024-license-agpl.md)).
- ✅ pnpm workspace + TypeScript 6 + Biome + Turborepo + Astro 6 +
  MDX + React 19. Node 22 (`.nvmrc`); pnpm 11.0.9 (`packageManager`).
- ✅ `@sophie/core` — schema (Zod), audit utilities, `sophie` CLI
  binary, with subpath exports (`/schema`, `/audit`) and Biome
  `noRestrictedImports` rule for internal boundaries.
- ✅ `@sophie/theme` — TS tokens to CSS variables (light + dark)
  via Tailwind v4 CSS-first `@theme` directive
  ([ADR 0026](../decisions/0026-tailwind-v4-css-first.md)).
- ✅ `@sophie/components` — `<Callout>` + `<Figure>` + `useInteractive`
  runtime over IndexedDB + BroadcastChannel + `ResponseStore`, all
  axe-core tested.
- ✅ `@sophie/astro` — `defineSophieIntegration()` +
  `makeStaticComponents()` + `<SophieChapter>` client island.
  Framework-purity boundary enforced. ADR 0027 records the
  per-instance hydration constraint surfaced during step 7.
- ✅ `examples/smoke/` — real trimmed ASTR 201 first reading
  (spoiler-alerts) renders end-to-end with prose + KaTeX + 26
  figures + interactive `<Callout>`. Throwaway target; will be
  replaced by `drannarosen/astr201` in Phase 1.
- ✅ Vitest + Playwright (chromium) + axe-core + coverage (v8)
  wired through Turborepo cache.
- ✅ GitHub Actions CI (lint, typecheck, unit, build, e2e jobs)
  + Dependabot (security-only).
- ✅ CI build + e2e jobs green on Linux runners as of 2026-05-10
  (Phase 1 step 1 fix; see [§5.1](#51-linux-ci-build-job-fails-resolved-2026-05-10)
  for the resolution writeup).
- ⚠️ Branch protection on `main`: deferred pending the now-green
  CI status; checklist still in [§5.2](#52-branch-protection-on-main-deferred).

## 2. What Phase 0 deliberately deferred

Each deferral was a deliberate scope choice in
[ADR 0023](../decisions/0023-vertical-slice-build-order.md). Phase 1
priority hints below; final ordering is set when Phase 1 plan-mode
work begins.

| Deferred | Phase 1 priority | Notes |
|---|---|---|
| Port existing SCSS (`callouts.scss`, `lecture-cards.scss`, `nav-markers.scss`, `dashboard.scss`, `glossary.scss`, `collapsible-cards.scss`, `tokens.scss`, `design-tokens.scss`) from `astr101-sp26`/`astr201-sp26`/`comp536-sp26` to `@sophie/components` CSS Modules | High — Phase 1 week 1–2 | Per ADR 0005's "port not redesign" rule. Tailwind v4 `@theme` for tokens, CSS Modules for component styles. |
| 14 remaining v1 components against the proven contract pattern | High — Phase 1 weeks 2–5 | Use ADR 0027's per-instance hydration pattern. Order by dependency: layout primitives first, persistence-bearing later. |
| `drannarosen/astr201` consumer repo + first real chapter migration | High — Phase 1 week 1 (parallel) | Replaces `examples/smoke/` as the proving ground. Pick a well-bounded chapter (recommend `flux-luminosity-distance`). |
| Storybook (around the third v1 component when isolation pays off) | ~~Medium — Phase 1 week 3+~~ **Done 2026-05-10** | Shipped between Trio 2.5 and Trio 3 with stories backfilled for all 9 components, axe-playwright per story in CI. See [§4.2](#42-storybook-activates-between-trio-25-and-trio-3-2026-05-10) and [ADR 0028](../decisions/0028-storybook-setup.md). |
| Visual regression (Chromatic or Playwright screenshots) | Low — Phase 1 end (deferred 2026-05-10) | Scoped in ADR 0028 but deferred after CI surfaced macOS↔Ubuntu anti-aliasing gaps. Re-enable with Docker-based Linux baseline generation, per-platform baselines, or Chromatic. See [ADR 0028 § Visual regression deferral](../decisions/0028-storybook-setup.md). |
| `sophie audit` Tier 1 + Tier 2 deterministic checks | Phase 3 | Audit was scoped to the schema-validation hook in Phase 0. |
| `<CodeCell>` (Pyodide + CodeMirror 6) | Phase 3 | Per [ADR 0018](../decisions/0018-codemirror-6-for-codecell.md). |
| `@sophie/cosmic-playground` | Phase 1+ when the first `<Demo>` lands | iframe + manifest protocol per [ADR 0008](../decisions/0008-cosmic-playground-protocol.md). |
| `@sophie/renderer-contract` | Phase 2+ when a second renderer is real | The contract design lives in ADR 0001. |
| Lefthook + Commitlint pre-commit hooks | When contributors arrive | Triggered task; not before. |
| Changesets | Phase 2+ when there's a second consumer | Not before. |
| Renovate (broader than Dependabot security-only) | Phase 1+ if security-only proves insufficient | Reassess after a few security PRs land. |
| Remote Turborepo cache | Phase 1+ optimization if local cache hit rate disappoints | Not before. |
| CodeQL + supply-chain hardening | Phase 1+ before public adoption push | Defer to public release prep. |
| `apps/docs/` self-hosted Sophie docs | Indefinitely deferred per ADR 0023 | MyST at `docs/website/` continues. |

## 3. Architectural lessons from Phase 0

Inline lessons captured during the build, in the order they emerged:

### 3.1 Vertical-slice-first works (ADR 0023 reconfirmed)

The vertical slice surfaced ADR 0027's per-instance hydration
constraint at step 7. With horizontal builds, the same bug would
have shown up only when the second persistence-bearing component
was added (likely mid-Phase 1) and would have required revising
multiple already-shipped components.

**Phase 1 application:** the *first* new component goes through the
same end-to-end loop (component + Storybook story + axe-core test +
e2e in `drannarosen/astr201`) before the next one starts.

### 3.2 Framework-purity is enforced, not just stated

`@sophie/components` cannot import from `astro:*`, `vite/*`, or
framework-runtime packages. Biome's `noRestrictedImports` makes the
constraint mechanical instead of a code-review checklist item. The
ADR 0027 fix worked because the constraint was already in place;
without it, the temptation to "just import the chapter from
`astro:content` here" would have rotted the boundary.

**Phase 1 application:** when adding new packages, declare
boundaries in Biome immediately, not later.

### 3.3 Test stack as its own step pays off

Step 8 (test stack) was originally bundled into step 5 (components).
Separating it gave Vitest + Playwright + axe-core + Turborepo cache
wiring + coverage room to be designed deliberately. The infrastructure
became reusable across packages without retrofit.

**Phase 1 application:** if a piece of infra serves >1 future package,
it's worth its own step.

### 3.4 Subpath exports + Biome rule = mechanical future split

`@sophie/core` was deliberately built as if it were already three
packages. Subpath exports + Biome rule means the eventual split
(`@sophie/schema`, `@sophie/audit`, `@sophie/cli`) is a packaging
change, not a refactor. No `@sophie/core` consumer reaches into
internal directories directly.

**Phase 1 application:** when starting a package that may split,
declare the split-points in `package.json` exports + Biome rules
from day one.

### 3.5 CI surfaces issues local-only-on-macOS hides

The Phase 0 CI investigation (see §5) revealed that pnpm's hoisted
store on macOS hides Linux-specific module-resolution paths.
Local-green ≠ CI-green. The investigation also revealed the
class-of-issue: build tools bundling build tools when the SSR
externalization rules leak.

**Phase 1 application:** any time a fix only works on the dev
machine, verify on Linux CI before claiming success. Consider a
Linux-based dev container (devcontainer.json) for parity if the
divergence pattern recurs.

## 4. Phase 1 priorities (updated 2026-05-10)

Updated after Phase 1 step 1 shipped (CI fix + branch protection)
and after re-evaluating smoke's role. The original ordering (Linux
CI → drannarosen/astr201 → SCSS port → 2-3 components → Storybook
→ CLA) is preserved below for context, then revised.

**Step 1 (done):** [§5.1 Linux CI build failure resolved](#51-linux-ci-build-job-fails-resolved-2026-05-10).
Branch protection on `main` enforces the full check matrix
(lint, typecheck, unit, build, e2e); see
[§5.2](#52-branch-protection-on-main-deferred).

**Re-evaluation (2026-05-10):** the original plan said
`examples/smoke/` was "throwaway, replaced by `drannarosen/astr201`
in Phase 1." A second look showed smoke's `spoiler-alerts.mdx`
chapter is **1198 lines** of real ASTR 201 content (30 Callouts,
19 Figures, 6 InteractiveCallouts) — a complete vertical slice,
not a fixture stub. Standing up a separate consumer repo before
any new component lands is overhead with no proportional
unblocking. **Smoke becomes the canonical Phase 1 proving ground;
`drannarosen/astr201` standup defers to a triggered task.**

### 4.1 Component build sequence (class-coverage trios)

A survey of `spoiler-alerts.mdx` (catalogued in
[docs/plans/2026-05-10-phase-1-component-trios.md](../../plans/2026-05-10-phase-1-component-trios.md))
surfaces 9 component candidates beyond the Phase 0 trio
(Callout, Figure, InteractiveCallout). Sequenced as three
class-coverage trios so each batch validates a different shape
of the [ADR 0004 contract](../decisions/0004-component-contract-revisions.md)
+ [ADR 0027 hydration pattern](../decisions/0027-mdx-render-boundary-prop-threading.md):

| Trio | Components | Class coverage | SCSS port |
|---|---|---|---|
| **2 (closed)** | `<LearningObjectives>` ✅ · Callout variant expansion (roadmap/summary/key-insight) ✅ · `<Predict>` ✅ | chapter primitive · variant-extension · persistence-bearing | `callouts.scss` variants; Predict no SCSS port (new design) |
| **2.5 (closed)** | Self-assessment family ✅: `<ConfidenceCheck>` · `<ComprehensionGate>` · `<EffortLog>` · `<Reflection>` | self-assessment widgets, all persistence-bearing | Shared `useSelfAssessment` hook prefixes IDB keys with `self-assessment:${widget}:` for Phase 5 dashboard queries |
| **3** | `<CollapsibleCard>` (owns "deep-dive") · `<KeyEquation>` · `<MiniGlossary>` | structural · content · structural | `collapsible-cards.scss`, `glossary.scss` |
| **4** | `<PullQuote>` · `<Equation>` (numbered/captioned KaTeX wrapper) · further Callout variants (`misconception`, `checkpoint`, `prediction`-styled wrapper for `<Predict>`) | content · content · variant-extension | Patterns from `callouts.scss` |

Each component PR carries: contract-conformance test, axe-core
test, e2e test in smoke that renders the actual chapter pattern,
Storybook story (from the third component in Trio 2 onward).
Trio composition is fixed; ordering within a trio is flexible.
Trio 1 in this numbering is the Phase 0 trio
(Callout, Figure, InteractiveCallout) — already shipped.

**Why Predict in the next trio:** it's the only persistence-bearing
component in the 9, so it exercises ADR 0027 a second time.
Phase 0 proved the per-instance hydration pattern for
InteractiveCallout; Predict's shape (form, multi-field state,
gated reveal) is different enough that a second proof point
matters before committing to the rest.

### 4.2 Storybook activates between Trio 2.5 and Trio 3 (2026-05-10)

The original [§4 priority 5](#45-original-ordering-superseded-2026-05-10)
said Storybook lands at the third v1 component. The harness was
deferred through Trio 2 (LearningObjectives, Callout variants,
Predict) and Trio 2.5 (the self-assessment family) because unit +
axe + e2e covered correctness adequately. **Storybook landed
2026-05-10** as a discrete setup PR before Trio 3, with all 9
shipped components getting stories in the same PR (32 stories total,
all axe-clean, visual baselines committed). From Trio 3 onward
every component PR ships with its story by default. See
[ADR 0028](../decisions/0028-storybook-setup.md) for the locked
choices: Storybook 10, co-located stories, `@storybook/react-vite`
builder, Playwright snapshots via `@storybook/test-runner`, real
browser IDB with per-story namespacing.

### 4.3 SCSS port mechanics

Per [ADR 0005](../decisions/0005-theming-three-layers.md)'s
"port not redesign" rule + [ADR 0026](../decisions/0026-tailwind-v4-css-first.md)'s
v4 CSS-first commitment. Done **incrementally per-component**:
each component PR brings its source SCSS file from
`astr101-sp26/assets/theme/` and translates it to a CSS Module
under `packages/components/src/components/<Name>/`. Shared tokens
already live in `@sophie/theme`; component PRs add new tokens
(rare) only when the source SCSS uses one that doesn't exist yet.
Full playbook in
[docs/plans/2026-05-10-phase-1-component-trios.md § SCSS porting playbook](../../plans/2026-05-10-phase-1-component-trios.md#scss-porting-playbook).

### 4.4 Triggered / deferred

- **`drannarosen/astr201` consumer repo standup** — deferred.
  Trigger: smoke outgrows "single chapter" *or* publishing
  pressure (real students using the textbook in fall 2026).
  Until then, smoke is canonical.
- **CLA setup** — triggered task; fires on first non-Anna PR per
  [§6.1](#61-cla-on-first-non-anna-pr).
- **Visual regression** — Phase 1 end / Phase 2.
- **`@sophie/cosmic-playground`** — when first `<Demo>` lands.

### 4.5 Original ordering (superseded 2026-05-10)

For context, the original plan as written before Phase 1 step 1
shipped:

1. Resolve the Linux CI build failure (see §5). ✅ Done 2026-05-10.
2. Stand up `drannarosen/astr201` with a single chapter migrated
   from `astr201-sp26`. → Deferred per §4.4.
3. Port `callouts.scss` + `lecture-cards.scss`. → Replaced by
   incremental per-component port in §4.3.
4. Build the first 2-3 new v1 components against ADR 0027's
   per-instance hydration pattern. → Reshaped as the trio
   sequence in §4.1.
5. Add Storybook when the third component lands. → Reframed as
   "lands with Trio 2 component #3 (Predict)" per §4.2.
6. First non-Anna PR triggers the CLA setup task. → Unchanged;
   see §6.1.

## 5. Known issues

### 5.1 Linux CI build job fails (RESOLVED 2026-05-10)

**Status:** Resolved 2026-05-10 by Phase 1 step 1 (commits
`7ddd4d5` + `b550bb6` on PR #5). All five CI jobs (lint, typecheck,
unit, build, e2e) now green on ubuntu-latest. Branch protection
enablement (§5.2) unblocked.

**Resolution summary** (full trail in
`~/.claude/plans/we-re-starting-sophie-phase-twinkling-dusk.md`
and the PR's commit history):

**Real root cause (Phase 1 finding, deeper than Phase 0 wrote up):**
Astro 6's `pluginInternals` sets `resolve.noExternal: ["astro"]`
on the prerender environment
([astro/dist/core/build/plugins/plugin-internals.js]). This bundles
the *entire* `astro` package into the prerender chunk, which
transitively pulls bare `vite` (from `astro/dist/core/create-vite.js`,
`middleware/vite-plugin.js`, etc.) and bare `esbuild` (from
`client-directive/build.js`, `vite-plugin-import-meta-env.js`) into
the SSR bundle. Those build tools have OS-conditional optional
imports — rollup's `await import('fsevents')` being canonical —
that fail to resolve at *bundle time* on Linux runners (no fsevents).
At *runtime* the same imports are inside try/catch and degrade
gracefully; the bundler can't see the try/catch.

The Phase 0 writeup framed this as "astro:content runtime pulls
Vite's module-runner" — close, but the migration to Content Layer's
glob loader (which `examples/smoke/` was already on) didn't help
because the leak is below the user-facing API boundary.

**Why Phase 0's surface fixes didn't work** (and one bonus
discovery):

1. Externalize `fsevents`/polyfill `__dirname`/etc — fixed each
   error layer but exposed the next; whack-a-mole, not root-cause.
2. Externalize `vite/*` via RegExp on `vite.ssr.external` — Vite's
   `external?: string[] | true` type is honest at runtime; the
   resolver iterates as strings, never as RegExp. The cast bypassed
   the type checker but the runtime ignored the regex entries
   entirely. (Phase 1 confirmed this from Vite 7.3.3 source.)
3. **Ambient `~/node_modules/vite` masked all local-green
   verifications** on Anna's dev machine. A stray `~/package.json`
   from `electron-vite` + `vitest` (likely an accidental `npm
   install` in `$HOME` long ago) created a `vite` install reachable
   via Node ESM's walk-up resolution from any project sub-directory.
   Local builds passed for the wrong reason; Linux runners had no
   such ambient install. **Verification on macOS for build/runtime
   correctness must use Docker (`node:22-bookworm-slim`) until this
   is cleaned up.** Static checks (lint, typecheck, unit) are
   trustworthy.

**The actual fix** (commit `7ddd4d5`):

- `@sophie/astro/src/integration.ts` adds `vite` and `esbuild` (bare
  + subpaths, regex-array form) to `build.rollupOptions.external`,
  preventing them from being bundled when Astro's
  `noExternal: ["astro"]` drags them in transitively.
- `@sophie/astro/package.json` declares `vite` and `esbuild` as
  `peerDependencies` so consumers are warned at install time.
- `examples/smoke/package.json` declares both as `devDependencies`.
  Pnpm symlinks them into `examples/smoke/node_modules/`, making
  the bare specifiers Node-ESM-resolvable from the prerender chunk's
  `dist/.prerender/chunks/` location at runtime.

**Three fix attempts that did NOT work** (preserved in git
history on PR #5 for reference):

1. Commit `61d9ae0` — externalize `[/^vite\//]` (subpaths only).
   Caught the original `vite/internal` case but missed bare `vite`,
   so vite still got bundled and dragged rollup, which dragged
   fsevents. Linux build failed at the rollup-fsevents resolution.
2. Commit `a9633c5` — broaden to `[/^vite($|\/)/, /^esbuild($|\/)/]`.
   Bundled vite/esbuild were now external — but at *runtime* the
   prerender chunk couldn't resolve them from its location because
   neither was in `examples/smoke`'s direct deps and pnpm hadn't
   symlinked them into smoke's `node_modules`.
3. Commit `a035dbb` — surgical override via Vite plugin
   `configResolved` hook to remove `"astro"` from
   `prerenderEnv.resolve.noExternal`. The mutation was observed but
   ignored — Vite 7's resolved environment config is effectively
   immutable post-`configResolved`. CI showed the same fsevents
   error as `61d9ae0`, indicating astro stayed bundled.

The architectural pivot to consumer-declared peerDeps was made
after invoking systematic-debugging's "if 3+ fixes fail, question
architecture" rule.

**Workflow bug fixed alongside** (commit `b550bb6`): the e2e job's
"Build smoke target" step ran `pnpm --filter smoke build`, which
bypasses Turborepo's workspace dependency graph — workspace
packages weren't built first on a fresh runner. This bug had been
silently masked since Phase 0 step 9 because `e2e: needs: build`
meant e2e was skipped on every CI run while the build job kept
failing. Switched to `pnpm exec turbo run build --filter=smoke`.

**Consumer-side DX requirement** (downstream consequence): every
Sophie consumer (now `examples/smoke/`; soon `drannarosen/astr201`;
future textbooks) MUST declare `vite` and `esbuild` in their
`devDependencies` until the upstream `noExternal: ["astro"]` issue
lands a fix. Documented in
[contributing/coding-standards.md](../contributing/coding-standards.md#consumer-side-requirements)
under "Consumer-side requirements" and signaled at install time
via `@sophie/astro`'s peerDependencies.

**Upstream issue:** Filed 2026-05-10 at
[withastro/astro#16679](https://github.com/withastro/astro/issues/16679).
Frame: "is `noExternal: ['astro']` intended to bundle astro's
entire build-time toolchain into static-output prerender bundles?
Could `astro/loaders` etc. lazy-import their vite/esbuild deps?"
Sophie will track upstream response there; if Astro narrows
`noExternal` (option 1) or lazy-imports the build-time deps (option 2),
Sophie can drop the rollup externals + peerDependencies and
consumers can drop the devDeps. GitHub Actions run with chunk
artifacts (preserved):
[run 25630690088](https://github.com/drannarosen/sophie/actions/runs/25630690088).

**Original Phase 0 path inventory (preserved for context):**

The Phase 0 writeup outlined four investigation paths (A: migrate
to content-layer-v2; B: verify RegExp ssr.external; C: pin Astro
5; D: file upstream). Phase 1 entered with B+D hybrid selected,
discovered A was moot (already on Content Layer), discovered B was
structurally impossible (RegExp not in vite's `external` type),
pivoted through three failed attempts, and landed on a fifth path
(consumer-declared peerDeps) that wasn't in the original list.
The original four-path framing was correct in spirit (the right
fix isn't "make the bundler do more work") but missed the actual
mechanism (consumer-side runtime resolution).

### 5.2 Branch protection on `main` deferred

Cannot enforce branch protection until CI build is green; otherwise
no PR could merge. Once §5.1 is resolved:

1. Repo → Settings → Branches → Branch protection rules → Add rule.
2. Branch name pattern: `main`.
3. ✅ Require a pull request before merging.
4. ✅ Require status checks to pass before merging.
5. Required checks: `lint`, `typecheck`, `unit`, `build`, `e2e`.
6. ✅ Require branches to be up to date before merging.
7. ✅ Require linear history.
8. ✅ Do not allow bypassing the above settings.
9. Optional: ✅ Restrict who can push to matching branches → Anna
   only.

This checklist is also embedded in the step-9 commit message
(`Phase 0 step 9: GitHub Actions CI + Dependabot`, commit 4fa9466)
for reference at the moment of action.

### 5.3 `astro check` was silently false-passing pre-Phase-0-step-9

The smoke target's `typecheck` script ran `astro check`, which had
no `@astrojs/check` installed and was prompting interactively in
non-interactive contexts (returning 0). All prior "typecheck green"
results for the smoke target were false passes for the `.astro`
files. Fixed in step 9: `@astrojs/check` added to smoke devDeps;
typecheck now actually exercises 8 `.astro` files (0 errors).

**Lesson generalized:** when a CI job claims success, verify it
actually did the work — exit code 0 isn't sufficient evidence.

## 6. Triggered tasks

These tasks fire on a specific event, not a calendar date:

### 6.1 CLA on first non-Anna PR

**Trigger:** the first PR opened against `drannarosen/sophie` by
anyone other than Anna.

**Action:**

1. Pause the PR. Do not merge.
2. Set up CLA infrastructure. Two options:
   - **DCO-lite (lightweight):** require `Signed-off-by:` in commit
     messages; configure DCO bot
     (<https://probot.github.io/apps/dco/>).
   - **Full CLA via cla-assistant.io** (more rigorous):
     <https://cla-assistant.io/>. CLA text grants Anna a license
     to relicense future versions, preserving dual-licensing
     optionality per [ADR 0024](../decisions/0024-license-agpl.md).
3. Require CLA sign-off as a status check on all PRs (add to branch
   protection from §5.2).
4. Resume the PR after CLA signed.

Documented in [ADR 0024](../decisions/0024-license-agpl.md)
§ Consequences.

### 6.2 First non-trivial dependency security advisory

**Trigger:** Dependabot opens a security PR that touches anything
beyond a transitive utility (e.g., affects `@sophie/components`,
`@sophie/astro`, or astro/vite themselves).

**Action:**

1. Verify the advisory is real (sometimes Dependabot fires on
   advisories that don't apply).
2. Bump locally; run full test suite + e2e.
3. If Phase 1 is mid-flight on a feature branch, merge the security
   bump to main first, then rebase the feature branch.

### 6.3 First component that needs `<Demo>` integration

**Trigger:** the first chapter where a Cosmic Playground demo would
land.

**Action:** spin up `@sophie/cosmic-playground` per
[ADR 0008](../decisions/0008-cosmic-playground-protocol.md). Don't
start it earlier — the protocol is designed but the first real
demo will reveal whether the design holds.

## See also

- [Roadmap](./roadmap.md) — full phase calendar.
- [ADR 0023](../decisions/0023-vertical-slice-build-order.md) — build order.
- [ADR 0024](../decisions/0024-license-agpl.md) — license + CLA trigger.
- [ADR 0025](../decisions/0025-phase-0-actual-scope.md) — Phase 0
  ten-step decomposition.
- [ADR 0026](../decisions/0026-tailwind-v4-css-first.md) — Tailwind v4.
- [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md) —
  per-instance hydration for persistence-bearing MDX components.
- Parent Phase 0 plan:
  [`~/.claude/plans/read-all-of-the-sharded-sky.md`](file:///Users/anna/.claude/plans/read-all-of-the-sharded-sky.md).
