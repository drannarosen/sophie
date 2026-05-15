---
date: 2026-05-09T00:00:00.000Z
tags:
  - docs
  - myst
  - dogfooding
  - meta
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0010: MyST for design docs; Sophie-hosted docs later

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[ADR 0002](0002-renderer-astro-mdx.md) established Astro+MDX as
Sophie's renderer because Sophie's pedagogy is interactive. The earlier
roadmap also said `apps/docs/` (a Sophie-self-hosted docs site) would
ship in Phase 0 as dogfooding.

Two facts complicate that plan:

1. **Sophie doesn't exist yet.** Until `@sophie/*` packages are
   published or workspace-linked, `apps/docs/` can't actually run on
   Sophie. There has to be *some* way to author design docs in the
   meantime.
2. **Design docs aren't textbooks.** They're classical scientific
   technical writing — citations, cross-references, glossary, ADRs.
   Exactly what MyST excels at, and the opposite of where Sophie
   shines.

The user proposed building a MyST-based docs site at
`docs/website/` to host the design / planning / decisions / reference
content during the build of Sophie itself.

## Decision

**This docs site uses {abbr}`MyST`** (`mystmd`). It supersedes the
flat-file `.md` structure that existed at the project root before
this docs site was created. The migration to Sophie's self-hosted
`apps/docs/` is **indefinitely deferred** per
[ADR 0023](0023-vertical-slice-build-order.md); the docs stay in
MyST at `docs/website/` (inside the Sophie monorepo) for the
foreseeable future.

Designing the MyST site for *future migration* means using only MyST
features that have clean MDX equivalents: admonitions, cross-refs,
citations, definitions, glossary, Mermaid. **No executable code in
design docs.** If a use case for executable docs emerges, ADR it
first.

## Rationale

- **Use each tool where it shines.** Sophie (the platform) is
  Astro+MDX because pedagogy is interactive. Sophie's design docs
  are MyST because design docs are classical scientific writing.
  Internally consistent, not contradictory.
- **MyST is already in production for ASTR 596.** Author familiarity
  is real; ramp-up is zero.
- **Bootstrap-then-migrate** is the right shape: MyST is the
  *transitional* host while Sophie matures. The migration is
  mechanical (MyST features used → MDX equivalents) by design, not
  aspiration.
- **Design docs benefit from MyST features.** ADRs as numbered
  files, glossary as a directive, citations to pedagogical
  literature, Mermaid for architecture diagrams — all natural in
  MyST, fiddly in MDX.

## Alternatives considered

- **MyST permanently (don't migrate to Sophie).** Pros: no
  migration. Cons: Sophie loses its only "self-host technical docs"
  dogfooding case; design docs and product docs live on different
  systems forever, which creates a long-term split. Rejected: a
  later migration is a ~1 week project; the dogfooding loss is
  long-lasting.

- **`apps/docs/` on Sophie from Phase 0.** Rejected: Sophie doesn't
  exist yet. We'd be authoring docs against a moving target with
  no reference implementation.

- **Two parallel sites permanently.** MyST for design;
  Sophie-hosted for product docs once Sophie matures. Pros: each
  optimized. Cons: doubles maintenance; readers have to learn two
  IAs; cross-linking gets fiddly. Rejected: post-migration, one
  Sophie-hosted site serves both purposes adequately.

- **Quarto.** The thing being migrated away from for Sophie.
  Choosing it for design docs would re-validate Quarto in a context
  where MyST is strictly better.

## Consequences

**Easier:**

- Author the docs site immediately, in parallel with Sophie's Phase
  0 platform work.
- Capture design rationale, ADRs, decision history in a real site,
  not a flat-file folder.
- Use MyST's strengths (citations, glossary, Mermaid) without
  fighting Sophie.
- The ADR audit trail for the Sophie design lives in a real,
  navigable, linkable site from day one.

**Harder:**

- A Phase 4–5 migration project (mechanical: MyST→MDX). Bounded
  scope; well-understood feature mapping.
- Design discipline: avoid MyST-only flourishes. Mitigated by the
  list above and by post-PR review.
- The future Sophie-hosted docs site has to inherit this site's IA
  and content — a forcing function on the migration design.

**Triggers:**

- `mystmd` installed and `myst.yml` created at
  `docs/website/myst.yml`.
- Diátaxis-shaped IA from day one (this design choice is itself an
  ADR-worthy decision; folded into this ADR).
- ADR template (this file's sibling at `decisions/template.md`) is
  the format every future ADR fills in.
- `apps/docs/` removed from Sophie's Phase 0 deliverables; readded
  to Phase 4–5 as a content migration target.

## References

- Brainstorming session, docs-site Q (May 2026).
- [explanation/why-myst-for-docs.md](../explanation/why-myst-for-docs.md)
  — extended argument.
- [explanation/why-not-myst-for-sophie.md](../explanation/why-not-myst-for-sophie.md)
  — companion explanation closing the loop.
