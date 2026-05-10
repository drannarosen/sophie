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

## Tests

- **Vitest** for unit tests; colocated as `<Name>.test.ts(x)`.
- **axe-core** required for every component (via `jest-axe` in jsdom
  Vitest, or `@axe-core/playwright` for e2e). **Non-negotiable** for
  any component PR.
- **Playwright** for end-to-end against `examples/smoke/` (the
  Phase 0 smoke target; replaced by `drannarosen/astr201` in Phase 1).
- **Storybook** is Phase 1+ (added around the third v1 component when
  isolation pays off).
- **Visual regression** is Phase 1+ (once the design system is stable).

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
- **Storybook stories updated** if a component's surface changed.

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
