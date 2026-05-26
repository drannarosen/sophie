---
date: 2026-05-26T00:00:00.000Z
tags:
  - pedagogy
  - glossary
  - content
  - authoring
  - pedagogy-index
status: accepted-design
validation:
  status: validated
  last_validated_date: "2026-05-26"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/accumulator-definitions.test.ts
      date: "2026-05-26"
      notes: "Cross-chapter same-slug definitions no longer throw; default first-defined canonical; explicit `canonical` overrides; two explicit canonicals for one slug throw (mirrors the F3 figure invariant)."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/canonical-definitions.test.ts
      date: "2026-05-26"
      notes: "The course-glossary dedup helper collapses to one entry per slug, selecting the canonical definition (explicit canonical wins; else first-accumulated)."
---

# ADR 0086: Multi-chapter glossary definitions (collisions allowed; canonical resolution)

**Amends [ADR 0038](./0038-pedagogy-index-pattern.md).**

## Context

ADR 0038's pedagogy-index accumulator enforced a hard cross-chapter
uniqueness invariant on glossary definitions: a term (slug) could be
defined with `<Aside kind="definition" title="X">` in **exactly one**
chapter across the whole textbook. A second definition of the same slug
in another chapter threw at build time
(`accumulator.addDefinitions`: *"Definition … is defined in multiple
chapters … rename or consolidate"*).

That invariant fights how the ASTR 201 lectures are actually written.
The readings **deliberately reinforce and repeat** load-bearing concepts:
"Kirchhoff's laws", "blackbody", "Doppler effect", and "spectroscopy"
are each introduced in more than one lecture, on purpose, because a
student meeting Module 2's spectroscopy chapter should not have to
remember a definition first stated three lectures earlier. Forcing the
later chapters to *reference-not-redefine* (unwrap the `<GlossaryTerm>`
to plain text) strips the reinforcing definition the author intended.

The same problem already arose for **figures** (a figure used in several
chapters) and was solved by [ADR 0038's F3 invariant](./0038-pedagogy-index-pattern.md):
many usages are allowed; exactly one is marked `canonical`, and that one
represents the figure in the course-level Library room.

What stays correct and unchanged: equation **reuse** is already
define-once / cite-many via `<KeyEquation refId>` (ADR 0060) — not a
collision. The per-chapter **D4/D5** glossary audits (every
`<GlossaryTerm>` needs a same-chapter definition Aside; every definition
needs a reference) are unaffected. The **intra-chapter** slug-collision
check in the extractor (two definitions of the same slug in *one*
chapter) stays a hard error. And the anchor-uniqueness invariants for
misconception / OMIFlow / WorkedExample ids stay, because the Library
rooms route on those slugs.

## Decision

**Allow a glossary definition slug to be defined in multiple chapters,
and resolve the course-level representative by a `canonical` flag —
mirroring the F3 figure pattern.**

### 1. `canonical` flag on definition asides

`DefinitionEntry` gains an optional `canonical?: boolean` field. The
extractor always sets it — `true` when the author writes the
boolean-presence prop `<Aside kind="definition" title="X" canonical>`,
`false` otherwise. It is *optional in the schema* (rather than required
like `FigureUsageEntry.canonical`) so the change touches only the
producer + resolution layers: existing non-extractor `DefinitionEntry`
literals (audit inputs, test fixtures) need no edit, since `undefined`
reads as non-canonical everywhere it is consumed. The F3 *mechanism* —
many allowed, one canonical — is mirrored at the resolution layer, not
the schema cardinality.

### 2. Accumulator allows cross-chapter slugs; enforces ≤1 canonical

`indexAccumulator.addDefinitions` no longer throws on a cross-chapter
slug match. Definitions are keyed by `${unit}#${slug}` (mirroring
figures' `${unit}#${anchor}`), so **all** per-chapter definitions are
retained. The retained throw is the F3-style invariant: **two
chapters marking the *same slug* `canonical` is a build error**
(*"Definition slug … marked canonical in multiple chapters"*).

### 3. Resolution: default first-defined, explicit `canonical` wins

The course-level `/library/glossary` room (`CourseGlossary`) dedupes to
**one entry per slug**, selecting the canonical definition:

- If exactly one chapter marks the slug `canonical`, that wins.
- If **no** chapter marks it, the **first-accumulated** definition is
  the default representative (deterministic given a fixed build
  traversal; authors who care set `canonical`).

Per-chapter `ChapterGlossary` is unchanged in behaviour: it filters the
(now multi-entry) index by `unit`, so each chapter renders **its own**
definition — which is the entire point of allowing the reinforcement.

## Rationale

- **Consistency (SoTA shape).** The F3 figure invariant already
  established "many allowed, one canonical" in this exact accumulator;
  reusing the shape for definitions is the least-surprising design and
  keeps the two registries parallel.
- **Author intent.** Repetition is a pedagogical feature of the
  lectures, not an error to be normalized away. The platform should
  encode the reinforcement, not forbid it.
- **Minimal blast radius.** Equations, D4/D5, intra-chapter collision,
  and anchor-routing invariants are untouched; only the cross-chapter
  *definition* uniqueness relaxes, plus a one-per-slug canonical guard.

## Alternatives considered

- **First-defined wins, no flag.** Simplest, but the Library
  representative would be whichever chapter happened to build first —
  arbitrary and non-author-controlled. Rejected: gives authors no say
  over the canonical definition.
- **List all definitions per slug in the Library room.** Most
  information-preserving, but the `/library/glossary` UX becomes a term
  with several near-duplicate entries — noise, not signal, for a
  reinforced concept. Rejected for the room; per-chapter glossaries
  already show each chapter's own wording.
- **Keep the hard uniqueness rule; force reference-not-redefine.** The
  status quo. Rejected per Context: it strips the intended reinforcing
  definition from later chapters.

## Consequences

- Chapter authors may freely re-define a term another chapter owns; if
  they want their wording to be the course-level canonical, they add
  `canonical` to the `<Aside>` (and exactly one chapter may do so per
  slug).
- `DefinitionEntry.canonical` is a new optional field; the extractor is
  the sole producer and always sets it. Consumers treat `undefined` as
  non-canonical, so no other producer or fixture changes.
- `CourseGlossary` now dedupes by slug; `ChapterGlossary` is unchanged.
- A new build-time error replaces the old one: two canonical
  definitions of one slug. The old "defined in multiple chapters" error
  is removed.

## References

- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md) (amended; F3 figure-canonical precedent)
- [ADR 0060 — Registry ecosystem](./0060-registry-ecosystem.md) (equation define-once/cite-many, unaffected)
- [ADR 0001 — Standalone platform / pre-launch no back-compat](./0001-platform-not-monorepo.md)
