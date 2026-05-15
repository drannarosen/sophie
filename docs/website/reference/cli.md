---
title: CLI Reference
short_title: CLI
description: >-
  The `sophie` command surface — build, audit, eval, validate, fmt, create,
  upgrade.
tags:
  - cli
  - reference
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

:::{seealso}
The architectural rationale for the deterministic-CLI / AI-tools-via-
prompt-files split is explained in
[Audit and AI authoring](../explanation/audit-and-ai-authoring.md). The
choice of `sophie eval` as a v1 capability (rather than future work)
is captured in
[ADR 0010](../decisions/0010-myst-for-design-docs.md).
:::

## Commands

### `sophie create`

Scaffold a new textbook or course repo from the platform templates.

```bash
sophie create textbook <name>      # scaffold from templates/starter-textbook/
sophie create course <name>        # scaffold a semester course shell
sophie create chapter <topic>      # add a chapter with required components stubbed
```

### `sophie audit`

Run schema validation, pedagogy checks, and emit Tier 3 prompt files.

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

Exit codes:

- `0` — no errors (warnings allowed; configurable to fail on warnings)
- `1` — Tier 1 errors (schema, references, structure)
- `2` — Tier 2 errors (pedagogy contract)
- `3` — Tier 3 prompts generated (informational, not a failure)

### `sophie validate`

A strict subset of `audit` — schema validation only. Fastest check.

```bash
sophie validate chapter <id>     # subset of audit: schema only
sophie validate course <id>      # all chapters in course
sophie validate --strict         # fail on any warning
```

### `sophie build`

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

### `sophie dev`

The day-to-day editing loop. Wraps `astro dev` (Vite-powered HMR,
typically <100 ms feedback) plus `@sophie/audit` running in watch
mode plus profile switching plus LAN exposure for phone/tablet
preview. **Use this while authoring chapters or developing components.**

```bash
sophie dev                       # student profile, hot-reload, audit watcher
sophie dev --profile=instructor  # render instructor-only blocks too
sophie dev --host                # expose on LAN (preview from phone/iPad)
sophie dev --port=4321           # explicit port
```

What you get:

- HMR on every file save; React component state is preserved.
- Tier 1+2 audit feedback in the terminal as you type.
- Pyodide kernel persistence across HMR (rebuilds don't kill
  in-flight Python state in `<CodeCell>`s).
- Browser auto-opens (override with `--no-open`).

For component-isolated development, use **Storybook**
(`pnpm storybook`) instead — see
[ADR 0015](../decisions/0015-dev-preview-workflow.md).

For AI-driven browser inspection (Claude Code / Codex), use the
**Playwright MCP** plugin against a running `sophie dev` server —
also covered in [ADR 0015](../decisions/0015-dev-preview-workflow.md).

### `sophie preview`

Build the static site (production output) and serve it for review.
Use this to check what consumers will actually see — not for
day-to-day editing (use `sophie dev` for that).

```bash
sophie preview                   # build + serve student profile
sophie preview --profile=instructor
```

### `sophie fmt`

Auto-format MDX consistently. Like Prettier for chapters.

```bash
sophie fmt chapter <id>          # format MDX consistently
sophie fmt course <id>           # all chapters
sophie fmt --check               # error if formatting differs
```

### `sophie eval`

Prompt-regression testing. Runs Tier 3 prompts against fixture sets
and reports drift in quality, format, or shape across providers and
versions. **Ships in v1.**

```bash
sophie eval prompts                       # run all Tier 3 prompts
sophie eval prompts --check=<id>          # run a specific prompt template
sophie eval prompts --provider=claude     # specific provider
sophie eval prompts --provider=codex
sophie eval prompts --baseline=<sha>      # diff against a baseline run
sophie eval prompts --output=junit        # CI-friendly output
```

### `sophie upgrade`

Migrate content/responses to the latest schema versions. Forward-only
migration; original recorded fields preserved.

```bash
sophie upgrade                   # apply pending migrations
sophie upgrade --dry-run         # show what would change
sophie upgrade --to=2.0          # target a specific platform version
```

Ships in v1 as a no-op until the first breaking change, so consumers
get a stable migration story from day one.

## What's *not* in the CLI

By design:

- **`sophie generate` / `sophie fix` / `sophie refactor`** — these
  need an AI in the loop. They live as Claude Code slash commands and
  skills. See [Audit and AI authoring](../explanation/audit-and-ai-authoring.md).
- **API keys / provider credentials** — never. Sophie ships without
  any provider auth. Authors use their existing AI subscriptions.

## Configuration

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
