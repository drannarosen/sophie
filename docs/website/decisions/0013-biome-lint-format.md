---
date: 2026-05-09T00:00:00.000Z
tags:
  - tooling
  - lint
  - format
  - biome
  - dx
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: manual
      ref: biome.json
      date: "2026-05-16"
      notes: "Biome config governs the entire repo (packages/, examples/, scripts/, docs/website/scripts/)."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
      notes: "Zero biome errors AND zero warnings across the bucket B+C work; the CLAUDE.md 0/0 discipline holds."
  notes: "Biome replaces ESLint + Prettier; 0-error/0-warning discipline enforced per PR (CLAUDE.md conventions)."
---

# ADR 0013: Biome for lint and format

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Every TypeScript/JavaScript file in Sophie gets linted (rule
violations, complexity checks, unused imports) and formatted
(consistent whitespace, quote style, semi-colons). The classic
solution is **ESLint + Prettier**: two tools, two configs,
overlapping responsibilities, a perpetual `eslint-config-prettier`
shim to make them stop fighting.

Sophie is a young codebase shipping 8+ packages, axe-core in CI,
visual regression, Storybook, and a Playwright e2e suite. Each
incremental tool config adds maintenance load. Lint+format is the
cheapest place to consolidate.

## Decision

**Biome** is the only lint+format tool. One Rust-based binary
replaces ESLint and Prettier. Configured via `biome.json` at the
repo root with per-package overrides as needed.

## Rationale

- **Single tool, single config.** No `eslint-config-prettier` shim;
  no two-tool execution order; no overlapping rule conflicts.
- **Speed.** ~25× faster than ESLint + Prettier on equivalent code.
  For a monorepo, this is the difference between waiting and not
  waiting in pre-commit hooks and CI.
- **Astro/MDX support.** Biome added official support in 2024;
  formats `.astro` and `.mdx` files alongside `.ts`/`.tsx`.
- **Strong defaults.** Biome ships with sensible defaults; Sophie
  customizes minimally rather than authoring 200-rule configs.
- **Growing SoTA.** Adopted by major projects (Vue, Astro itself
  uses Biome internally for some packages); active development;
  Astral-style philosophy of "Rust replacements for slow JS tools."

## Alternatives considered

- **ESLint + Prettier**. Pros: the most familiar combo; richest
  plugin ecosystem; mature plugin authors. Cons: two tools, two
  configs, slower, the perpetual shim. Rejected — the ecosystem
  familiarity is a real cost (some specialized rules don't exist in
  Biome yet) but not enough to outweigh the consolidation benefit.
  If a critical ESLint-only rule becomes load-bearing, we can run
  ESLint on a narrow path alongside Biome.
- **deno fmt + deno lint**. Pros: similar consolidation philosophy.
  Cons: ties tooling to the Deno runtime; awkward in a Node-based
  project. Rejected.
- **No lint, just format** (just Prettier). Rejected — lint catches
  real bugs (unused imports, unreachable code, unsafe coercions).
- **dprint**. Pros: fast, Rust-based. Cons: format-only; no lint
  rules. Doesn't replace ESLint. Rejected.

## Consequences

**Easier:**

- One config (`biome.json`), one CLI (`biome check`, `biome format
  --write`), one pre-commit hook.
- Faster pre-commit and CI; the pre-commit penalty is low enough
  that contributors don't disable hooks.
- VSCode integration via the official Biome extension.

**Harder:**

- Some niche ESLint rules don't exist in Biome (e.g.,
  framework-specific rules from `eslint-plugin-react-hooks` exhaustive
  checks; Biome has its own subset). Acceptable trade-off; revisit
  if a missing rule masks a real bug class. Biome's rule coverage
  is improving rapidly.
- Migrating from a Sophie consumer who already has ESLint configured
  requires a one-time conversion; Biome ships a `biome migrate
  eslint` command that handles most cases.

**Triggers:**

- `biome.json` at the platform repo root with project-wide config.
- Per-package `biome.json` overrides where useful (e.g., test files
  allow longer functions, MDX files allow looser formatting).
- Pre-commit hook (Lefthook) runs `pnpm biome check --staged --no-errors-on-unmatched`.
- CI step `pnpm biome check` blocks merges on violations.
- VSCode `.vscode/extensions.json` recommends `biomejs.biome`.
- `starter-textbook` and `starter-course` templates include a
  default `biome.json`.

## References

- Brainstorming session, tooling Q (May 2026): "Lint + format"
  pinned to Biome.
- [Biome documentation](https://biomejs.dev).
- [Astro's official Biome integration](https://docs.astro.build/en/editor-setup/) (2024+).
- [ADR 0001](0001-platform-not-monorepo.md) — public-API discipline
  benefits from consistent formatting.
