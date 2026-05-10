---
status: accepted
date: 2026-05-10
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [tooling, storybook, dx, testing, visual-regression]
---

# ADR 0028: Storybook setup — location, builder, and visual regression

## Context

[ADR 0015](0015-dev-preview-workflow.md) named Storybook as Sophie's
component-isolation surface (Layer 2 of the three-layer dev workflow)
and pegged it at "Phase 0, around the third v1 component." It explicitly
left three choices open:

1. **Where Storybook lives** in the monorepo.
2. **Which builder** (Webpack vs Vite — though the rest of the toolchain
   is Vite-aligned via Astro 6 and Vitest).
3. **Visual regression strategy** ("Chromatic OR Playwright screenshots").

Storybook was deferred through Trio 2 and Trio 2.5 (PRs #7–#11) because
unit + axe-core (jest-axe) + Playwright e2e covered correctness
adequately. By 2026-05-10, with 9 components shipped and no Storybook,
[`docs/website/contributing/coding-standards.md` § Storybook](../contributing/coding-standards.md)
was outrunning reality. Trio 3 was the agreed trigger to set it up so
new components get stories from day one rather than retrofit.

A fourth open question surfaced at setup time: **how to run IndexedDB
in Storybook** for the 7 of 9 components that hit `useInteractive` /
`useSelfAssessment`. Stories must demonstrate hydration behavior
(including the `controlProps` disabled-while-loading guard from
[coding-standards.md § Persistence-bearing controls](../contributing/coding-standards.md))
without leaking state between stories.

## Decision

1. **Stories co-locate with components** in `packages/components/src/components/<Name>/<Name>.stories.tsx`. Storybook config in `packages/components/.storybook/`.
2. **Builder is `@storybook/react-vite`** (Vite-aligned, matches Vitest and Astro).
3. **Visual regression is Playwright snapshots via `@storybook/test-runner`** (with `axe-playwright` + `jest-image-snapshot`). Baselines under `packages/components/__snapshots__/` are committed.
4. **IndexedDB persistence in stories uses real browser IDB with per-story namespacing** — every persistence-bearing story passes unique `course="storybook"`, `chapter="<componentname>"`, `id="<storyname>"` args.
5. **Storybook 10.3.6** (current `latest` dist-tag) — not the still-maintained 9.x line.

## Rationale

**Co-location over centralized.** Stories sit next to the unit-test
file (`Foo.test.tsx`) and the component (`Foo.tsx`); one directory per
component is the established Sophie pattern. Distance kills story
maintenance — a separate `apps/storybook` package would put stories
out of sight from the component author.

**Vite over Webpack.** Sophie's toolchain is already Vite throughout
(Astro 6 dev server, Vitest, smoke). Picking Vite for Storybook gives
HMR parity, shared resolution rules, and one mental model. The
`packages/components/.storybook/main.ts` `viteFinal` block adds one
critical alias — `^(.+)\.module\.css\.js$` → `$1.module.css` — that
mirrors `vitest.config.ts`. Without it, every story would fail to
import its component (which references the tsup-emitted ESM CSS
companion).

**Playwright snapshots over Chromatic.** Chromatic has better DX
(GitHub App, UI baseline approval), but it adds a paid third-party
service and a GH App not currently in Sophie's posture. Playwright
test-runner reuses the already-installed Playwright binaries and
produces in-tree baselines that ship with the repo — closer to the
Sophie norm of "verifiable in PRs without external surfaces."
Threshold starts generous (1% pixel diff) and tightens once we observe
real CI/local diff levels.

**Storybook 10 over 9.** v10 is the `latest` dist-tag with React 19
support and the consolidated-essentials package layout. v9 is still
maintained but planning a migration is "what's simple now causing more
work later" — matches Anna's standing preference (build the best now).

**Real IDB over fake-indexeddb.** Storybook runs in a real browser,
where IDB exists. `fake-indexeddb` is a Node shim; using it in-browser
either replaces real IDB globally (breaks parity with production) or
wraps in a provider (adds an indirection layer not present in real
chapter renders). Per-story namespacing prevents cross-story leakage
structurally — unique `course/chapter/id` args mean two stories of the
same component never read each other's keys. This also keeps the
hydration race that `controlProps` exists to handle demonstrable in
Storybook (axe-while-developing checks the disabled-busy state).

## Implementation notes

- **Addons installed**: `@storybook/addon-a11y@^10` (axe-core in dev
  UI), `@storybook/addon-themes@^10` (light/dark toggle via
  `data-theme`). The pre-9 `@storybook/addon-essentials` is
  deliberately not installed — its features (actions, viewport,
  backgrounds, highlight, measure, outline) consolidated into
  `storybook` core in 9+ and are auto-included.
- **CI orchestration**: `pnpm exec turbo run build-storybook
  --filter=@sophie/components` produces `storybook-static/` (cached
  by Turbo); CI then `npx http-server`s it on port 6006 and runs
  `pnpm test:storybook` (which is `test-storybook --url
  http://127.0.0.1:6006`). Mirrors the e2e job's build-then-serve
  pattern.
- **`pnpm-workspace.yaml allowBuilds`** updated to allow `@swc/core`
  (Storybook's React compiler) and `unrs-resolver` (Rust module
  resolver). Both are well-trusted upstream packages with the same
  trust model as the already-allowed `esbuild`/`sharp`.

## Alternatives considered

- **Centralized `apps/storybook` package.** Pros: clean dependency
  isolation; can ship Storybook as a deployable. Cons: distance from
  component code; one more workspace to maintain; redundant given the
  framework-pure constraint of `@sophie/components` (ADR 0001) means
  there's nothing else to consolidate. Rejected.

- **Webpack 5 builder.** Pros: more mature ecosystem. Cons: divergence
  from Sophie's Vite-everywhere toolchain; second build pipeline to
  maintain; Webpack-specific addon quirks. Rejected.

- **Chromatic SaaS visual regression.** Pros: best-in-class diff UI;
  PR comment integration; team-collaboration baseline approval. Cons:
  paid service; GitHub App; AGPL-license eligibility check needed;
  external dependency for a feature that in-tree solves. Rejected for
  Phase 1; revisitable if maintaining in-tree baselines becomes
  painful at scale.

- **`fake-indexeddb` shim in preview.** Pros: matches Vitest test
  environment exactly. Cons: requires browser-bundling a Node shim;
  hides the real-browser hydration behavior the components ship
  against; doesn't actually solve cross-story leak (still need
  per-story namespacing for that). Rejected.

- **Stub `useInteractive` in a Storybook decorator.** Pros: tightest
  isolation from real persistence. Cons: hides the entire
  `useInteractive` contract Storybook is meant to demonstrate; defeats
  axe-while-developing of the disabled-while-loading state. Rejected.

- **Storybook 9.x.** Pros: more battle-tested. Cons: planned major
  upgrade later; the 9→10 migration is the kind of "simple now,
  expensive later" trap Sophie's HITL working style explicitly avoids.
  Rejected.

- **Amend ADR 0015 with implementation details.** ADR 0015 is dated
  2026-05-09 and accepted; the new decisions resolve explicitly-open
  questions in it. Sophie's ADR practice is new-ADR-per-new-decision
  (e.g., 0026 didn't amend 0005). New ADR preserves the audit trail.
  Rejected.

## Consequences

**Easier:**

- Component PRs ship with stories; Storybook is the gate for "does
  this render correctly in isolation."
- Visual regression catches theme-token drift, CSS Module name
  collisions, and Tailwind purge surprises that unit + axe miss.
- AI tools (per ADR 0015 Layer 3) can drive Storybook via Playwright
  MCP for component-level verification.
- Real-browser IDB in stories means the hydration race is
  demonstrable, not hidden behind a shim.

**Harder:**

- Story files become a per-component artifact every PR maintains
  (matches coding-standards.md update shipping with this PR).
- Visual baselines need conscious approval when intentional UI
  changes happen — flip side of catching unintentional changes.
- CI job count goes from 5 to 6.
- Pre-existing pnpm 11 quirks now affect Sophie: tslib was missing
  from `node_modules` after the dep install (corrupted state — see
  Triggers below), needing `rm -rf node_modules && pnpm install` to
  recover. Document this for future major dep batches.

**Triggers:**

- `docs/website/contributing/coding-standards.md` § Storybook:
  updated from "Phase 1+ (added around the third v1 component)" to
  "required for every component PR."
- `docs/website/status/phase-1-plan.md`: Storybook setup marked
  complete; Trio 3 components ship with stories from PR-1.
- `pnpm-workspace.yaml`: `allowBuilds` for `@swc/core` and
  `unrs-resolver` flipped from placeholder strings to `true`.
- `.gitignore`: ignores `storybook-static/` (build output) and
  `__diff_output__/` (jest-image-snapshot diffs on failure). Baselines
  under `__snapshots__/` ARE committed.
- **Known gotcha for future major dep batches**: pnpm 11 may write
  the lockfile correctly but miss writing some transitive-dep links
  to disk. Symptom: `Cannot find module 'X'` from a deeply transitive
  package. Fix: `rm -rf node_modules && pnpm install`. (`pnpm install
  --force` is not sufficient.) Surface this in
  `coding-standards.md` § Tooling notes if it recurs.

## References

- [ADR 0015](0015-dev-preview-workflow.md) — parent: dev-preview workflow.
- [ADR 0001](0001-platform-not-monorepo.md) — framework-pure components are what makes Storybook possible without an Astro stub layer.
- [ADR 0005](0005-theming-three-layers.md) — TS tokens + CSS variables + CSS Modules; preview.tsx loads `@sophie/theme/css`.
- [ADR 0007](0007-persistence-indexeddb.md) — IndexedDB persistence; the contract Storybook must demonstrate without leaking.
- [ADR 0026](0026-tailwind-v4-css-first.md) — Tailwind v4 `@theme` directive (preview imports the CSS variable layer, skips the Tailwind-utility layer since components use CSS Modules).
- [`packages/components/.storybook/main.ts`](https://github.com/drannarosen/sophie/blob/main/packages/components/.storybook/main.ts) — the `.module.css.js` Vite alias is the single load-bearing rule.
- [Storybook 10 release notes](https://storybook.js.org/blog/storybook-10/).
- [`@storybook/test-runner` test-hook API](https://storybook.js.org/docs/writing-tests/integrations/test-runner#test-hook-api).
