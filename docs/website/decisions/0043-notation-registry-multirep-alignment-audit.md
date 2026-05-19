---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - notation
  - multirep
  - representation-alignment
  - audit
  - stem
  - lds
validation:
  status: in-progress
  last_validated_date: "2026-05-17"
  evidence:
    - kind: review
      ref: docs/reviews/2026-05-14-adrs-0040-0045-foundation-review.md
      date: "2026-05-14"
    - kind: manual
      ref: docs/website/reference/notation-registry-schema.md
      date: "2026-05-14"
      notes: "Reference doc shipped."
    - kind: manual
      ref: docs/website/reference/multirep-component.md
      date: "2026-05-14"
      notes: "MultiRep component reference doc shipped."
    - kind: manual
      ref: docs/plans/2026-05-17-multirep-design.md
      date: "2026-05-17"
      notes: "Phase 1 design hardening locked: render shape, pedagogy-index entry shape, ADR 0058 composition (epistemic_role on registry concept), RepCode deferral, PR cadence. See Revisions §R1–R4 below."
    - kind: deployment
      ref: null
      date: null
      notes: "Notation-registry audit invariants + runtime alignment checker pending. v1 implementation sprint scheduled (Phase 3 per session plan)."
  notes: "Schema + reference shape stable; 2026-05-17 design hardening locks the v1 ship-shape (3 Rep children, framed-card+grid render, epistemic_role on registry); audit + runtime code lands in Phase 3 sprint PRs α–ε."
---

# ADR 0043: Notation Registry + MultiRep + Representation Alignment Audit

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

STEM students fail to learn when a single concept presents
inconsistently across its representations. The prose says *"distance"*;
the equation uses *r*; the figure labels radius *R*; the code names
the variable `distance_pc`; the plot axis says *"separation"*. The
five surfaces are the *materially same concept* — but the *symbols
and language drift*. Each drift point is a friction the student must
resolve before they can think with the concept.

Sophie's existing infrastructure already captures every raw signal
this audit would need:

- [PR-C2](./0038-pedagogy-index-pattern.md)'s `equations` collection
  knows every `<KeyEquation>`'s `eqKey`, `tex`, `name`.
- [PR-C3](./0038-pedagogy-index-pattern.md)'s `figures` collection
  knows every `<Figure>`'s `name`, `alt`, `caption`.
- [PR-C4](./0038-pedagogy-index-pattern.md)'s definitions /
  glossary collection knows every `<Aside kind="definition">`'s
  term + concept.
- [ADR 0018](./0018-codemirror-6-for-codecell.md)'s `<CodeCell>`
  knows every code snippet's variable names.

What's missing is the *binding* — the explicit declaration that
"the prose `distance` + equation `r` + figure label `R` + code
`distance_pc` + plot axis `separation` are the same concept" — and
the *normative source of truth* the audit can check binding-internal
consistency against.

Three converging needs make this load-bearing:

1. **Representation alignment is the load-bearing STEM-learning
   move.** Per Ainsworth 2006 (DeFT framework), learning with
   multiple representations only works when the *translation between
   representations is supported*. Sophie's existing components
   represent concepts in many forms; without an explicit binding,
   the translation work falls on the student.

2. **AI authoring needs symbol stability.** When the future
   `sophie-chapter-author` workflow drafts a new chapter, it must
   know what symbols the course has already committed to using.
   Without a registry, AI drafts inconsistent notation that
   propagates into chapters and creates exactly the drift this ADR
   aims to prevent.

3. **Equation Biography** (per
   [`vision/features/backlog.md`](../vision/features/backlog.md) B1)
   depends on the Notation Registry as its foundation — a per-symbol
   provenance + history layer only makes sense when symbols are
   first-class entities with declared meaning.

This ADR is the fourth graduation through the
[staging-area lifecycle](../vision/transitions/index.md) — the
[`vision/features/accepted.md`](../vision/features/accepted.md) A4
entry surfaced the open ADR questions; this ADR resolves them.

It is the **first STEM-specific consumer-repo contract**. The Sophie
LDS conformance triple ratified by ADRs 0040/0041/0042 (TDRs +
Teaching Moves + Pedagogy Contract & AI Ledger) applies to *every*
Sophie course; this ADR's registry applies to *courses where
representation alignment matters*. ASTR 201 needs it; a hypothetical
Sophie-Compose course on creative writing wouldn't. The
`pedagogy-contract.yaml`'s `math_and_units_standards.notation_registry`
field (per ADR 0042) declares opt-in.

## Decision

Sophie ships three paired artifacts: a course-level **Notation
Registry**, a chapter-level `<MultiRep>` primitive, and a build-time
**Representation Alignment Audit** that checks both against each
other and against the existing pedagogy index.

### Artifact 1: `notation-registry.yaml` at consumer repo root

Each Sophie-LDS-compliant STEM course maintains a single top-level
YAML file alongside the pedagogy contract:

```
drannarosen/astr201/
  ├── pedagogy-contract.yaml      ← per ADR 0042
  ├── notation-registry.yaml      ← this artifact
  ├── teaching-decisions/         ← per ADR 0040
  └── src/content/...
```

The full schema spec lives at
[`reference/notation-registry-schema.md`](../reference/notation-registry-schema.md).
The registry declares **concepts** (the semantic unit) and binds
each concept to its canonical representations:

```yaml
concepts:
  - id: "orbital-radius"
    verbal_label: "orbital radius"
    canonical_symbol: "r"
    latex: "r"
    units: "cm (CGS); AU (display)"
    code_alias: "r_au"
    common_confusions:
      - symbol: "R"
        meaning: "stellar radius — reserved for the central body"
      - symbol: "d"
        meaning: "Earth-observer distance — different concept"
    introduced_in: "module-02/lecture-04"
    related_concepts: ["orbital-period", "semi-major-axis"]
```

The registry is **normative**: it declares what symbols a course
*commits to using* before chapters are written. Chapters are audited
*against* the registry, not the other way around. A descriptive
registry (derived from chapter walks) would only check chapters
against themselves — meaningless. The audit's value comes from the
registry being an *external source of truth*.

### Artifact 2: `<MultiRep>` component (children-mode)

Each chapter binds representations of a concept via a `<MultiRep>`
block. The component follows the **children-mode source pattern**
established by [PR-C4's LearningObjectives refactor](./0038-pedagogy-index-pattern.md) —
children declare data, the parent component renders + indexes:

```mdx
<MultiRep concept="orbital-radius">
  <RepVerbal>
    The distance from the central mass to the orbiting body.
    (Authoring tip: intuitive framings belong in prose here —
    e.g., "imagine an ant walking around the orbit; how far must
    it travel to reach the central mass?". The dedicated
    `<RepIntuition>` primitive was removed in the 2026-05-14
    hardening — prose handles it.)
  </RepVerbal>
  <RepEquation refKey="kepler-3rd-law" symbol="r" />
  <RepEquation
    refKey="kepler-3rd-law-au-form"
    symbol="r_au"
    equivalent_to="kepler-3rd-law"
    via="natural-units-substitution"
  />
  <RepFigure refName="orbit-geometry" symbolLabel="r" />
  <RepCode refName="orbit-simulation" symbol="r_au" />
</MultiRep>
```

Child element types and their referents (hardened 2026-05-14):

| Child | Purpose | References |
|---|---|---|
| `<RepVerbal>` | Plain-language description (including intuition framing) | Prose only |
| `<RepEquation refKey symbol [equivalent_to via]>` | Equation form | `<KeyEquation>` by `refKey`. Optional `equivalent_to=<refKey>` + `via=<substitution-slug>` for variable-substitution-equivalent forms (Wien's law λ-form vs ν-form; SI vs CGS; non-dimensionalized form) |
| `<RepFigure refName symbolLabel>` | Visual representation | `<Figure>` by `name` |
| `<RepCode refName [symbol] [external_url external_cache_hash external_version authored_by authored_date reviewed_by reviewed_date]>` | Code form | Two binding modes: in-chapter `<CodeCell>` by `name` (preferred), or external artifact requiring all eight external-mode attributes |
| ~~`<RepIntuition>`~~ | **DROPPED in 2026-05-14 hardening** — `<RepVerbal>` handles intuition framing in prose; the separate primitive added overhead without earning its keep | — |

A `<MultiRep>` block doesn't need every form — it declares the
*binding for the forms actually present*. A chapter may declare
verbal + equation + figure without code if no code representation
exists for that concept yet.

**`<RepCode>` two-mode binding (hardened 2026-05-14).** Code
artifacts can live in two places — preferred is in-chapter
`<CodeCell>`; alternative is an external artifact with full
provenance.

```mdx
<!-- In-chapter binding (preferred) -->
<RepCode refName="orbit-simulation" symbol="r_au" />
<!-- ... and somewhere in the chapter: -->
<CodeCell name="orbit-simulation" pedagogical_kind="predict-then-run">
  # python code here
</CodeCell>

<!-- External binding -->
<RepCode
  refName="orbit-simulation"
  symbol="r_au"
  external_url="https://github.com/drannarosen/astr201-demos/blob/v1.2/orbit.py"
  external_cache_hash="sha256:abc1234..."
  external_version="v1.2"
  authored_by="alrosen"
  authored_date="2026-05-14"
  reviewed_by="alrosen"
  reviewed_date="2026-05-14"
/>
```

External-mode requires all eight attributes (the `external_*` trio
+ four structured provenance fields). Half-specified external-mode
references are an audit ERROR (MR5; see Artifact 3).

**`<RepEquation equivalent_to>` for variable-substitution equivalents**
(hardened 2026-05-14). The optional `equivalent_to=<refKey>` +
`via=<substitution-slug>` attributes declare "this equation
describes the same concept under a known transformation."
Use cases:

- Wien's law in wavelength form (`λ_peak = b/T`) vs frequency
  form (`ν_peak = aT`); `via="planck-substitution"`.
- SI vs CGS expressions of the same law; `via="unit-system-conversion"`.
- Dimensional vs non-dimensional forms; `via="non-dimensionalization"`.
- Exact vs approximation forms (e.g., full relativistic Hubble vs `z << 1`
  approximation); `via="small-z-limit"`.

`via` is a free-form slug (no v1 platform catalog; same shape as
`<Assumption type=>` in ADR 0046's Equation Biography). Audit
invariant MR6 (INFO) verifies the `equivalent_to` target resolves
to a real `<KeyEquation>` or to another `<RepEquation>` in the
same MultiRep.

Full reference at
[`reference/multirep-component.md`](../reference/multirep-component.md).

### Artifact 3: Representation Alignment Audit (v1: 8 invariants)

The audit extends [PR-C4's `pedagogy-audit.ts`](./0038-pedagogy-index-pattern.md)
with two new invariant families:

**NR (Notation Registry) invariants**:

| ID | Severity | Check |
|---|---|---|
| **NR1** | WARNING | `<KeyEquation>` declares one or more symbols in its `symbols` metadata (see ADR 0038 §extractors) that are not present in `notation-registry.yaml`. "Primary" status is *not* assumed — every declared symbol on the equation is checked independently. Equations whose symbols are inherently per-derivation (e.g., generic *x*, *y* placeholders) opt out by marking them `transient: true` in the equation metadata. |
| **NR2** | INFO | Notation Registry declares a concept but no chapter references it (orphan declaration) |
| **NR3** | ERROR | Same symbol bound to different `concept.id`s across the registry (declaration collision) |
| **NR4** | WARNING | Symbol declared in registry with explicit units; `<KeyEquation>` uses it without unit context in prose |

**MR (MultiRep) invariants** (hardened 2026-05-14; MR5 + MR6 added):

| ID | Severity | Check |
|---|---|---|
| **MR1** | ERROR | `<MultiRep>` references a `concept` not present in `notation-registry.yaml` |
| **MR2** | WARNING | `<MultiRep><RepEquation refKey=… symbol=…>` — the explicitly-declared binding `symbol` doesn't appear among the referenced equation's declared symbols, *or* doesn't match the concept's `canonical_symbol` (or a declared alias) |
| **MR3** | WARNING | `<MultiRep><RepCode refName=…>` — the referenced code's variable name doesn't match the concept's `code_alias` |
| **MR4** | INFO | `<MultiRep><RepFigure refName=…>` — the referenced figure's `alt` text doesn't mention the concept's `verbal_label` or `canonical_symbol` |
| **MR5** (new) | **ERROR** | `<RepCode>` is half-specified: declares `external_url` without all of `external_cache_hash`, `external_version`, `authored_by`, `authored_date`, `reviewed_by`, `reviewed_date` — OR has none of these attributes AND no in-chapter `<CodeCell name="...">` matching `refName`. Severity raised from WARNING during the 2026-05-14 hardening because half-specified external code breaks audit reproducibility (an unversioned URL is a moving target). |
| **MR6** (new) | INFO | `<RepEquation equivalent_to="X">` — the target `X` doesn't resolve to a `<KeyEquation>` in the chapter's equation index OR to another `<RepEquation refKey="X">` in the same MultiRep. Authoring nudge for the equivalent-equation surface; not gated. |

Invariant severity rationale:

- **ERROR** invariants block the build (collision in the registry; binding to a non-existent concept). These represent inconsistencies that have no valid interpretation.
- **WARNING** invariants surface in the build report but don't block. These represent likely drift but might be intentional (e.g., a `<KeyEquation>` using a context-specific symbol the registry doesn't declare).
- **INFO** invariants surface as suggestions; the author may choose to address them or not.

The invariant list is **the v1 floor**, not the ceiling. New invariants are added via the ADR-revisions pattern (this ADR gains a `## Revisions §N` section).

### What lives in code vs. what lives in docs

This ADR + its two reference docs ship as **docs only**. The
schema enforcement code lands in a follow-up PR:

- `packages/core/src/schema/notation-registry.ts` — Zod
  `NotationRegistrySchema` matching the YAML structure.
- `packages/components/src/multirep/index.tsx` — `<MultiRep>`,
  `<RepVerbal>`, `<RepEquation>` (with optional `equivalent_to` +
  `via` attributes), `<RepFigure>`, `<RepCode>` (two binding
  modes: in-chapter + external) components with `serialize`
  separation per
  [ADR 0004](./0004-component-contract-revisions.md). **No
  `<RepIntuition>` component** — dropped in the 2026-05-14
  hardening; `<RepVerbal>` handles intuition framing in prose.
- `packages/components/src/multirep/multirep-index.ts` —
  pedagogy-index extractor (children-mode, per
  [PR-C4 precedent](./0038-pedagogy-index-pattern.md)).
- **10** new audit invariants added to
  `packages/astro/src/lib/pedagogy-audit/runner.ts` (was 8; MR5 + MR6
  added in 2026-05-14 hardening).
- A `<MultiRepRenderer>` UI that lets the reader toggle between
  representations (or view them side-by-side); design TBD in the
  code-PR's Storybook stories.

That code PR follows the standard branch + PR cadence per
[`feedback_branch_pr_scope`](../../../) memory and is expected to
be the largest follow-up PR of the three Sophie LDS contracts
(~1–2 weeks of implementation work).

### Opt-in via the Pedagogy Contract

A course declares it uses the Notation Registry by setting the
field in its `pedagogy-contract.yaml`:

```yaml
math_and_units_standards:
  notation_registry: "astr201"   # references this course's registry
```

Courses without this declaration are not audited for NR/MR
invariants. This preserves the ADR 0042 principle that the
Pedagogy Contract is the *opt-in mechanism* for course-level
standards; A4's STEM-specificity doesn't break the universal
Sophie LDS conformance triple.

## Rationale

### The structured-for-facts, prose-for-stances principle (introduced 2026-05-14)

Sophie's schemas across ADRs 0040–0046 follow a consistent pattern
that this ADR's hardening surfaced explicitly: **structured fields
for facts about specific things; prose fields for course-level
stances**. Facts are enumerable and recurrent (`authored_by`,
`reviewed_by`, `date`, `cache_hash`, `symbol`, `unit`); the schema
captures them so audits can verify and tools can query. Stances
are narrative and per-course (the instructor's position on AI
training data, primary-source policy, AI Ledger framing); the
schema captures only the *structural slot* (the field's
existence), the *content* is prose authored in the instructor's
voice.

Conflating the two — structuring stances or prose-ifying facts —
degrades both. A structured `primary_source_verification_method:
"independent"` field loses the normative force of the prose
*"all quantitative claims and historical citations are
independently verified against peer-reviewed sources or canonical
textbooks."* A prose `authored_by: "I think it was claude probably
around mid-May"` loses the audit-grade specificity of
`authored_by: "alrosen", authored_date: "2026-05-14"`.

Examples of the principle in practice:

- **`<RepCode>` external-mode provenance** (this ADR, hardened
  2026-05-14): structured (`authored_by`, `authored_date`,
  `reviewed_by`, `reviewed_date`) — facts about a specific code
  artifact.
- **`<Units>` in Equation Biography** (ADR 0046): structured
  (`symbol`, `unit`) — facts about an equation's symbol/unit pair.
- **`instructor_reviewed`** (ADR 0042): structured
  (`by`, `date`, `depth`, `against`) — facts about a specific
  review event.
- **`ai_training_provenance.known_limitations`** (ADR 0042
  contract): prose stance about training data.
- **`ai_ledger.preamble`** (ADR 0042 contract): prose stance
  framing the public Ledger.
- **`evidence_summary`** (ADR 0040 TDRs): prose narrative
  anchoring the evidence to specifics.
- **`<Observable>`, `<Assumption>` body, `<BreaksWhen>`,
  `<CommonMisuse>` body** (ADR 0046 biography): prose stances on
  the equation's meaning, assumptions, and limits.

The principle is cited from ADR 0046 and ADR 0042; this ADR
declares it as a cross-cutting design principle for the
foundation.

### Three artifacts paired beats one combined artifact

The Notation Registry is *course-level*; `<MultiRep>` is
*chapter-level*; the audit is *build-time*. They have different
granularities, different consumers, and different lifecycle
rhythms. Mixing them into a single artifact would force
course-level data into chapter source or vice versa.

The three-artifact split parallels ADR 0042's two-artifact split
(course-level YAML + per-chapter frontmatter): each artifact lives
at its natural granularity.

### Declarative YAML beats schema-driven derivation

The handoff framed the open question as YAML (declarative) vs
schema-driven derivation from `<KeyEquation>` + `<Figure>` +
`<CodeCell>` walks (implicit). The declarative answer wins on five
grounds:

1. **Normative vs. descriptive**. A registry derived from chapter
   walks can only describe what's already in the chapters; the
   registry's *purpose* is to constrain what authors write. An
   external source of truth is the only way the audit means
   anything.
2. **Pre-content authoring**. Anna declares ASTR 201's canonical
   notation before any chapter exists. The registry shapes the
   course design; the chapters fill in the declared shape.
3. **AI authoring grounding**. The future
   `sophie-chapter-author` workflow reads the registry as
   *binding constraints*. A derived registry would mean AI
   inherits whatever drift is already in the chapters.
4. **Equation Biography dependency**. Backlog B1 (Equation
   Biography) layers per-symbol provenance + history onto the
   registry. That layer only makes sense atop a declarative
   foundation.
5. **Parallel with ADR 0042**. The Pedagogy Contract is
   declarative YAML; the Notation Registry follows the same
   shape for the same reasons.

### One ADR over three smaller ADRs

The three sub-features are tightly coupled: `<MultiRep>` is
meaningless without a Notation Registry to bind to; the Alignment
Audit is meaningless without both. Splitting forces
forward-references that obscure rationale and creates artificial
phasing.

The precedent: ADR 0042 covered two artifacts (pedagogy contract +
ai contribution ledger) as one coherent ADR; ADR 0041 covered the
move library + the centralized TS map binding. One-ADR-per-coherent-
shape is the pattern.

Anna's "build the best now, plan ahead" preference points the same
direction: a unified ADR is the long-term-correct shape; splitting
would be "what's simple now causing more work later" (cross-ADR
references, half-shipped binding without the audit, etc.).

### Children-mode component pattern over inline props

`<MultiRep>` uses children-mode (`<MultiRep><RepEquation .../></MultiRep>`)
rather than inline-props (`<MultiRep items={[…]} />`) per the
established [PR-C4 LearningObjectives refactor](./0038-pedagogy-index-pattern.md)
shape:

- Extraction is mechanical (the pedagogy-index extractor walks
  children and produces the index entries).
- AI scaffolding is reliable (each child element is a small,
  named, structured slot).
- JSX is more readable for human authors than nested prop arrays.

### v1 invariant set: 8 invariants is the right floor

Fewer than ~6 invariants leaves gaps in the binding (the whole
point of the audit is catching cross-representation drift; missing
NR1 or MR1 makes the audit toothless). More than ~12 invariants at
v1 is premature — most invariants beyond the first 8 are either
edge-case refinements that should follow real authoring experience,
or speculative checks for unshipped representation types.

The 8 listed cover the four representation surfaces (equation,
figure, code, prose) × the two failure modes (the registry is
incomplete / the binding doesn't match the registry).

### Opt-in via Pedagogy Contract over universal mandate

Sophie aims to serve STEM courses *primarily* but not exclusively.
A Sophie-Compose creative-writing course or a Sophie-History
intellectual-history course doesn't have a meaningful Notation
Registry. Forcing universal opt-in would either bloat non-STEM
courses with empty registries or block them from being Sophie-LDS-
compliant.

The `pedagogy-contract.yaml.math_and_units_standards.notation_registry`
field is the natural opt-in: courses declaring math/units
standards already opt into a STEM framing; the registry follows.

## Consequences

### For Sophie-the-platform (this commit)

This commit ships **docs only**:

1. ADR 0043 (this file).
2. [`reference/notation-registry-schema.md`](../reference/notation-registry-schema.md).
3. [`reference/multirep-component.md`](../reference/multirep-component.md).
4. `myst.yml` registers all three.
5. `vision/features/accepted.md` collapses A4 to graduated pointer.
6. `vision/features/index.md` notes fourth graduation.

### For Sophie-the-platform (future code PR)

The largest of the consumer-repo-contract follow-up code PRs
(~1–2 weeks of work):

1. `packages/core/src/schema/notation-registry.ts` —
   `NotationRegistrySchema`.
2. Six new components: `<MultiRep>`, `<RepVerbal>`,
   `<RepEquation>`, `<RepFigure>`, `<RepCode>`, `<RepIntuition>`.
3. Pedagogy-index extractor for `<MultiRep>` children-mode.
4. Eight new audit invariants (NR1–NR4, MR1–MR4).
5. `<MultiRepRenderer>` UI surface (toggle / side-by-side).
6. Storybook stories per component.
7. axe-core a11y tests per [ADR 0004](./0004-component-contract-revisions.md).

### For consumer repos (opt-in)

A Sophie-LDS-compliant STEM course that adopts the registry needs:

1. `notation-registry.yaml` at the repo root.
2. `pedagogy-contract.yaml.math_and_units_standards.notation_registry`
   declared to opt in.
3. Concept-rich chapters wrapped in `<MultiRep>` bindings where
   the alignment matters.

Non-STEM courses (and STEM courses that don't declare the
registry) are unaffected.

### For TDRs (per [ADR 0040](./0040-teaching-decision-records.md))

A TDR may cite a Notation Registry decision when a curriculum
choice depends on declared symbols. Example: a TDR introducing
"redshift *z*" in Module 4 cites the registry entry that
distinguishes *z* (redshift) from *Z* (atomic number) — the
common-confusions field is the rationale source.

### For the Teaching Move Library (per [ADR 0041](./0041-teaching-move-library.md))

The **Multiple representations binding** move from the library
maps directly to `<MultiRep>`. The future `move-index.ts` will
declare:

```ts
MultiRep: ["multiple-representations-binding"],
```

A chapter that explicitly invokes the move (e.g., in a TDR) now
has a *component-level affordance* to express it, not just prose.

### For the Pedagogy Contract (per [ADR 0042](./0042-pedagogy-contract-and-ai-contribution-ledger.md))

The contract's `math_and_units_standards.notation_registry` field
becomes load-bearing. A course declaring `require_units: true` +
`notation_registry: "astr201"` gains automated audit support
for unit + notation consistency.

### For AI authoring (future)

The `sophie-chapter-author` workflow reads `notation-registry.yaml`
as binding context. AI drafting a new chapter on orbital
mechanics:

1. Looks up `orbital-radius` in the registry → sees
   `canonical_symbol: r`, `units: cm`, `code_alias: r_au`,
   common confusions with *R* and *d*.
2. Drafts prose using *r*, not *R* or *d*.
3. References `<KeyEquation>` entries via the declared `eqKey`.
4. When introducing a new concept not in the registry, AI
   *proposes* a registry entry as part of the chapter draft — the
   instructor reviews + accepts before the chapter is published.

### For SoTL paper + tenure case

The Representation Alignment Audit is a citable methods
artifact. Paper-1-methods can describe "Sophie audits notation
consistency across N representations using build-time invariants
NR1–NR4 + MR1–MR4 against a course-level Notation Registry" as
*structural support for representation-aware curriculum*. The
combined ADR 0040–0043 chain — TDRs + Moves + Contract + Notation
— forms a publishable model of *AI-supported responsible
curriculum design*.

### For Equation Biography (backlog B1)

B1 layers per-symbol provenance (who introduced the symbol; what
historical context; what cognitive precedents exist) onto the
Notation Registry. This ADR's declarative shape is the foundation
B1 builds on. When B1 graduates, its ADR will extend the registry
schema (likely via a `provenance:` field per concept) rather than
introducing a parallel structure.

### For Cosmic Playground demos (per [ADR 0008](./0008-cosmic-playground-protocol.md))

*Speculative pending Phase 4 design.* `<RepCode>` currently
references `<CodeCell>` (ADR 0018) entries by `name`. A future
extension could allow `<RepCode>` to reference a Cosmic Playground
demo slug — binding the demo as the concept's interactive
representation — but this requires manifest-schema work on Cosmic
Playground's side (ADR 0008's manifest doesn't yet expose
per-demo concept-bindings) and is *not* committed by this ADR.
Listed here only to flag the surface for future design.

## Alternatives considered

### Schema-driven derivation (descriptive registry)

Build the registry by walking `<KeyEquation>` + `<Figure>` +
`<CodeCell>` and aggregating their symbols. Reject — see
Rationale §2. A descriptive registry can only check chapters
against themselves; the audit has no external truth to compare
against.

### Three separate ADRs (one per sub-feature)

Split into ADR 0043 (Notation Registry), ADR 0044 (`<MultiRep>`),
ADR 0045 (Alignment Audit). Reject — see Rationale §3. The
sub-features are too tightly coupled; splitting creates
artificial phasing and forward-reference clutter.

### Inline-props `<MultiRep items={[…]} />`

Instead of children-mode, declare representations as a prop
array. Reject as a regression from the
[PR-C4 LearningObjectives refactor](./0038-pedagogy-index-pattern.md) —
extraction would require parsing JSX-in-prop-values, AI
scaffolding becomes brittle, and human authors lose readability.
The children-mode pattern is the established Sophie convention.

### Universal-mandate (no opt-in)

Require every Sophie-LDS course to have a Notation Registry.
Reject — see Rationale §6. Non-STEM courses would carry empty
registries; the opt-in via Pedagogy Contract preserves the
universal triple (ADRs 0040/0041/0042) while letting STEM-specific
contracts layer cleanly.

### Per-concept declaration in chapter frontmatter

Move the registry into chapter MDX frontmatter (each chapter
declares its concepts). Reject — symbols span chapters; a
chapter-scoped declaration cannot detect cross-chapter collisions
(NR3), cannot serve as pre-content authoring scaffolding, and
duplicates declarations every time a concept reappears.

### No `<MultiRep>` component — derive binding from index alone

Skip the explicit chapter-level binding; let the audit infer
which representations belong to which concept from co-located
`<KeyEquation>` + `<Figure>` + `<CodeCell>` calls. Reject as
fragile: co-location is a weak signal (a chapter section may
discuss multiple concepts; co-located components may represent
different ones). Explicit binding via `<MultiRep>` is the
unambiguous source.

### Larger v1 invariant list (15+ invariants)

Front-load invariants for representations not yet in Sophie
(narrated-audio variable readings, dimensional-analysis checks,
unit-conversion verification, etc.). Reject as speculative — the
v1 list covers Sophie's existing components; further invariants
follow real authoring experience.

## References

- [`reference/notation-registry-schema.md`](../reference/notation-registry-schema.md)
  — the YAML schema spec + ASTR 201 example.
- [`reference/multirep-component.md`](../reference/multirep-component.md)
  — the `<MultiRep>` component reference + child-element specs +
  authoring example.
- [ADR 0038 — pedagogy index pattern](./0038-pedagogy-index-pattern.md)
  — children-mode source pattern + audit-invariant precedent.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDRs may cite registry entries.
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md)
  — `<MultiRep>` implements the *multiple-representations-binding* move.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `math_and_units_standards.notation_registry` is the opt-in field.
- [ADR 0004 — component contract revisions](./0004-component-contract-revisions.md)
  — `serialize` separation + a11y testing applies to all five new components.
- [ADR 0008 — Cosmic Playground protocol](./0008-cosmic-playground-protocol.md)
  — speculative future extension; a `<RepDemo>` child element could
  bind Cosmic Playground demos as the interactive representation of
  a concept, but not committed by this ADR (see Consequences).
- [ADR 0046 — Equation Biography](./0046-equation-biography.md) —
  the `<Units>` biography child uses structured form (symbol +
  unit) following the principle declared in this ADR's Rationale.
- [ADR 0048 — Sophie LDS Content Plugin System](./0048-sophie-lds-content-plugins.md)
  — future cross-course catalog inheritance; v1 ships the seam
  empty, populated as ASTR 201 + COMP 521 reveal real recurrence
  patterns.
- [`vision/features/accepted.md`](../vision/features/accepted.md) A4
  — the staging-area entry this ADR graduates.
- [`vision/features/backlog.md`](../vision/features/backlog.md) B1
  (Equation Biography, now graduated as ADR 0046) — layers provenance
  on this registry.

### Key cognitive-science citations

- Ainsworth, S. (2006). DeFT: A conceptual framework for considering
  learning with multiple representations. *Learning and Instruction*,
  16(3), 183–198.
- diSessa, A. A. (2004). Metarepresentation: Native competence and
  targets for instruction. *Cognition and Instruction*, 22(3),
  293–331.
- Kozma, R. (2003). The material features of multiple
  representations and their cognitive and social affordances for
  science understanding. *Learning and Instruction*, 13(2), 205–226.

Full citations in [`reference/teaching-moves.md`](../reference/teaching-moves.md)
under *multiple-representations-binding*.

## Revisions (2026-05-17 — Reasoning OS Core Phase 1 hardening)

The Reasoning OS pedagogical-core sprint surfaced two deltas to the
locked ADR 0043 contract while resolving the surfaces the 2026-05-14
hardening pass explicitly deferred (rendering shape, pedagogy-index
entry shape, composition with ADR 0058). Full design lockup at
[`docs/plans/2026-05-17-multirep-design.md`](../../plans/2026-05-17-multirep-design.md).

### R1 — `<RepCode>` deferred from v1 contract

v1 of the MultiRep sprint ships `<RepVerbal>` + `<RepEquation>` +
`<RepFigure>` only. `<RepCode>` requires `<CodeCell>` (ADR 0018) as
a binding target for the in-chapter mode; `<CodeCell>` is not in
scope for the Reasoning OS core sprint and is not yet shipped as a
component. Rather than force `<RepCode>` to ship external-only at v1
(8 required attributes per binding is a heavy authoring tax with no
in-chapter alternative), the v1 contract is explicitly a subset of
the locked ADR 0043 shape.

Audit-invariant consequence: **MR3 + MR5 are deferred with `<RepCode>`**.
v1 audit surface = NR1–NR4 + MR1, MR2, MR4, MR6 (8 invariants total).
MR3 + MR5 ship in the follow-on sprint that brings `<RepCode>` +
`<CodeCell>` together.

The deferral is non-breaking: `SerializedRep` is a Zod
`discriminatedUnion("kind", ...)` at v1, so adding `kind: "code"`
later is a one-line schema bump. The runtime renderer uses
`default:` + `console.warn` (not `throw`) on unknown kinds, so older
runtimes encountering v2 RepCode bindings degrade gracefully.

### R2 — Notation Registry concept gains optional `epistemic_role:` field (ADR 0058 binding)

The Notation Registry concept schema (§Artifact 1) gains an optional
field:

```yaml
concepts:
  - id: "orbital-radius"
    verbal_label: "orbital radius"
    canonical_symbol: "r"
    epistemic_role: "observable"        # NEW — ADR 0058 enum, optional
    ...
```

`epistemic_role` references the 8-role taxonomy locked in
[ADR 0058](./0058-epistemic-component-contract.md). The decision lifts
role from "a per-component declaration" to "a per-concept declaration
in the canonical concept catalog." Rationale:

- Role is a property of the *concept*, not of any single chapter's
  invocation of it. Lifting to the registry avoids per-MultiRep
  re-declaration.
- **The registry becomes the canonical concept-catalog for ALL
  Reasoning OS components.** Future composites (`<OMIFlow>`,
  `<UncertaintyLens>`, `<AssumptionStack>` per ADR 0058's A8–A11
  registry) bind to the same source — the schema is the long-lived
  contract for the entire Reasoning OS surface, not a MultiRep-specific
  artifact.
- AI authoring per ADR 0030 can query "show me every `observable`
  concept introduced in Module 2" without consulting a separate
  lookup table.

`<MultiRep>` itself carries no `epistemicRole` prop; the extractor /
audit / renderer resolve role via registry lookup. The field is
optional at v1 — concepts without declared role are valid (audit
treats as "unknown role"; consumers gracefully degrade).

This revision is non-breaking: `NotationRegistrySchema` adds one
optional field. Existing registries without the field continue to
parse and validate.

### R3 — `<RepIntuition>` drop (2026-05-14) re-confirmed

The 2026-05-14 hardening dropped the `<RepIntuition>` child primitive.
The 2026-05-17 design hardening re-confirmed: intuition framing
belongs in `<RepVerbal>` prose (use a leading "Think of this as…"
sentence). No `<RepIntuition>` component ships at any v1.

### R4 — Render shape locked: framed card + responsive grid + role pills + canonical order

The "Reader-facing behavior" section of the multirep-component
reference was explicitly TBD ("design TBD in follow-up code PR"). v1
locks:

- **Framed binding card** with concept `verbal_label` inset into the
  top border; anchor `mr-<concept-slug>`
- **Responsive CSS Grid** inside the card (side-by-side on wide,
  single-column stack on narrow / print)
- **Role pill per child** (`[verbal]` / `[equation]` / `[figure]`)
- **Canonical render order**: verbal → equation → figure regardless
  of source order
- `<MultiRep order>` and `<MultiRep display>` props accepted at v1
  (renderer ignores; reserved for v2 alternative modes)

The "layout" prop's `"toggle"` / `"side-by-side"` / `"stack"` enum
documented in the reference is superseded — v1 ships the responsive
grid uniformly and the `display=` prop is reserved (no-op) for v2
alternative modes.

### R5 — NR1 / NR3 / NR4 deferred from PR-δ to PR-δ' (KeyEquation `symbols` metadata prerequisite)

The PR-δ audit sprint (merged 2026-05-17 as
[PR #86](https://github.com/drannarosen/sophie/pull/86)) ships the
Notation Registry loader + opt-in gate + 5 invariants (MR1 ERROR,
MR2 WARNING, MR4 INFO, MR6 INFO, NR2 INFO). The 3 NR-prefix
invariants that the §Artifact-3 audit table specifies — NR1, NR3,
NR4 — are deferred to a follow-on PR-δ' because they consume
**per-equation `symbols` metadata** that `EquationEntrySchema`
(in `@sophie/core`) doesn't yet carry.

Original §Artifact-3 §NR1 cell text:

> `<KeyEquation>` declares one or more symbols in its `symbols`
> metadata (see ADR 0038 §extractors) that are not present in
> `notation-registry.yaml`.

That presupposed a `KeyEquation.symbols` field that no PR has yet
added. v1 `EquationEntrySchema` is `{ slug, title, number, tex,
body, chapter, anchor }` — no `symbols` array.

The 2026-05-17 scope decision matches the same pattern as PR-γ's
`<RepCode>` deferral (§R1 above): ship what's structurally complete,
flag what requires upstream schema bumps, name the follow-on sprint.

**PR-δ' scope** (small follow-on):

1. Extend `KeyEquationPropsSchema` in `@sophie/components` with an
   optional `symbols: string[]` prop — author-declared, not extracted
   from TeX heuristics (TeX parsing is fragile per the 2026-05-17
   design conversation).
2. Extend `EquationEntrySchema` in `@sophie/core` with
   `symbols: string[]` (defaults to `[]` for forward-compat with
   pre-PR-δ' indexes — same shape as the `multiReps` default added
   in PR-γ).
3. Extend `extractEquations` in `@sophie/astro/src/lib/pedagogy-index-extractor.ts`
   to harvest the `symbols` prop.
4. Add the 3 audit invariants to `pedagogy-audit.ts`:
   - **NR1** WARNING — `<KeyEquation symbols=[…]>` declares a symbol
     not present in `notation-registry.yaml`. Equations whose
     symbols are inherently per-derivation (generic *x* / *y*
     placeholders) opt out by marking them `transient: true` in the
     equation metadata (per §Artifact-3 §NR1 cell hardening).
   - **NR3** ERROR — same symbol bound to different `concept.id`s
     across the registry (declaration collision).
   - **NR4** WARNING — symbol declared in registry with explicit
     units; `<KeyEquation>` uses it without unit context in prose.

NR3 is **registry-only** (it walks the registry's concepts, not
chapter equations) so it could technically ship in PR-δ — but the
2026-05-17 scope decision groups all three NR-prefix invariants
into PR-δ' for coherence with the `symbols`-metadata deliverable.

This revision pairs with the JSDoc deferral note in
[`packages/astro/src/lib/pedagogy-audit/runner.ts`](../../../packages/astro/src/lib/pedagogy-audit/runner.ts)
("Not implemented in v1" block) and the AuditExtras.notationRegistry
TODO for PR-ε's `TextbookLayout.astro` loader wire-up.

**Update 2026-05-18 — R5 closed**: PR-δ'
([PR #94](https://github.com/drannarosen/sophie/pull/94), squash-merged
to main) shipped all three deferred invariants, plus the
`KeyEquation.symbols: string[]` prop and `EquationEntrySchema.symbols`
schema slot that they consume:

- **NR1 WARNING** — `<KeyEquation symbols=[…]>` declares a symbol
  not in `notation-registry.yaml` ([pedagogy-audit.ts:963](../../../packages/astro/src/lib/pedagogy-audit/runner.ts)).
- **NR3 ERROR** — Notation Registry symbol bound to multiple concepts
  ([pedagogy-audit.ts:989](../../../packages/astro/src/lib/pedagogy-audit/runner.ts)).
- **NR4 WARNING** — `<KeyEquation symbols=[…]>` declares a symbol
  whose registry concept has `units:` but the equation lacks a
  `<Units symbol="…">` biography child ([pedagogy-audit.ts:1022](../../../packages/astro/src/lib/pedagogy-audit/runner.ts)).

The NR2 invariant was also modified in PR-δ' to count `KeyEquation.symbols`
as a reference signal (in addition to the v1 `<MultiRep concept=…>`
signal), so symbols declared on an equation but never used in a
`<MultiRep>` no longer fire a misleading NR2 INFO. The Phase B
Reasoning OS core audit (2026-05-17) confirmed the deferral closed
and the audit-header docstring drift was repaired in PR-A
([PR #95](https://github.com/drannarosen/sophie/pull/95)).

The `transient: true` opt-out clause for generic per-derivation
placeholders did NOT ship — authors opt out at v1 by simply not
declaring those symbols on `KeyEquation.symbols`. Reserved as a v2
schema extension if a real consumer ever needs it.

## Revisions (2026-05-18 — Registry ecosystem amendment)

### R8 — Notation registry is one instance of the registry-ecosystem pattern

[ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md) names
the shape ADR 0043 has been implementing all along. The notation
registry is now formally **one instance of a platform pattern** that
also covers equations (PR-A) and figures (PR-B), with misconception,
definition, and worked-example registries to follow in future phases.

The ADR 0043 contract is unchanged. The framing changes:

- **Then**: "Notation Registry is a domain-specific symbol/unit
  catalog with bespoke loader, schema, and audit invariants."
- **Now**: "Notation Registry is one entry in a platform registry
  ecosystem. Its loader, schema, and NR1–NR4 audit invariants
  factor into shared primitives + type-specific layers."

The notation registry differs from the other Phase-1 registries
(equations, figures) in one specific way: it stores **pure-data
concept entries** (id, verbal_label, canonical_symbol, units,
epistemic_role) — no prose. ADR 0060 lets pure-data registries stay
as YAML at the consumer-repo root (the existing
`notation-registry.yaml` shape), while prose-rich registries use
Astro content collections at `src/content/<name>/`. The shared
loader / audit / ref-primitive abstractions cover both storage
modes.

### R9 — `<RegistryRef>` family wraps existing reference primitives

ADR 0060's reference-primitive convention generalizes the existing
`<EquationRef>`, `<FigureRef>`, `<GlossaryTerm>`, `<ChapterRef>`,
`<TDRRef>` family. Each becomes a thin wrapper over a shared
`<RegistryRef collection refId>` base. The author-facing names and
APIs don't change; the implementation layers a shared
hover-card + hydration + back-link path under the surface.

No notation-registry-specific action is needed at the ADR 0043
level — concepts continue to be cited inline by `<MultiRep
concept="…">` and indirectly through `<KeyEquation symbols={[…]}>`.
The framework extension is purely platform-internal.
