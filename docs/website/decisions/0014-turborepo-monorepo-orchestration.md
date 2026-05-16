---
date: 2026-05-09T00:00:00.000Z
tags:
  - tooling
  - monorepo
  - ci
  - build
  - turborepo
validation:
  status: validated
  last_validated_date: 2026-05-16
  evidence:
    - kind: manual
      ref: turbo.json
      date: 2026-05-16
      notes: "Turbo pipeline defines build/test/typecheck tasks with dependsOn graph; all CI verification runs `pnpm turbo run <task>`."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: 2026-05-15
      notes: "Turbo task graph + cache held under bucket B+C work."
  notes: "Turborepo orchestrates 5+ packages cleanly. Open follow-up (PR #50 review I1) tracks docs/website/ workspace-promotion + turbo dependsOn for the validation-admonition plugin's dist/ import."
---

# ADR 0014: Turborepo for monorepo task orchestration

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's platform repo (per [ADR 0001](0001-platform-not-monorepo.md))
contains 8+ packages plus dogfood apps and templates. Without
orchestration, every CI run rebuilds, re-lints, and re-tests every
package — even packages with zero changes.

Concretely, a typical CI run touches:

- `pnpm build` across `@sophie/schema`, `@sophie/components`,
  `@sophie/theme`, `@sophie/audit`, `@sophie/cli`,
  `@sophie/renderer-contract`, `@sophie/astro`,
  `@sophie/cosmic-playground`.
- `pnpm test` (Vitest) across the same packages.
- `pnpm storybook:build` for component visual regression.
- `pnpm test:e2e` (Playwright) against `apps/example-textbook/`.
- `pnpm sophie audit` for the example textbook.

Without caching, this is 5–10 minutes of redundant work per push.
With caching keyed on content hashes, only stale packages rebuild.

## Decision

**Turborepo** is the task orchestrator for Sophie's monorepo.
Configuration in `turbo.json`. Caching is local-only in v1;
remote caching deferred until CI volume justifies it (see Open
Items).

## Rationale

- **Content-hash caching.** Turborepo hashes inputs (source files,
  dependencies, env vars) and skips a task if the hash matches a
  prior successful run. Subsequent CI runs that touch only one
  package's source skip the rest — typical 70–90% time savings.
- **Parallel execution.** `turbo run build` runs builds for
  packages in parallel, respecting the dependency graph
  (`@sophie/components` waits for `@sophie/schema`, etc.).
- **Filter syntax.** `turbo run build --filter=@sophie/astro...`
  builds only that package and its dependencies; `--filter=...{HEAD}`
  builds only what changed in the latest commit.
- **Free remote-cache option.** Turborepo's free Vercel tier
  supports remote caching; alternatively self-hosted via
  `@turbo/remote-cache-go`. Defer to v2.
- **Ecosystem alignment.** Astro, Vite, and many React-ecosystem
  monorepos use Turborepo; tooling examples and integrations are
  abundant.
- **Lighter than Nx.** Less mental model, less config; Sophie's
  monorepo is small enough that Nx's additional power isn't
  justified.

## Alternatives considered

- **Nx**. Pros: more powerful (project graph, code generators,
  affected analysis). Cons: heavier mental model; more
  configuration; opinionated project structure that conflicts
  with pnpm workspaces in subtle ways. Rejected — overkill for
  Sophie's scale; Astro & Vue chose Turborepo for similar
  reasons.
- **Raw pnpm scripts** (no orchestrator). Pros: simplest. Cons:
  no caching; no parallelism beyond what pnpm provides; no
  affected-package detection. Rejected — the cache savings are
  significant and grow with the repo.
- **Lerna**. Largely superseded by pnpm + Turborepo / Changesets.
  Rejected.
- **Rush**. Microsoft's enterprise-grade monorepo tool. Powerful
  but heavyweight. Overkill. Rejected.
- **Buck2 / Bazel**. Hyperscale build systems. Massive overkill
  for an 8-package monorepo. Rejected.

## Consequences

**Easier:**

- CI completes in ~1–2 minutes for changes touching one package
  (vs. 5–10 minutes without caching).
- Local development: `pnpm turbo run test --filter=@sophie/components`
  runs only what's needed.
- Predictable parallelism within the dependency graph.

**Harder:**

- One additional config file (`turbo.json`) to maintain and review.
- Cache invalidation occasionally surprises (e.g., env-var
  changes that should have been declared as `globalEnv`); fixed by
  good defaults and documented in
  [contributing/coding-standards.md](../contributing/coding-standards.md).
- Adds a step to onboarding ("install Turborepo: `pnpm add -Dw
  turbo`"); mitigated by `corepack`-style version pinning in
  `package.json`.

**Triggers:**

- `turbo.json` at the platform repo root declares pipelines:
  `build`, `lint`, `test`, `test:e2e`, `storybook:build`,
  `sophie:audit`.
- Each `package.json` in a workspace declares which inputs/outputs
  matter for caching.
- CI uses `pnpm turbo run <task>` instead of `pnpm <task>`.
- Local: contributors run `pnpm turbo run dev` for the docs/example;
  Turborepo handles the parallel processes.
- Documentation in
  [contributing/coding-standards.md](../contributing/coding-standards.md)
  explains the filter syntax for common workflows.

## Open items deliberately not decided here

- **Remote caching backend** (Vercel free tier vs. self-hosted):
  defer until CI volume justifies it. Local-only caching covers
  v1 needs.
- **Pruned production builds** (`turbo prune --scope=@sophie/astro`):
  worth adopting once we ship a Docker image for any consumer; not
  needed v1.

## References

- Brainstorming session, tooling Q (May 2026): "Monorepo
  orchestration" pinned to Turborepo.
- [Turborepo documentation](https://turbo.build/repo).
- [ADR 0011](0011-pnpm-package-manager.md) — pnpm and Turborepo
  are designed to work together; `turbo run` respects the pnpm
  workspace graph.
- [ADR 0001](0001-platform-not-monorepo.md) — the monorepo this
  orchestrates.
