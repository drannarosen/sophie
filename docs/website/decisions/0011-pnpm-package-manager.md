---
date: 2026-05-09T00:00:00.000Z
tags:
  - tooling
  - package-manager
  - monorepo
  - foundation
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: manual
      ref: pnpm-lock.yaml
      date: "2026-05-16"
      notes: "pnpm workspace + lockfile in active use across all packages and the smoke example."
    - kind: manual
      ref: pnpm-workspace.yaml
      date: "2026-05-16"
      notes: "Workspace file declares packages/* + examples/* + docs/website; pnpm install --frozen-lockfile is the canonical install path."
    - kind: review
      ref: docs/reviews/2026-05-13-peerdep-lockfile-sweep.md
      date: "2026-05-13"
      notes: "Peer-dep + lockfile sweep audit — pnpm workspace shape confirmed under cross-package install flow."
  notes: "pnpm is the only sanctioned JS package manager (per CLAUDE.md); enforcement is by convention + CI lockfile-frozen install."
---

# ADR 0011: pnpm as the JavaScript package manager

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0001](0001-platform-not-monorepo.md) commits Sophie to a
standalone-platform shape with separate consumer course repos
depending on `@sophie/*` packages. The platform repo is itself a
monorepo (`packages/`, `apps/`, `templates/`) that needs:

- **Workspace support** to develop multiple `@sophie/*` packages
  side by side with internal `workspace:*` references.
- **Strict dependency hygiene** so the platform's public API surface
  (per [ADR 0001](0001-platform-not-monorepo.md)) doesn't leak
  phantom dependencies into consumers — i.e., a package can't
  silently import something it didn't declare and have it work
  locally only because some other workspace declared it.
- **Disk efficiency** because the monorepo will have many shared
  deps (React, Zod, Astro internals) across 8+ packages.
- **Ecosystem alignment** with Astro and Vite, which Sophie builds
  on top of.

The choice of package manager affects every developer hour, every CI
run, and the ergonomics of every consumer who installs `@sophie/*`.

## Decision

**pnpm** is the only supported JavaScript package manager for Sophie.
Adopted from Phase 0; pinned via `corepack` (`packageManager:
"pnpm@x.y.z"` in `package.json`) so contributors get the right
version automatically.

## Rationale

- **Best workspaces support.** pnpm's workspace protocol
  (`workspace:*`, `workspace:^`) is the most ergonomic in the
  ecosystem; npm/yarn workspaces are usable but rougher. The Astro,
  Vite, and Vue monorepos all develop on pnpm.
- **Strict by default.** pnpm's `node_modules` layout exposes only
  declared dependencies. If `@sophie/components` accidentally
  imports something only `@sophie/astro` declared, pnpm rejects it
  locally — meaning consumers never hit a broken install where the
  platform "worked on my machine" but fails for them. This is
  exactly the API hygiene [ADR 0001](0001-platform-not-monorepo.md)
  commits to.
- **Disk efficiency via content-addressed store.** Each unique
  package version is stored once on the machine and hard-linked into
  each project's `node_modules`. For a monorepo with 8+ packages
  sharing a deep dependency tree, this is multi-gigabyte savings.
- **Speed.** Comparable to or faster than yarn classic for installs;
  significantly faster than npm.
- **npm-compatible commands.** `pnpm install`, `pnpm run`, `pnpm
  add` mirror npm; the migration cost from npm-fluent contributors
  is small.

## Alternatives considered

- **npm**. Pros: ships with Node; universal familiarity. Cons:
  weak workspace ergonomics, slower installs, allows phantom deps.
  Rejected — phantom deps would silently degrade the public API
  hygiene from [ADR 0001](0001-platform-not-monorepo.md).
- **yarn classic (1.x)**. Frozen project; no advantage over pnpm
  in 2026. Rejected.
- **yarn berry / yarn 4 with PnP** (Plug-n-Play, no
  `node_modules`). Pros: deterministic, smallest disk footprint.
  Cons: many tools (Astro plugins, native modules, Storybook addons)
  break under PnP and require escape hatches. Rejected — too many
  compatibility seams for a platform that depends on the Astro
  integration ecosystem.
- **bun**. Pros: fastest installer; promising runtime. Cons: younger
  ecosystem; some native modules and Astro integrations behave
  differently than under Node; runtime semantics occasionally
  diverge from Node spec. Rejected for v1 — revisit in v2 as a CLI
  runtime accelerator (separate ADR if adopted).

## Consequences

**Easier:**

- Monorepo development with `workspace:*` references.
- Catching phantom deps before they break consumers.
- Disk usage (one global store, hard-linked into projects).
- Aligning with Astro/Vite/Vue ecosystem documentation and tooling.

**Harder:**

- Onboarding contributors who only know npm — mitigated by
  near-identical command surface and documentation in
  [contributing/setup.md](../contributing/setup.md).
- Some IDE plugins assume npm; rare edge cases need explicit
  configuration.
- pnpm's strictness occasionally surprises (e.g., a previously
  working `import` breaks because the dependency was transitive);
  the strictness is the feature, but it costs ramp-up time.

**Triggers:**

- `package.json` declares `"packageManager": "pnpm@<version>"`.
- CI uses `pnpm/action-setup@v4` (or the latest equivalent).
- All scripts run via `pnpm <task>` — no `npm run` in docs or
  examples.
- Consumer course repo `starter-textbook` template assumes pnpm.

## References

- Brainstorming session, tooling Q (May 2026): "JS package manager"
  pinned to pnpm.
- [ADR 0001](0001-platform-not-monorepo.md) — public API discipline
  this strictness protects.
- [pnpm documentation](https://pnpm.io).
- [`status/roadmap.md` Phase 0](../status/roadmap.md) — already
  commits to pnpm workspaces.
