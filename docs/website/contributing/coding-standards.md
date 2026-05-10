---
title: Coding standards
short_title: Coding standards
description: Conventions for code in @sophie/* packages — TypeScript, React, CSS, tests, commits.
tags: [contributing, coding, typescript, conventions]
---

# Coding standards

:::{important} Status: Phase 0 shipped (2026-05-10)
Tool commitments are locked (ADRs 0011–0015). Code-level
conventions below describe the actual Phase 0 codebase. The
"Internal package boundaries" and "Framework-purity"
sections were added at end of Phase 0 to codify constraints
the codebase already enforces; deviations are bugs.
:::

## Tool commitments

Locked decisions; see linked ADRs for rationale. **Diverging from
these without a superseding ADR is a bug.**

- **Package manager: `pnpm`.** Never use `npm` or `yarn` in a Sophie
  repo. They bypass the strict-dependency hygiene that protects the
  public API surface. See
  [ADR 0011](../decisions/0011-pnpm-package-manager.md).
- **Lint + format: Biome.** Format with `pnpm biome format --write`;
  lint with `pnpm biome check`. Pre-commit hook (Lefthook) runs
  Biome on staged files automatically. CI blocks merges on Biome
  violations. See
  [ADR 0013](../decisions/0013-biome-lint-format.md).
- **Monorepo task orchestration: Turborepo.** Run package tasks via
  `pnpm turbo run <task> --filter=<package>`. Filters use Turborepo
  syntax: `@sophie/components` (just that package),
  `@sophie/components...` (the package + its dependents),
  `...{HEAD}` (only what changed in HEAD). See
  [ADR 0014](../decisions/0014-turborepo-monorepo-orchestration.md).
- **Python utilities: `uv`.** Any Python script (figure generation,
  Manim, CI helpers) runs under `uv run python <script>.py`. No
  `pip install`, no `poetry`, no system Python. See
  [ADR 0012](../decisions/0012-uv-python-tooling.md).
- **Local dev preview: `pnpm sophie dev`.** The day-to-day editing
  loop — `astro dev` HMR + `@sophie/audit --watch` + profile
  switching. For component-level work: Storybook (`pnpm storybook`).
  For AI-driven browser checks: Playwright MCP. See
  [ADR 0015](../decisions/0015-dev-preview-workflow.md) and
  [reference/cli.md](../reference/cli.md).

## TypeScript

- **Strict mode** enabled (`"strict": true`).
- **No implicit `any`**.
- **Schemas inferred via `z.infer`**, not duplicated as hand-written
  interfaces. See [ADR 0003](../decisions/0003-zod-as-source-of-truth.md).
- **Stability tags** on every export: `@stable` / `@experimental` /
  `@internal`. See [Plugin API](../reference/plugin-api.md).
- **Avoid `any` and `unknown` casts** where a more specific type can
  be expressed.

## Internal package boundaries

- **`@sophie/core` uses subpath exports.** The `package.json`
  `exports` field declares `.`, `./schema`, and `./audit` as the
  only public entry points. Direct relative imports between those
  internal directories are forbidden by Biome's
  `noRestrictedImports` rule (see `packages/core/biome.json`). This
  keeps the eventual split into `@sophie/schema`, `@sophie/audit`,
  and `@sophie/cli` mechanical: every cross-directory consumer
  already goes through a published subpath.
- **`@sophie/components` framework-purity rule.** Components in
  `@sophie/components` may import only from React, Zod, and other
  `@sophie/*` packages. **No imports from `astro:*`, `vite/*`, or
  any framework-runtime package.** Enforced by Biome's
  `noRestrictedImports` rule
  (see `packages/components/biome.json`). Rationale: components
  must be drop-in usable by any future renderer (per ADR 0001 +
  ADR 0023's deferred `@sophie/renderer-contract`); coupling to
  Astro internals would lock that door.
- **Astro coupling lives only in `@sophie/astro`.** That package is
  the *single* place in the monorepo that may import from
  `astro:*`. Per ADR 0027, persistence-bearing components rendered
  via MDX receive their chapter context as **props**, threaded by
  the `<SophieChapter>` adapter — components don't pull from any
  Astro context directly.

## React

- **Function components** with hooks. Class components only when a
  third-party API requires.
- **Per-component CSS Modules**, scoped, referencing CSS custom
  properties from `@sophie/theme`. See
  [ADR 0005](../decisions/0005-theming-three-layers.md) and
  [ADR 0026](../decisions/0026-tailwind-v4-css-first.md).
- **`useInteractive` for persistence** — never touch IndexedDB
  directly. See
  [ADR 0004](../decisions/0004-component-contract-revisions.md) and
  [ADR 0007](../decisions/0007-persistence-indexeddb.md).
- **Per-instance hydration for persistence-bearing MDX components.**
  When a persistence-bearing component is used inside MDX, the
  author imports the *interactive* variant directly and applies
  `client:load` per usage. The MDX `components={...}` map cannot
  carry hydration metadata. See
  [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md).

### Persistence-bearing controls MUST spread `controlProps`

Any `<input>`, `<button>`, or other interactive control whose state
comes from a `useInteractive` value MUST spread the hook's
`controlProps` onto the element:

```tsx
const { value, setValue, controlProps } = useInteractive(
  course, chapter, key, false
);
return (
  <input
    type='checkbox'
    checked={value}
    {...controlProps}                            // ← required
    onChange={(e) => setValue(e.target.checked)}
  />
);
```

`controlProps` sets `disabled` and `aria-busy` to `true` while
`useInteractive` is loading from IndexedDB, then to `false` once
hydration completes. Without it, a click landing between mount and
IDB-fetch resolution gets silently overwritten by the fetch's
`setLocalValue(persisted ?? initial)` — the user's interaction
disappears.

**Prefer `<InteractiveCheckbox>`** for the simple checkbox + label
case; it embeds the spread automatically:

```tsx
<InteractiveCheckbox course='astr201' chapter='ch1' id='goal-1'>
  Mark as understood
</InteractiveCheckbox>
```

Custom interactive controls (form inputs, multi-state widgets,
button groups) compose `useInteractive` directly and spread
`controlProps` themselves.

Surfaced 2026-05-10 during Trio 2 implementation
([docs/plans/2026-05-10-phase-1-component-trios.md § Lessons
surfaced during Trio 2](../../plans/2026-05-10-phase-1-component-trios.md#lessons-surfaced-during-trio-2-learningobjectives)).
Pattern is non-optional; new persistence-bearing controls without
the spread are bugs.

## Tests

- **Vitest** for unit tests; colocated as `<Name>.test.ts(x)`.
- **axe-core** required for every component (via `jest-axe` in jsdom
  Vitest, or `@axe-core/playwright` for e2e). **Non-negotiable** for
  any component PR.
- **Playwright** for end-to-end against `examples/smoke/` (the
  Phase 0 smoke target; replaced by `drannarosen/astr201` in Phase 1).
- **Storybook** is **required for every component PR** (since
  2026-05-10, Phase 1). Every component has at least one story under
  `<Name>.stories.tsx` colocated with the component. Persistence-bearing
  stories namespace via unique `course="storybook"` /
  `chapter="<componentname>"` / `id="<storyname>"` args so cross-story
  IDB state cannot leak. See
  [ADR 0028](../decisions/0028-storybook-setup.md).
- **Visual regression** runs in CI via `@storybook/test-runner` +
  `axe-playwright` + `jest-image-snapshot`. Baselines committed under
  `packages/components/__snapshots__/`. Threshold is 1% pixel diff
  (tightening as we observe real diff levels). Intentional UI changes
  require updating baselines (`pnpm test:storybook --updateSnapshot`).

Tests are not optional. A component without an axe-core test does
not ship.

## CSS

- **CSS Modules** for component styles; `<Name>.module.css`.
- **CSS custom properties** for theming, never hardcoded values.
  Theme tokens flow from `@sophie/theme`'s TS source via Tailwind v4
  CSS-first `@theme` directive (no preset/config file). See
  [ADR 0005](../decisions/0005-theming-three-layers.md) and
  [ADR 0026](../decisions/0026-tailwind-v4-css-first.md).
- **Per-component token namespacing**: `--color-prediction-*`,
  `--space-prediction-*`.
- **Logical properties** where appropriate
  (`margin-inline-start`, not `margin-left`) — light insurance for
  future i18n.
- **`prefers-reduced-motion`** honored in any animation.
- **Color contrast WCAG AA** verified via axe.

## Commit messages

Follow Conventional Commits:

```text
feat(components): add <Premortem> component
fix(audit): correct cadence calculation for Predictions
docs(adr): add ADR 0011: <title>
chore(deps): bump astro from 5.x to 5.y
test(prediction): add axe-core checks for confidence slider
refactor(theme): extract focus-ring tokens
```

Categories: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`,
`perf`, `style`, `build`, `ci`.

## PRs

- **Title in conventional-commit format.**
- **Body links to relevant ADR(s)** if the PR implements an
  architectural decision.
- **Changeset attached** for any package change. See
  [Changelog](../status/changelog.md) for SemVer policy.
- **Tests added or updated.**
- **Storybook stories updated** to cover the new component / new
  variant / new state. New components must ship with a story; visual
  baselines under `__snapshots__/` are reviewed for intentional drift.

## Code review

- **Substantive review.** "lgtm" without engaging the alternatives is
  not a review.
- **Verify tests cover the change.**
- **Check accessibility.** axe-core is necessary but not sufficient —
  reviewer should think about keyboard, screen reader, and motor
  affordances.
- **Check the public-API impact.** Touching a `@stable` export
  requires a major bump and an ADR.

## Naming

- **TypeScript**: `PascalCase` for types and React components;
  `camelCase` for variables, functions, props.
- **Files**: `kebab-case` for non-components (`audit-runner.ts`);
  `PascalCase` for component files (`Prediction.tsx`).
- **CSS classes**: `camelCase` (CSS Modules convention).
- **CSS custom properties**: `--kebab-case` with namespace prefix
  (`--color-prediction-bg`).

## Dependencies

- **Pin major versions.** Minor and patch updates via Dependabot
  (security-only in Phase 0; broader once contributors arrive).
  Major updates are scheduled work.
- **Prefer batteries-included frameworks** (Astro integrations) over
  ad-hoc plumbing.
- **Avoid runtime dependencies in the schema package.** Zod is the
  only runtime dep `@sophie/schema` needs.
- **Bundle size in `@sophie/components`** matters; the platform
  ships to browsers. Aim for tree-shakable exports.

## Consumer-side requirements

Sophie consumer repos (e.g. `examples/smoke/`, `drannarosen/astr201`,
future textbooks) depending on `@sophie/astro` MUST declare the
following in their `devDependencies`:

```json
{
  "devDependencies": {
    "vite": "^7.3.0",
    "esbuild": "^0.27.0"
  }
}
```

**Why.** Astro 6 sets `resolve.noExternal: ["astro"]` on the
prerender environment, which bundles all of `astro` into the SSR
chunk. Astro itself imports bare `vite` and `esbuild` from internal
modules. Bundling those build tools fails on Linux runners
(rollup's optional `fsevents` import can't resolve at bundle time).

`@sophie/astro` works around this by externalizing `vite` and
`esbuild` at the rollup level — but the prerender chunk then needs
to resolve those bare specifiers at *runtime* via Node ESM. Pnpm's
strict node_modules layout only symlinks a package into a
consumer's `node_modules/` if that consumer declares it directly,
so consumers must carry the devDeps even though `@sophie/astro` is
the package that actually uses them. `@sophie/astro` declares both
as `peerDependencies` so pnpm warns at install time if missing.

**When this requirement goes away.** The `noExternal: ["astro"]`
mechanism is too coarse for static-output SSG. Upstream issue
filed at [withastro/astro#16679](https://github.com/withastro/astro/issues/16679)
requesting Astro narrow it to runtime entry points only; once
landed, `@sophie/astro` can drop the rollup externals +
peerDependencies and consumers can drop the devDeps. Until then,
treat this as a load-bearing requirement.

See [phase-1-plan.md §5.1](../status/phase-1-plan.md#51-linux-ci-build-job-fails-resolved-2026-05-10)
for the full debugging trail and architectural rationale.

## See also

- [ADR 0001](../decisions/0001-platform-not-monorepo.md) — public
  API discipline.
- [ADR 0004](../decisions/0004-component-contract-revisions.md) —
  contract revisions including `useInteractive`.
- [ADR 0011](../decisions/0011-pnpm-package-manager.md) — pnpm.
- [ADR 0012](../decisions/0012-uv-python-tooling.md) — uv.
- [ADR 0013](../decisions/0013-biome-lint-format.md) — Biome.
- [ADR 0014](../decisions/0014-turborepo-monorepo-orchestration.md) — Turborepo.
- [ADR 0015](../decisions/0015-dev-preview-workflow.md) — dev preview workflow.
- [Plugin API stability tiers](../reference/plugin-api.md).
- [Component contract](../reference/component-contract.md) — every
  component fills in this contract.
