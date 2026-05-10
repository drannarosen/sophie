---
title: Contributor setup
short_title: Setup
description: How to clone the docs site, install dependencies, and run it locally.
tags: [contributing, setup, mystmd]
---

# Contributor setup

How to get this docs site running locally.

## Prerequisites

- **Node.js 20+** (verify with `node --version`).
- A code editor (VS Code recommended; the JSON Schema for chapter
  frontmatter will be wired into VS Code's `yaml.schemas` once the
  Sophie repo lands).

For the docs site itself you only need `mystmd` (see below); the
full tool stack is required once you start working on Sophie
packages.

## Required tools (for Sophie platform work)

These are the locked tooling decisions. See ADRs
[0011](../decisions/0011-pnpm-package-manager.md),
[0012](../decisions/0012-uv-python-tooling.md),
[0013](../decisions/0013-biome-lint-format.md),
[0014](../decisions/0014-turborepo-monorepo-orchestration.md),
[0015](../decisions/0015-dev-preview-workflow.md) for rationale.

### pnpm — JS package manager

```bash
# Easiest: enable corepack (ships with Node 16+)
corepack enable
corepack prepare pnpm@latest --activate

# Or: install standalone
npm install -g pnpm
```

Verify: `pnpm --version`.

**Never use `npm` or `yarn` in a Sophie repo.** They bypass the
strict-dependency hygiene that protects the public API surface;
see [ADR 0011](../decisions/0011-pnpm-package-manager.md).

### uv — Python tool

```bash
# Recommended (macOS / Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via pipx
pipx install uv
```

Verify: `uv --version`. Used for figure-generation scripts, Manim
pipelines, and CI Python utilities. See
[ADR 0012](../decisions/0012-uv-python-tooling.md).

### Biome — lint + format

Installed per-repo as a dev dependency; no global install needed.
Once a Sophie package or course repo is cloned:

```bash
pnpm install              # installs Biome among other deps
pnpm biome --version
```

VS Code: install the official **Biome** extension
(`biomejs.biome`). See
[ADR 0013](../decisions/0013-biome-lint-format.md).

### Turborepo — monorepo orchestration

Also per-repo as a dev dependency:

```bash
pnpm install              # installs Turborepo
pnpm turbo --version
```

Used as `pnpm turbo run <task> --filter=<package>...`. See
[ADR 0014](../decisions/0014-turborepo-monorepo-orchestration.md).

### Playwright (browsers + MCP) — for dev preview & AI inspection

```bash
pnpm exec playwright install   # downloads browser binaries
```

Claude Code users should also have the **Playwright MCP plugin**
installed, which gives Claude the ability to drive a browser. See
[ADR 0015](../decisions/0015-dev-preview-workflow.md).

### MyST — for these design docs

```bash
npm install -g mystmd
```

Or use `npx mystmd` for one-off invocations without a global
install. Verify: `mystmd --version`.

## Clone

The design docs live in `Teaching/sophie/docs/website/` (inside the
Sophie monorepo at `drannarosen/sophie`). Per [ADR 0010](../decisions/0010-myst-for-design-docs.md)
and [ADR 0023](../decisions/0023-vertical-slice-build-order.md), the
docs stay in MyST at this location for the foreseeable future.

```bash
cd /Users/anna/Teaching/sophie/docs/website
```

## Run the site locally

From the `docs/website/` directory:

```bash
mystmd start
```

This serves the site at the URL MyST prints (typically
`http://localhost:3000`). Edits to `.md` files hot-reload.

## Build the static site

```bash
mystmd build --html
```

Output goes to `_build/html/` by default.

## Editor setup (recommended)

### VS Code

- Install the **MyST-Markdown** extension for syntax highlighting and
  preview.
- Install the **Markdown All in One** extension for table of
  contents and auto-formatting.
- Install **markdownlint** for the same lint warnings the docs CI
  will run.

### YAML schema for `myst.yml`

Once a JSON Schema for `myst.yml` is published, wire it into VS
Code's `yaml.schemas` setting. (Currently MyST's `myst.yml` is well-
documented in [the MyST documentation](https://mystmd.org); refer to
that for valid keys.)

## Common tasks

### Add a new ADR

1. Pick the next available ADR number (current: 0011 next).
2. Copy `decisions/template.md` to `decisions/NNNN-short-title.md`.
3. Fill in frontmatter (`status`, `date`, `deciders`, `tags`).
4. Write Context, Decision, Rationale, Alternatives, Consequences,
   References.
5. Update `myst.yml` to add the new file to the toc.
6. See [ADR process](adr-process.md) for the full workflow.

### Add a new how-to or explanation page

1. Identify the right section: see
   [docs style guide](docs-style-guide.md) for the Diátaxis split.
2. Create the file under `how-to/` or `explanation/`.
3. Frontmatter: `title`, `short_title`, `description`, `tags`.
4. Update `myst.yml` to add the file to the toc.
5. Build locally and verify the page renders + links resolve.

### Update the glossary

Add the term as a new entry in `reference/glossary.md` under the
`{glossary}` directive. Cross-references via `{term}` syntax then
link automatically.

### Fix a citation

1. Verify the key exists in `references.bib`.
2. If not, add the bibliographic entry (CSL-JSON shape).
3. Verify the prose `[@key]` matches.

## Troubleshooting

- **`mystmd: command not found`**: install globally with
  `npm install -g mystmd` or use `npx mystmd`.
- **Broken cross-references on build**: MyST reports the offending
  source file and target. Common causes: typo in target path,
  page not yet created, page not in `myst.yml` toc.
- **Diagrams not rendering**: ensure the `mermaid` plugin is enabled
  in your MyST install (it should be by default in recent versions).

## See also

- [ADR process](adr-process.md) — when and how to write ADRs.
- [Docs style guide](docs-style-guide.md) — voice, IA, naming
  conventions.
- [MyST documentation](https://mystmd.org) — upstream reference.
