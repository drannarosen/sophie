---
date: 2026-05-09T00:00:00.000Z
tags:
  - tooling
  - python
  - uv
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0012: uv as the Python tooling

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie is primarily a TypeScript project, but Python shows up in
several places:

- **Build-time figure generation**: `MediaAsset.source.kind === 'generated'`
  with `language: 'python'` runs scripts (matplotlib, astropy) to
  pre-render figures.
- **Manim animation pipelines**: Python scripts that produce MP4s
  uploaded to YouTube/CDN.
- **CI utilities**: link checking, citation validation against ADS,
  reference-resolution sanity checks.
- **Course repo helpers**: per-course Python scripts authors run
  during chapter authoring.

These all need a Python toolchain that's fast, reproducible, and
easy to install. Anna's global CLAUDE.md already defaults to
`uv run` for Python work.

**Pyodide for in-browser student-facing Python in `<CodeCell>` is a
*different* concern** — Pyodide ships its own pre-built Python
runtime to the browser; it's unaffected by host-side Python tooling
choices.

## Decision

**uv** (Astral's Rust-based Python package and project manager) is
the standard Python toolchain for Sophie. Used for: generator
scripts in the platform repo, CI Python utilities, and the suggested
default for consumer course repos that include Python helpers.

## Rationale

- **Speed.** 10–100× faster than pip/poetry. CI matters; a uv
  install completes in seconds where pip/poetry takes minutes.
- **Lockfile (`uv.lock`).** Reproducible installs without poetry's
  slowness. CI can resolve and install with one command.
- **Built-in Python version management.** `uv python install 3.12`
  obviates pyenv/asdf for Python alone. Pin Python version per
  project via `pyproject.toml` `requires-python`.
- **Astral ecosystem alignment.** uv pairs with `ruff` (linter +
  formatter) — both Rust-based, both increasingly the SoTA. Future
  Python ADRs will likely pick from the Astral family.
- **Matches user's CLAUDE.md.** Anna already runs Python via `uv
  run`; this ADR confirms the platform inherits that default
  rather than diverging.

## Alternatives considered

- **pip** (the default). Pros: ships with Python. Cons: no
  lockfile, no env management, slow. Rejected.
- **poetry**. Pros: lockfile, env management, popular. Cons:
  significantly slower than uv; older mental model. Rejected — uv
  does what poetry does, faster, with a smaller dependency footprint.
- **conda / mamba**. Pros: handles binaries (the scientific Python
  stack). Cons: heavyweight; not Python-only; mixes language
  ecosystems. Rejected for *this* use case (small Python utilities,
  not a sci-stack-heavy environment) — mamba/conda would be valid
  for a chapter-authoring environment that needs the full SciPy
  stack with C/Fortran extensions, but uv covers what Sophie needs.
- **rye**. Pros: similar idea to uv, also Astral-adjacent. Cons:
  smaller community; Astral consolidated effort on uv. Rejected.

## Consequences

**Easier:**

- Faster CI for Python tasks.
- Reproducible Python environments without ceremony.
- One-step Python version pin per project.
- Consistent with Anna's existing workflow (no context switch).

**Harder:**

- Contributors unfamiliar with uv have a small ramp-up — mitigated
  by pip-compatible commands (`uv pip install`) and clear setup
  docs.
- uv is younger than pip/poetry; rare edge cases in obscure packages
  occasionally need workarounds. The active development cadence
  resolves them quickly.

**Triggers:**

- Sophie repo `pyproject.toml` is uv-first; `uv.lock` committed.
- CI installs uv (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
  and uses `uv sync` + `uv run` for all Python steps.
- Generator-script invocations in the build pipeline run under
  `uv run python <script>.py`.
- Consumer-repo `starter-textbook` template includes a `pyproject.toml`
  + `uv.lock` only if the course needs Python helpers.
- `ruff` is a follow-on adoption (linter + formatter for Python);
  no separate ADR needed — pairs naturally with uv.

## References

- Brainstorming session, tooling Q (May 2026): "Python tooling"
  pinned to uv.
- User's CLAUDE.md (`Default: Use uv run to run Python commands`).
- [uv documentation](https://docs.astral.sh/uv/).
- [Astral's blog post on uv](https://astral.sh/blog/uv) — context on
  why this approach.
