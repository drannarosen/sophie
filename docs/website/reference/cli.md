---
title: CLI Reference
short_title: CLI
description: >-
  The `sophie` command surface — what ships today, what's designed for
  future versions, and what's deferred indefinitely.
tags:
  - cli
  - reference
status: mixed
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# CLI reference

The `sophie` CLI is the user-facing surface of the platform for course
authors. It is **purely deterministic**: it does not call any AI
provider directly. AI work happens in tools the author already pays
for (Claude Code, Codex, others) consuming structured prompt files
emitted by `sophie audit` — see
[Audit and AI authoring](../explanation/audit-and-ai-authoring.md).

:::{important}
This reference describes both **shipped commands** (working today) and
**designed-but-not-implemented commands** (the eventual surface). Each
section below carries a status banner:

- **🟢 Shipped** — the command works as described.
- **🟡 Designed** — the spec is locked, the implementation is pending.
- **🔵 Deferred** — recorded for future planning; not on a current sprint.

If you only want the surface that works today, jump to
[§Implemented today](#implemented-today).
:::

## Implemented today

Four commands ship in [`packages/cli/src/index.ts`](https://github.com/drannarosen/sophie/blob/main/packages/cli/src/index.ts):

| Command | What it does today |
|---|---|
| `sophie start <project>` | Start the dev server against a Sophie consumer project (alias for `sophie dev`). Wraps `astro dev`. |
| `sophie dev <project>` | Alias for `sophie start`. |
| `sophie preview <project>` | Build the consumer project + serve the production output for review. |
| `sophie audit <file>` | Validate a single chapter MDX file's frontmatter against the schema. Positional `file` argument; no chapter/course modes yet. Exits non-zero on findings. |

Everything else on this page is designed surface, not shipped.

## Commands

### `sophie create` 🟡 Designed

:::{note}
**Status: Designed (not implemented).** No `create` subcommand exists
in the shipped CLI. Bootstrap a Sophie consumer repo manually by
copying the smoke target's layout.
:::

Scaffold a new textbook or course repo from the platform templates.

```bash
sophie create textbook <name>      # scaffold from templates/starter-textbook/
sophie create course <name>        # scaffold a semester course shell
sophie create chapter <topic>      # add a chapter with required components stubbed
```

### `sophie audit`

#### File mode 🟢 Shipped

```bash
sophie audit <path/to/chapter.mdx>   # validate one chapter MDX's frontmatter
```

Exit code `0` on success, `1` on schema findings. Output is a per-
finding `[SEVERITY] <path>: <message>` log.

Per-finding output format and the exit-code convention live in
[`packages/cli/src/commands/audit.ts`](https://github.com/drannarosen/sophie/blob/main/packages/cli/src/commands/audit.ts).

#### Chapter / course / flag surface 🟡 Designed

:::{note}
**Status: Designed (not implemented).** The shipped `sophie audit`
takes a positional file path only. The chapter/course modes + flags
below are the eventual scope; no implementation timeline is committed.
:::

```bash
sophie audit chapter <id>                  # all checks + Tier 3 prompts
sophie audit chapter <id> --fast           # Tier 1+2 only
sophie audit chapter <id> --tier=2         # specific tier
sophie audit chapter <id> --tier=3-only    # emit only Tier 3 prompts
sophie audit course <id>                   # all chapters
sophie audit --since=main                  # only changed chapters
sophie audit --output=json                 # machine-readable
sophie audit --output=claude-code          # TodoWrite-compatible
sophie audit --output=github               # GH PR annotations
sophie audit --output=prompts <dir>        # write Tier 3 prompts to dir
```

**Designed** exit codes (not active in shipped file mode):

- `0` — no errors (warnings allowed; configurable to fail on warnings)
- `1` — Tier 1 errors (schema, references, structure)
- `2` — Tier 2 errors (pedagogy contract)
- `3` — Tier 3 prompts generated (informational, not a failure)

The build-time pedagogy audit currently runs INSIDE `TextbookLayout.astro`
at chapter render (per ADR 0038 / 0061). When the design above lands,
it will become a standalone CLI surface that reuses the same audit
core, with adapter outputs for CI integrations.

### `sophie validate` 🟡 Designed

:::{note}
**Status: Designed (not implemented).** Use `sophie audit <file>`
(shipped, file mode) for schema validation today.
:::

A strict subset of `audit` — schema validation only. Fastest check.

```bash
sophie validate chapter <id>     # subset of audit: schema only
sophie validate course <id>      # all chapters in course
sophie validate --strict         # fail on any warning
```

### `sophie build` 🟡 Designed

:::{note}
**Status: Designed (not implemented).** Use `astro build` from the
consumer project root today. Profile switching is recorded as
[ADR-pending follow-up work](../decisions/) — there's no `--profile`
flag yet.
:::

Wrapper around `astro build`; sets the `PROFILE` env var and runs the
audit (errors fail the build).

```bash
sophie build                     # student profile, ./dist/
sophie build --profile=student
sophie build --profile=instructor
sophie build --profile=both
sophie build --course=astr201
```

See [Set up dual-profile](../how-to/set-up-dual-profile.md) for the
mechanism.

### `sophie dev` 🟢 Shipped (subset of designed surface)

The day-to-day editing loop. Wraps `astro dev` (Vite-powered HMR,
typically <100 ms feedback). **Use this while authoring chapters or
developing components.**

```bash
sophie dev <project>             # student profile, hot-reload
```

**Shipped today**: HMR on file save; React component state preserved
across most reloads (component-dependent).

**Designed (not yet implemented)**: profile switching, audit-watch
mode, `--host` LAN exposure, `--port` override, Pyodide kernel
persistence across HMR. Some of these may work transitively via the
underlying `astro dev` flags, but they aren't wired into the
`sophie dev` subcommand surface yet.

```bash
# Designed surface (not yet in `sophie dev`):
sophie dev --profile=instructor  # render instructor-only blocks too
sophie dev --host                # expose on LAN (preview from phone/iPad)
sophie dev --port=4321           # explicit port
```

For component-isolated development, use **Storybook**
(`pnpm storybook`) instead — see
[ADR 0015](../decisions/0015-dev-preview-workflow.md).

For AI-driven browser inspection (Claude Code / Codex), use the
**Playwright MCP** plugin against a running `sophie dev` server —
also covered in [ADR 0015](../decisions/0015-dev-preview-workflow.md).

### `sophie preview` 🟢 Shipped

Build the static site (production output) and serve it for review.
Use this to check what consumers will actually see — not for
day-to-day editing (use `sophie dev` for that).

```bash
sophie preview <project>         # build + serve
```

**Shipped today**: build + serve. **Designed (not yet implemented)**:
`--profile=instructor` flag.

### `sophie fmt` 🟡 Designed

:::{note}
**Status: Designed (not implemented).** Use `pnpm exec biome check
--write <file>` for source formatting; MDX-specific formatting is on
the future roadmap.
:::

Auto-format MDX consistently. Like Prettier for chapters.

```bash
sophie fmt chapter <id>          # format MDX consistently
sophie fmt course <id>           # all chapters
sophie fmt --check               # error if formatting differs
```

### `sophie eval` 🔵 Deferred

:::{note}
**Status: Deferred.** Recorded for future planning, not on a current
sprint. Tier 3 prompts themselves aren't shipped yet either; once
they are, `sophie eval` becomes feasible.
:::

Prompt-regression testing. Runs Tier 3 prompts against fixture sets
and reports drift in quality, format, or shape across providers and
versions.

```bash
sophie eval prompts                       # run all Tier 3 prompts
sophie eval prompts --check=<id>          # run a specific prompt template
sophie eval prompts --provider=claude     # specific provider
sophie eval prompts --provider=codex
sophie eval prompts --baseline=<sha>      # diff against a baseline run
sophie eval prompts --output=junit        # CI-friendly output
```

### `sophie upgrade` 🟡 Designed

:::{note}
**Status: Designed (not implemented).** Sophie has no committed
schema migrations yet — content schemas are in v1 development, and
the no-op-until-first-breaking-change posture means no migrations
have shipped to run.
:::

Migrate content/responses to the latest schema versions. Forward-only
migration; original recorded fields preserved.

```bash
sophie upgrade                   # apply pending migrations
sophie upgrade --dry-run         # show what would change
sophie upgrade --to=2.0          # target a specific platform version
```

When schema breaking changes do ship, `sophie upgrade` becomes the
canonical migration tool. Pre-launch, it remains designed-but-empty.

## What's *not* in the CLI

By design:

- **`sophie generate` / `sophie fix` / `sophie refactor`** — these
  need an AI in the loop. They live as Claude Code slash commands and
  skills. See [Audit and AI authoring](../explanation/audit-and-ai-authoring.md).
- **API keys / provider credentials** — never. Sophie ships without
  any provider auth. Authors use their existing AI subscriptions.

## Configuration 🟡 Designed

:::{note}
**Status: Designed (not implemented).** No `sophie.config.ts` is read
by the shipped CLI today. Consumer projects (`examples/smoke/`)
configure Astro directly via `astro.config.mjs`; Sophie-specific
configuration (course id, citation style, etc.) is implicit from
content collection structure for now.
:::

Each consumer course repo carries a `sophie.config.ts`:

```typescript
import { defineSophieConfig } from '@sophie/cli';

export default defineSophieConfig({
  course: 'astr201',
  citation: { style: 'apj' },        // or 'apa' for COMP
  textbook: {
    bibliographyPath: './src/content/bibliography.json',
  },
  build: {
    profiles: ['student'],            // 'instructor' adds in v2
  },
  cosmicPlayground: {
    manifestUrl: 'https://astrobytes-edu.github.io/cosmic-playground/manifest.json',
  },
});
```

The config is validated by a Zod schema in `@sophie/cli`. Errors at
build start, not mid-build.

## Status taxonomy

- **🟢 Shipped** — command + flags work as described in the latest
  released `@sophie/cli` version on `main`. Verified by reading the
  source at link-back time.
- **🟡 Designed** — spec is locked; implementation pending. Future
  PRs targeting this surface should land schema + tests + impl
  together.
- **🔵 Deferred** — recorded design; no current implementation
  intent. May graduate to Designed or be dropped from the canonical
  surface.

Per [ADR 0061 Rule 5](../decisions/0061-ai-optimized-codebase-design.md)
(docs land atomically with code): when a Designed command becomes
Shipped, its status banner here updates in the SAME PR as the
implementation, never as a follow-up.
