---
title: Registry ecosystem — Sophie's content-architecture axiom
short_title: Registry ecosystem
description: Sophie's second content-architecture axiom (parallel to ADR 0058's 8-role epistemic contract). The bright-line rule that decides which canonical pedagogy content lives in a registry vs. inline in chapter MDX, and the shared platform conventions every registry follows. Frames equation, figure, misconception, and definition registries as instances of one platform pattern — not six one-off features.
tags: [vision, design, content-architecture, registry, reasoning-os, lds, thesis]
---

# Registry ecosystem

Sophie's content architecture rests on two axioms.

**Axiom 1 — Epistemic component contract** ([ADR 0058](../../decisions/0058-epistemic-component-contract.md)).
Every pedagogy element on a Sophie page has a recognizable epistemic
role from an eight-item taxonomy (observable, model, inference,
assumption, approximation, uncertainty, numerical, misconception).
The contract makes scientific reasoning structurally legible to the
audit, AI authoring, and theme-token layers.

**Axiom 2 — Registry ecosystem** (this doc, codified in
[ADR 0060](../../decisions/0060-registry-ecosystem.md)). Canonical
pedagogy content lives in **registries** (one file per entry,
referenced from chapters by ID). Instance-specific or one-shot
content lives **inline** in chapter MDX (collection pattern). One
bright-line rule decides which path each kind of content takes;
six shared platform conventions make all registries one ecosystem
rather than six independent features.

Axiom 1 says *what* pedagogy components mean. Axiom 2 says *where*
canonical content lives. Together they encode Sophie's distinguishing
claim: not just a textbook framework, but a **schema-driven, AI-
authorable platform whose content architecture is structurally
legible end-to-end**.

## The bright-line rule

Content earns a registry when **two properties hold at once**:

- **Universal** — the content has a canonical form that doesn't
  change by where it appears. Wien's law is Wien's law in every
  chapter that cites it. The Pillars-of-Creation figure is the same
  image whether it shows up in a star-formation chapter or a
  spectroscopy chapter.
- **Reusable** — the content could meaningfully appear in more than
  one chapter. An equation cited across three chapters; a
  misconception students bring in regardless of which lecture
  surfaces it; a defined term used in many sections.

Content that fails *either* test stays inline in chapter MDX:

- **Chapter framing prose** (the narrative arc, the spoiler reel,
  the "before we apply Wien's law to dust..." setup paragraph) is
  not universal — it's specific to a chapter's narrative voice.
- **Learning objectives, Predict prompts, ConfidenceCheck rubrics**
  are not reusable — they're scaffolds tailored to one chapter's
  pedagogical moment.
- **Key insights and per-chapter takeaways** could in principle be
  reusable, but they're written in chapter voice for a specific
  lecture's flow. Inline + collected for chapter-level summaries
  is the right shape.

The rule is descriptive, not prescriptive. If a content type fails
the test today but starts to reuse tomorrow, that's the *promotion
signal* — migrate it to a registry then. The audit can even detect
the signal automatically: duplicate slugs across chapters surface
as INFO findings ("promotion candidate"). Universal-and-reusable
content was always going to land in a registry; the only question is
when reuse pressure makes the migration obvious.

## Two patterns, one ecosystem

Sophie's content collections aggregate from **both** patterns at the
consumption side. A reader on `/equations` sees registry entries
roll up the same way a reader on `/key-insights` sees inline
chapter declarations roll up — the underlying source-of-truth
differs, but the pedagogy index abstracts over it.

| Pattern | Source of truth | Authored where | Extracted by | Example today |
|---|---|---|---|---|
| **Registry** | Own-file declaration | `src/content/<name>/<id>.mdx` (or `.yaml` for pure data) | Build-time loader + Zod validation | `notation-registry.yaml`, `intervention-index.ts`, figures (today's generated `figures.ts`) |
| **Collection** | Inline in chapter MDX | Chapter `.mdx` body | `pedagogy-index-extractor` walks the MDX AST | KeyInsights, learning objectives, framing prose |

Why both patterns? Because not all pedagogy content has the same
shape. The 8-role epistemic contract from Axiom 1 applies to *both*
— what differs is whether the content's canonical form lives in a
registry (one source of truth) or in chapter voice (one source per
chapter that happens to be aggregable).

## The six shared conventions

What makes the registry ecosystem an **ecosystem** rather than a
collection of independent registries is a small set of platform
conventions every registry follows. Most are already present in
Sophie in some form; the platform extracts the shared abstractions
so adding a future registry is mechanical.

1. **Storage** — every registry is an Astro content collection at
   `src/content/<name>/`. One file per entry. Prose-rich registries
   (equations, misconceptions, definitions, figures) use MDX —
   frontmatter for structured fields, body for prose with Sophie
   components. Pure-data registries (concepts) stay as YAML at the
   consumer-repo root.

2. **Schema** — every entry's frontmatter is Zod-validated per
   [ADR 0003](../../decisions/0003-zod-as-source-of-truth.md). Each
   registry schema extends a shared `RegistryBaseSchema` carrying
   `{ id, title, tags?, version? }`.

3. **Loader** — each registry has a build-time loader that reads its
   collection, validates against the schema, and returns typed
   entries. Per-registry loaders share a `loadRegistry<T>` helper.

4. **Audit primitives** — three universal hooks every registry
   inherits: orphan detection (entries declared but never
   referenced), dangling-ref detection (refs that point at
   non-existent entries), schema-violation detection. Type-specific
   invariants (NR1–NR4 for notation, E7–E10 for equations, I1–I3
   for interventions) layer on top.

5. **Reference primitive** — every registry has an `<XxxRef refId>`
   component for in-prose citation. The existing `<EqRef>`,
   `<FigureRef>`, `<GlossaryTerm>`, `<ChapterRef>`, `<TDRRef>`
   family becomes thin wrappers around a shared `<RegistryRef
   collection refId>` base. Hover popover + click-to-anchor
   behavior is uniform.

6. **Aggregators** — every registry has `<ChapterXxx>` +
   `<CourseXxx>` server-rendered roll-ups (the pattern already in
   place for definitions via `<ChapterGlossary>` /
   `<CourseGlossary>`, equations via `<ChapterEquations>` /
   `<CourseEquations>`, etc.).

The cost of a future registry is one schema file, one loader call,
the inherited audit primitives, one `<XxxRef>` wrapper, and two
aggregator components. **Adding a new registry is mechanical, not
architectural.** That's what makes the registry pattern an
ecosystem.

## What's in scope today

The initial registry ecosystem ships two registries:

- **Equations registry** ([PR-A](https://github.com/drannarosen/sophie/pulls)) — one MDX file per equation, with biography children (Observable, Assumption, Units, BreaksWhen, CommonMisuse from ADR 0046) plus net-new fields: constants table, rearranged forms, related-equation cross-refs, derivation step list. Chapter side becomes `<KeyEquation refId="wiens-law">` with optional chapter-specific framing prose; the deep pedagogy lives in the registry.
- **Figures registry refactor** ([PR-B](https://github.com/drannarosen/sophie/pulls)) — one MDX file per figure, replacing the generated `figures.ts`. Validates that PR-A's loader / audit / ref abstractions are genuinely reusable across registry types.

Deferred to future phases — these stay as **collection-pattern**
(inline + extract) until cross-chapter reuse pressure earns the
promotion:

- Misconceptions registry (ADR 0044 §R8 already flagged for v2).
- Definitions registry.
- Worked-examples registry.

## Why this serves the long-term thesis

Three positioning consequences worth naming explicitly:

**Cross-course content sharing becomes concrete.**
[ADR 0048](../../decisions/0048-lds-content-plugin-system.md)
articulates the LDS Content Plugin System as Sophie's path to
cross-course content reuse: Sophie Astro's equation registry imported
by Sophie Compute's algorithms course; Sophie Compute's algorithm-
analysis registry imported by Sophie Astro for numerical methods.
Plugin-style imports only make sense if every shared item follows
one shape. Registries are the natural unit of cross-course sharing,
and the ecosystem makes them uniform.

**AI authoring scales.** Per
[ADR 0030](../../decisions/0030-audience-and-ai-author-model.md),
Sophie expects AI as primary author with the instructor as
supervisor. Inline-in-chapter pedagogy forces the AI to edit
multi-thousand-line MDX files to update one equation's biography.
Registry entries are small, focused files — the natural unit of an
AI-authoring task. Each registry file is independently editable,
independently reviewable, independently version-controlled.

**The platform claim sharpens.** Sophie's distinguishing pitch
isn't "yet another MDX-based textbook framework." It's that
Sophie's component contract + content architecture jointly encode
the structure of scientific reasoning at the schema level. The
8-role epistemic contract names what components mean; the
registry-vs-collection axiom names where canonical content lives.
Both make scientific pedagogy structurally legible — to audits, to
AI authoring, to cross-course content imports, to any consumer
that wants to query the platform's content as data.

## Cross-references

- [ADR 0060 — Registry Ecosystem](../../decisions/0060-registry-ecosystem.md) — the decision record (this vision page's normative counterpart).
- [ADR 0058 — Epistemic Component Contract](../../decisions/0058-epistemic-component-contract.md) — Axiom 1; the parallel content-architecture commitment.
- [ADR 0038 — Pedagogy-index pattern](../../decisions/0038-pedagogy-index-pattern.md) — amended to aggregate both registry and collection sources.
- [ADR 0048 — LDS Content Plugin System](../../decisions/0048-lds-content-plugin-system.md) — what registries unlock at the cross-course layer.
- [Reasoning OS vision](../reasoning-os/index.md) — where the registry ecosystem sits in Sophie's broader thesis.
