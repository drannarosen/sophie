---
title: Sophie Design Documentation
short_title: Home
description: Planning, design, decisions, and reference for the Sophie platform.
---

# Sophie

> Greek for *wisdom*.

**Sophie** is a schema-driven, AI-authorable platform for interactive
scientific textbooks, course websites, slide decks, and LMS exports —
built from a single MDX source. It's published as a standalone,
distributable platform (like {abbr}`MyST` and Quarto). The first
courses (ASTR 201 and COMP 521) consume `@sophie/*` packages from
their own separate repositories; the platform repo contains only
platform code, dogfooded docs, a reference example textbook, and tests.

This documentation site is a **MyST website** that captures the
design, decisions, reference, and ongoing implementation of the
Sophie platform. It is the canonical home for design rationale,
{abbr}`ADR`s, and contributor guidance until Sophie matures enough to
host its own docs (Phase 4–5), at which point this content migrates
into the Sophie self-hosted `apps/docs/` site. The design here uses
only MyST features that translate cleanly to MDX so the migration is
mechanical.

:::{important} Status: design phase
Nothing in `@sophie/*` is committed code yet. These docs are living
artifacts updated as we make decisions, implement, and validate.
The roadmap in [Status → Roadmap](status/roadmap.md) tracks what's
shipped and what's next.
:::

## Where to start

::::{grid} 1 1 2 2

:::{card}
:header: 🌱 New to Sophie?
Start with the [architecture explanation](explanation/architecture.md)
to understand what Sophie is and why it's shaped the way it is, then
skim the [pedagogical foundations](explanation/pedagogical-foundations.md)
to see what makes Sophie's pedagogy distinctive.
:::

:::{card}
:header: 📐 Looking up something specific?
The [reference section](reference/content-schema.md) has the Zod
content schema, the pedagogy [component contract](reference/component-contract.md),
the [CLI surface](reference/cli.md), the [plugin API](reference/plugin-api.md),
and a [glossary](reference/glossary.md).
:::

:::{card}
:header: 🛠️ Trying to do a specific task?
The [how-to guides](how-to/set-up-dual-profile.md) cover concrete
tasks: setting up dual-profile builds, integrating Cosmic Playground
demos, adding custom components, deploying to GitHub Pages.
:::

:::{card}
:header: 🤔 Wondering *why*?
[Architecture Decision Records](decisions/template.md) capture every
load-bearing decision with context, alternatives considered, and
consequences. The [meta page on why Sophie isn't MyST](explanation/why-not-myst-for-sophie.md)
explains the renderer choice; [why this site IS MyST](explanation/why-myst-for-docs.md)
closes the loop.
:::

::::

## Documentation organization

This site follows the [Diátaxis framework](https://diataxis.fr) — four
content types, four user needs:

| Section | Serves | Read like |
|---|---|---|
| **Tutorials** | Learning | A guided walkthrough you read along with |
| **How-to guides** | Doing | A recipe you follow step by step |
| **Reference** | Looking up | A spec you scan for facts |
| **Explanation** | Understanding | An essay you read for context |

Plus two time-anchored sections:

- **[Decisions](decisions/template.md)** — chronological ADRs. Each
  ADR is immutable once accepted; revisions are new ADRs that
  supersede prior ones.
- **[Status](status/roadmap.md)** — what's shipped per phase, plus
  the roadmap and changelog.

And one collaborator-oriented section: **[Contributing](contributing/setup.md)**.

## Quick facts

- **Platform: Astro 5 + MDX** — see [ADR 0002](decisions/0002-renderer-astro-mdx.md).
- **Schema source of truth: Zod** — see [ADR 0003](decisions/0003-zod-as-source-of-truth.md).
- **Persistence: IndexedDB via a `ResponseStore` repository** — see
  [ADR 0007](decisions/0007-persistence-indexeddb.md).
- **Slides: Reveal.js** — see [ADR 0006](decisions/0006-slides-revealjs.md).
- **Demos: manifest + iframe + postMessage protocol** — see
  [ADR 0008](decisions/0008-cosmic-playground-protocol.md).
- **AI surface: deterministic CLI emits prompt files; AI tools (Claude
  Code, Codex, ...) consume them.** No API keys in the platform.
- **Sophie LDS conformance foundation (graduated 2026-05-14):** five
  contracts that together make a course Sophie-LDS-compliant —
  - **Teaching Decision Records** (consumer-repo curriculum audit
    trail; ADR-shaped) — see [ADR 0040](decisions/0040-teaching-decision-records.md).
  - **Teaching Move Library** (18 named moves across 7 families;
    centralized `move-index.ts`) — see [ADR 0041](decisions/0041-teaching-move-library.md).
  - **Pedagogy Contract + AI Contribution Ledger** (course-level
    YAML + per-chapter frontmatter; public-facing accountability) —
    see [ADR 0042](decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md).
  - **Notation Registry + `<MultiRep>` + Alignment Audit** (opt-in
    symbol source-of-truth, audited across representations) — see
    [ADR 0043](decisions/0043-notation-registry-multirep-alignment-audit.md).
  - **Misconception Graph + Intervention Library + `<Intervention>`**
    (extended misconception schema with graph + 12 canonical
    interventions) — see [ADR 0044](decisions/0044-misconception-graph-and-intervention-library.md).

## License

Content on this site is licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Code in `@sophie/*` packages will be licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)
when published; final license decision tracked in [ADR 0010](decisions/0010-myst-for-design-docs.md).
