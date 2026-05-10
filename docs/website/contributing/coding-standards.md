---
title: Coding standards
short_title: Coding standards
description: Conventions for code in @sophie/* packages — TypeScript, React, CSS, tests, commits.
tags: [contributing, coding, typescript, conventions]
---

# Coding standards

:::{important} Status: tooling-locked; rest fills in during Phase 0
The tool commitments below are locked (ADRs 0011–0015). The rest of
this page sketches conventions that become substantive when Sophie's
platform repo is initialized in Phase 0. The repo's `CONTRIBUTING.md`
will be the authority once it lands.
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

## React

- **Function components** with hooks. Class components only when a
  third-party API requires.
- **Framework-pure**: components in `@sophie/components` import only
  React, Zod, and from other `@sophie/*` packages — never from
  `astro:*`. See [ADR 0001](../decisions/0001-platform-not-monorepo.md).
- **Per-component CSS Modules**, scoped, referencing CSS custom
  properties from `@sophie/theme`. See
  [ADR 0005](../decisions/0005-theming-three-layers.md).
- **`useInteractive` for persistence** — never touch IndexedDB
  directly. See
  [ADR 0004](../decisions/0004-component-contract-revisions.md).

## Tests

- **Storybook stories** for every component, all render modes the
  component supports.
- **Vitest** for unit tests; colocated as `<Name>.test.ts`.
- **axe-core** integrated into Storybook + Playwright. **Non-
  negotiable** for any component PR.
- **Playwright** for end-to-end against `apps/example-textbook/`.
- **Visual regression** via Chromatic or Playwright screenshots.

Tests are not optional. A component without an axe-core test does
not ship.

## CSS

- **CSS Modules** for component styles; `<Name>.module.css`.
- **CSS custom properties** for theming, never hardcoded values.
- **Per-component token namespacing**: `--color-prediction-*`,
  `--space-prediction-*`. See
  [ADR 0005](../decisions/0005-theming-three-layers.md).
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

- **Pin major versions.** Minor and patch updates via Renovate or
  Dependabot. Major updates are scheduled work.
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
