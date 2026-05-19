---
date: 2026-05-18T00:00:00.000Z
tags:
  - architecture
  - schema
  - content-organization
  - registry
  - lds
  - reasoning-os
  - thesis
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0060: Registry Ecosystem

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0038](./0038-pedagogy-index-pattern.md), [0043](./0043-notation-registry-multirep-alignment-audit.md), [0044](./0044-misconception-graph-and-intervention-library.md), [0046](./0046-equation-biography.md), [0048](./0048-sophie-lds-content-plugins.md)
:::

## Context

Sophie's content architecture has grown two patterns side-by-side
without naming them:

- **Registry** — canonical declaration in its own file, referenced
  from chapters by ID. Today: `notation-registry.yaml` (ADR 0043),
  `intervention-index.ts` (ADR 0044), `figures.yml → figures.ts`
  (ADR 0008-era generator).
- **Collection** — authored inline in chapter MDX, extracted by the
  pedagogy index, aggregated for roll-up views. Today: KeyInsights,
  learning objectives, framing prose, and — *as of PR-7's chapter
  capstone* — equations, misconceptions, and definitions.

The split is functional today, but the *principle* dividing the two
has never been named. The result: equations and misconceptions sit in
the collection bucket even though they're universal-and-reusable
content that every chapter using them re-authors from scratch. PR-7
shipped three full `<KeyEquation>` biographies inline in
`spoiler-alerts.mdx`; the same Wien's law card is *also* authored
separately in `wiens-law-fixture.mdx`. Two slugs, two biographies,
guaranteed to drift.

The trigger for this ADR is Anna's question following PR-7: *can we
have one source of truth per equation, instead of authoring biographies
inline in every chapter?* The brainstorm broadened to **a registry
ecosystem** — a uniform set of platform conventions for declaring,
referencing, and auditing canonical pedagogy content — rather than a
one-off equations-registry feature.

Without this ADR:

1. Future canonical content types (worked examples, definitions,
   misconception nodes) have no platform convention to inherit. Each
   would re-invent its own storage shape, loader, audit hooks, and
   reference primitive.
2. ADR 0048's LDS Content Plugin System has no concrete *unit* to
   share between courses. "Cross-course content" stays abstract until
   there's a uniform shape every shared item follows.
3. AI authoring (ADR 0030) cannot target registry entries as
   small, focused files. Today's chapter-inline authoring forces the
   AI to edit the entire chapter MDX to update one equation's
   biography.
4. The audit machinery (NR1–NR4 for notation, E7–E10 for equations,
   I1–I3 for interventions) is bespoke per content type. Adding a
   new registry type means re-implementing orphan detection,
   dangling-ref detection, and schema validation from scratch.

## Decision

Sophie commits to a **Registry Ecosystem** governed by one bright-line
rule and six shared conventions.

**The rule**: content that is **universal + reusable** lives in a
**registry** (its own file, referenced from chapters by ID); content
that is **one-shot or instance-specific** stays **inline** in chapter
MDX (collection pattern).

**The six shared conventions** every registry follows:

1. **Storage** — an Astro content collection under
   `src/content/<name>/`. One file per entry. Prose-rich registries
   use MDX (frontmatter for structured fields, body for prose with
   Sophie components). Pure-data registries use YAML at the
   consumer-repo root.
2. **Schema** — Zod-validated frontmatter per ADR 0003. Each registry
   schema extends a shared `RegistryBaseSchema` carrying `{ id, title,
   tags?, version? }`.
3. **Loader** — a build-time loader function that reads the
   collection, validates entries against the schema, and returns
   typed entries. Per-registry loaders share a `loadRegistry<T>`
   helper.
4. **Audit primitives** — three universal hooks every registry
   inherits: orphan detection (declared but unreferenced),
   dangling-ref detection (refs that don't resolve), and
   schema-violation detection. Type-specific invariants (NR1–NR4,
   E7–E10, I1–I3) layer on top.
5. **Reference primitive** — every registry has an `<XxxRef refId>`
   component for in-prose citation, with hover popover + click-to-
   anchor. The existing `<EquationRef>`, `<FigureRef>`, `<GlossaryTerm>`,
   `<ChapterRef>`, `<TDRRef>` family becomes thin wrappers around a
   shared `<RegistryRef collection refId>` base.
6. **Aggregators** — every registry has `<ChapterXxx>` + `<CourseXxx>`
   server-rendered roll-ups (the pattern already in place for
   definitions, equations, key insights).

**Initial scope (Phase 1)**:

- **Equations registry** — primary target. Migrate PR-7's three
  inline biographies into per-equation MDX files.
- **Figures registry refactor** — already a registry in spirit;
  refactor `figures.yml → figures.ts` into one-file-per-entry MDX.
  Lands as proof the loader / audit / ref abstractions are
  reusable.

**Deferred (Phase 2+)**:

- Misconceptions registry (ADR 0044 §R8 already flagged for v2;
  PR-7 misconceptions are inline today and that's appropriate for
  one chapter).
- Definitions registry (currently inline `<Aside kind="definition">`).
- Worked-examples registry (inline with chapter for now).

## Rationale

Three forces drove the registry-ecosystem framing over the
narrower "equations-registry feature":

**Sophie already has the pattern; it just hasn't been named.**
Notation registry (ADR 0043), intervention library (ADR 0044), and
the figures-generator pipeline are all instances of the same shape:
canonical content in its own file, referenced from chapters by ID,
audited at build time, rolled up for course-level views. Naming the
shape costs nothing and unlocks structural-not-tactical reasoning
about future content types.

**The second consumer validates the abstractions.** ADR 0023
(vertical-slice-first) warns against pre-abstracting infrastructure
before a second consumer exists. The equations registry alone would
prove the pattern works *once*; bundling the figures refactor as
Phase 1 proves the abstractions hold across two registries. Without
that proof, the "shared loader / shared audit primitives" claim is
speculative.

**The plugin layer needs a unit.** ADR 0048 (LDS Content Plugin
System) anticipates cross-course content sharing — Sophie Astro's
equation registry imported by Sophie Compute, for example. That
sharing only makes sense if every shared item follows one shape.
Registries are the natural unit; without them, ADR 0048 stays
aspirational.

The bright-line rule (universal + reusable → registry) gives a
principled basis for promoting future content types without
re-litigating the architecture each time. Worked examples? Probably
inline today; promote when reuse pressure emerges. Misconceptions?
Inline post-PR-7; promote when cross-chapter reuse signals appear.

## Alternatives considered

- **Equations-registry feature, no ecosystem.** Build a one-off
  equations registry without claiming the pattern generalizes. Pros:
  smaller scope; less platform-level commitment. Cons: every future
  content type re-invents the wheel; ADR 0048's plugin layer stays
  abstract; the audit machinery doesn't get factored. Rejected
  because the abstractions are cheap to extract once a second
  consumer exists, and Sophie's content types will keep growing.

- **Single mega-registry file** (one YAML file per registry kind,
  multiple entries inside). Pros: matches Quarto's `eqcards.yml`
  shape Anna already knows. Cons: violates "one file per equation"
  ask; harms AI-authorability (each entry should be independently
  editable); makes per-entry version control murky; doesn't compose
  with prose-rich content. Rejected.

- **Promote everything immediately** (equations + misconceptions +
  definitions + worked examples in the same PR sequence). Pros:
  uniform end state in one push. Cons: scope blowout; YAGNI
  violation for content types without demonstrated reuse pressure;
  PR-7's misconceptions and inline definitions work fine in their
  current chapter context. Rejected for the deferred phases per
  ADR 0023's lean-first principle.

## Consequences

What this decision makes:

**Easier**:

- Adding a future registry (misconceptions, definitions, worked
  examples) is mechanical: one schema file extending
  `RegistryBaseSchema`, one loader call, audit primitives inherited,
  one `<XxxRef>` wrapper, two aggregators.
- AI authoring per ADR 0030 has small, focused targets — one MDX
  file per equation/figure/misconception, not full chapter rewrites.
- Cross-course content sharing per ADR 0048 has a concrete unit —
  registry entries with stable IDs and a uniform schema shape.
- The audit's machinery factors into universal primitives (orphan /
  dangling / schema) + type-specific invariants. Less duplication.

**Harder**:

- Authoring an equation now requires editing a separate file (not
  inline in the chapter MDX). Discoverability cost for first-time
  contributors.
- Chapter-side prose loses inline context for the equation's
  biography — chapter authors must point at the registry entry by
  `refId` and trust the rendered output for the full card. Sophie's
  chapter-side framing prose stays inline (rendered above the
  registry-pulled card), but the deep pedagogy is no longer co-
  located with the lecture flow.
- Migration cost: PR-7's three inline biographies migrate to
  registry files; chapter MDX shrinks; one-time refactor.

**Triggers** (follow-on work):

- **PR-A** (equations registry + ecosystem infrastructure): builds
  the shared loader, audit primitives, `<KeyEquation refId>` lookup,
  `<EquationRef>` cross-ref. Migrates PR-7's three equations.
- **PR-B** (figures registry refactor): one MDX file per figure;
  reuses PR-A's infrastructure. Validates the abstractions.
- **Future**: misconception registry (when cross-chapter reuse
  signals appear); definitions registry; worked-examples registry.
- ADR 0048's plugin layer extends naturally to cross-course
  registry imports once 2+ courses exist.

## References

- Brainstorm + plan: `~/.claude/plans/hi-claude-working-directory-cozy-penguin.md`
  (the conversation that locked the decisions in this ADR).
- [Vision page — Registry ecosystem](../vision/design/registry-ecosystem.md) —
  the thesis-level framing (audience: tenure letters, grant reviewers,
  prospective adopters).
- [ADR 0023 — Vertical-slice-first](./0023-vertical-slice-build-order.md) — the
  principle that justifies bundling figures as Phase 1 (the second
  consumer that proves the abstractions).
- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md) —
  amended to aggregate from both registry and collection sources.
- [ADR 0043 — Notation Registry + MultiRep](./0043-notation-registry-multirep-alignment-audit.md) —
  re-cast as an instance of the registry ecosystem.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md) —
  §R8 (`<MisconceptionRef>` deferred to v2) unblocked once the
  misconception registry exists in a future phase.
- [ADR 0046 — Equation Biography](./0046-equation-biography.md) —
  biography contract preserved; storage migrates from chapter-inline
  to registry.
- [ADR 0048 — LDS Content Plugin System](./0048-sophie-lds-content-plugins.md) —
  registries are the natural unit of cross-course content sharing.
- [ADR 0058 — Epistemic Component Contract](./0058-epistemic-component-contract.md) —
  the 8-role taxonomy survives unchanged; this ADR adds a second
  content-architecture axiom (the registry-vs-collection rule)
  parallel to it.
