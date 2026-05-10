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
- ⚠️ CI build job currently fails on Linux runners (see
  [§5 Known issues](#5-known-issues)).
- ⚠️ Branch protection on `main`: deferred until CI build is green.

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
| Storybook (around the third v1 component when isolation pays off) | Medium — Phase 1 week 3+ | Don't add until 2–3 components share enough props/composition that Storybook's overhead is justified. |
| Visual regression (Chromatic or Playwright screenshots) | Low — Phase 1 end | Once the design system is stable. |
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

## 4. Phase 1 first-week priorities

Sequenced for max-information-first; reorder when the actual Phase 1
plan-mode work happens:

1. **Resolve the Linux CI build failure** (see §5). Without this,
   Phase 1 PRs can't be CI-gated and branch protection can't be
   enforced. Estimated 0.5–2 days depending on which fix path is
   chosen (full root cause vs migrate-to-content-layer-v2 vs pin
   astro to a version that doesn't have the issue).

2. **Stand up `drannarosen/astr201`** with a single chapter migrated
   from `astr201-sp26`. This replaces `examples/smoke/` as the
   proving ground. Pick a well-bounded chapter (recommend
   `flux-luminosity-distance`).

3. **Port `callouts.scss` + `lecture-cards.scss`** to
   `@sophie/components` CSS Modules + tokens. These are the two
   most-used in existing courses; porting them validates the v4
   `@theme` flow under real usage.

4. **Build the first 2–3 new v1 components** against ADR 0027's
   per-instance hydration pattern. Each gets the full vertical-slice
   loop (component + tests + e2e in the consumer repo).

5. **Add Storybook** when the third component lands and the props/
   composition repetition justifies isolation.

6. **First non-Anna PR triggers the CLA setup task** (see §6).

## 5. Known issues

### 5.1 Linux CI build job fails (high priority)

**Symptom:** The `build` job in `.github/workflows/ci.yml` fails on
ubuntu-latest runners with a chain of errors during astro's
prerender phase. Lint, typecheck, and unit jobs pass; e2e is
skipped because it depends on build.

**Root cause (traced in Phase 0):** Astro 6's `astro:content` runtime
pulls Vite's module-runner into the prerender chunk. On macOS
(Anna's dev machine), `fsevents` resolves and a different code path
is taken; on Linux, the cold path drags rollup's `dist/native.js`
(a CJS module that uses `__dirname`) into the bundle. Subsequent
errors ripple from there.

**Surface fixes attempted in Phase 0 step 10 (and reverted):**

1. Externalize `fsevents` — past resolve-time error, exposed layer 2.
2. Polyfill `__dirname`/`__filename`/`require` in SSR ESM chunks via
   Vite banner — past `__dirname is not defined` and `require is
   not defined`, exposed layer 3.
3. `commonjsOptions.ignoreDynamicRequires: true` — past the
   commonjs shim refusal, exposed layer 4.
4. Externalize `vite/*` via regex — had no observable effect (the
   regex did not flow through Vite's TS-typed-as-string-array
   `ssr.external` in this position).

The four fixes formed a "build tools bundling build tools" pattern.
The right fix is "don't bundle Vite", not "make Vite work when
bundled". All four commits were reverted to keep the codebase
honest. The artifact-capture investigation chunks are preserved in
the GitHub Actions run history (run 25630690088) and the relevant
CI commit messages.

**Phase 1 paths to investigate:**

- **Migrate `examples/smoke/` (and the eventual `drannarosen/astr201`)
  to Astro's content-layer-v2 API** if it exists / is stable.
  The legacy collections runtime is what pulls in Vite's
  module-runner. The newer pattern may not.
- **Verify the cast-vs-runtime question for `vite.ssr.external`
  RegExp.** If Vite's runtime resolver actually does honor RegExp
  in `ssr.external`, the cast was right and the fix is legitimate;
  test in isolation against a minimal repro.
- **Pin Astro to a version where the issue doesn't reproduce.**
  Astro 5 used a different content-layer architecture; downgrade
  may dodge the issue at the cost of features.
- **File an upstream issue against astro/vite** with the artifact-
  captured chunk evidence. The community may have a known
  workaround or fix-in-flight.
- **Adopt a Linux-based dev container** so the divergence pattern
  is caught before CI, not after. Devcontainer config + VSCode
  remote/codespaces support.

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
