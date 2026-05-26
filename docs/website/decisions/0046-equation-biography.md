---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - equations
  - key-equation
  - audit
  - lds
status: shipped
validation:
  status: in-progress
  last_validated_date: "2026-05-17"
  evidence:
    - kind: manual
      ref: docs/website/reference/equation-biography-schema.md
      date: "2026-05-14"
      notes: "Reference doc shipped."
    - kind: test
      ref: packages/components/src/components/KeyEquation/KeyEquation.test.tsx
      date: "2026-05-12"
      notes: "Underlying KeyEquation component tested; biography frontmatter not yet exercised."
    - kind: manual
      ref: docs/plans/2026-05-17-equation-biography-design.md
      date: "2026-05-17"
      notes: "Phase 1 design hardening locked: explicit epistemicRole const per biography component (greenfield ADR 0058 binding), Wien's law smoke fixture, PR cadence α→β→γ→δ. See Revisions §R1–R6 below."
    - kind: deployment
      ref: null
      date: null
      notes: "6 biography components + render-surface updates (EquationRef hover, ChapterEquations, CourseEquations) + transformEquationBiography + E7/E8/E9 audit invariants pending. v1 implementation sprint scheduled (Phase 3 per session plan)."
  notes: "Schema + reference doc stable; 2026-05-17 design hardening locks the v1 ship-shape (6 biography children with hardcoded epistemicRole const, bundled render updates in PR-β, Wien's law smoke fixture); runtime biography surface + E7/E8/E9 audit invariants land in Phase 3 sprint PRs α–δ."
---

# ADR 0046: Equation Biography

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

[PR-C2 (commit 7c6a3f3)](./0038-pedagogy-index-pattern.md) shipped
`<KeyEquation>` as the source-of-truth component for the equations
collection in the pedagogy index (the chapter-inline `id title` shape;
later migrated to `<KeyEquation refId>` registry citations per
[ADR 0060](./0060-registry-ecosystem.md)). The component currently
captures the equation's anchor, a human title, and a single
`$$...$$` math body block. Everything else — what the equation
*observes*, what it *assumes*, where it *breaks*, what students
*commonly misuse* — lives in surrounding prose if it lives anywhere.

ASTR 201's Wien's law illustrates the gap. The equation is
`λ_peak = b T^{-1}`. The pedagogically load-bearing context is:
the equation observes the peak wavelength of *thermal* emission;
it assumes thermal equilibrium and a blackbody source distribution;
it breaks for non-thermal emission (synchrotron, masers, line
emission); students commonly misuse it on absorption-line spectra
or for non-thermal sources. None of that lives at the equation in
source; it lives — when it lives at all — scattered across the
chapter's prose, and is invisible to the audit + diff tooling
(ADRs 0038, 0043, 0045) that operates on the structured pedagogy
index.

This ADR makes the equation's biography first-class. The biography
is authored *at* the equation (children of `<KeyEquation>`) rather
than in surrounding prose; it surfaces in the three existing
rendering surfaces (`<EquationRef>` hover, `<ChapterEquations>` end-of-
chapter roll-up, `<CourseEquations>` `/equations` route); and it
adds three new E-prefix audit invariants that fire only when
biography children are present.

This ADR is the **seventh graduation** through the
[staging-area lifecycle](../vision/transitions/index.md) — the
[`vision/features/accepted.md`](../vision/features/accepted.md) A7
entry was promoted from backlog [B1](../vision/features/backlog.md)
on 2026-05-14 after a six-question brainstorm. It is the **first
feature-tier ADR post-foundation** (A1–A6 / ADRs 0040–0045 shipped
the LDS-conformance-and-revision-discipline foundation; A7 extends
an existing platform primitive with a richer schema, rather than
adding a new contract or a new tool).

A7 is **universal in scope** with **per-equation opt-in by
authoring**: there is no new Pedagogy Contract gate; courses that
don't author biography children see no change. The three new audit
invariants only fire when biography children are present, so non-
biography-using chapters incur no new audit noise.

## Decision

Sophie ships **one paired artifact**: a children-mode extension to
`<KeyEquation>` with six new biography child components, three
context-tuned rendering surfaces, and three new E-prefix audit
invariants. No new component category, no new contract on content,
no new Pedagogy Contract field — the children-mode pattern reuses
the LearningObjectives / MultiRep / Intervention precedent verbatim.

### Artifact 1: Children-mode `<KeyEquation>` extension

The existing `<KeyEquation id title>` shell continues to accept its
`$$...$$` math body as a child. It now *additionally* accepts six
optional sibling children, in any order, any number of times:

```mdx
<KeyEquation id="wiens-law" title="Wien's Law">
  $$\lambda_{peak} = b \, T^{-1}$$

  <Observable>
    Peak wavelength of thermal emission as a function of
    temperature.
  </Observable>

  <Assumption type="thermal-equilibrium">
    Source is in local thermodynamic equilibrium so the Planck
    distribution applies.
  </Assumption>

  <Assumption type="blackbody">
    Source emits as an ideal blackbody (no spectral lines, no
    continuum absorption shaping the peak).
  </Assumption>

  <Units symbol="T" unit="K" />
  <Units symbol="\lambda_{peak}" unit="cm" />

  <BreaksWhen>
    Non-thermal emission (synchrotron, masers, line emission);
    optically-thin sources without thermal coupling.
  </BreaksWhen>

  <CommonMisuse misconception="wiens-law-absorption-spectra">
    Applying Wien's law to identify the temperature of an
    absorption-line spectrum. The peak position depends on the
    continuum, not the absorption features.
  </CommonMisuse>
</KeyEquation>
```

**The six biography children:**

| Component | Body | Attributes | Purpose |
|---|---|---|---|
| `<Observable>` | prose | none | What real-world quantity the equation describes — its observational meaning. |
| `<Assumption>` | prose | optional `type=<slug>` | An assumption the equation encodes. `type=` is an informational slot (no v1 platform catalog; reserved for future cross-ref work). |
| `<Units>` | empty | required `symbol`, required `unit` | Declares one symbol's unit. Multiple `<Units>` children allowed per equation. |
| `<BreaksWhen>` | prose | none | Regime where the equation no longer applies. |
| `<CommonMisuse>` | prose | optional `misconception=<slug>` | A common student misuse. Optional cross-ref into the A5 misconception graph. |
| (no Title child) | — | — | The equation's title stays as `<KeyEquation title=…>` prop, unchanged from PR-C2. |

All six children are **optional**. A `<KeyEquation>` without
biography children is identical to its PR-C2 behavior (math body
+ title only); existing chapters do not break. Any subset of
biography children is valid. Repeating `<Assumption>` or
`<Units>` is encouraged (most equations have multiple of each).

The children-mode pattern is identical to PR-C4 LearningObjectives,
ADR 0043 MultiRep, ADR 0044 Intervention — same authoring
ergonomics, same extractor pattern (the remark/MDX walker
populates `PedagogyIndex.equations[i].biography` from children).

### Artifact 2: Three rendering surfaces, detail-tuned

All three rendering surfaces already exist for plain `<KeyEquation>`
(per ADR 0038 / PR-C2 / PR-C4). A7 changes the *render layer* of
each to surface biography fields at context-appropriate detail.

**Surface 1: `<EquationRef>` hover preview (compact).**

The existing `<EquationRef refId="wiens-law">` hover card shows title +
KaTeX-rendered math (PR-C2 behavior). Post-A7, it adds a compact
summary line below the math:

```text
┌─────────────────────────────────────────┐
│ Wien's Law         $$λ_peak = b T⁻¹$$   │
│ 2 assumptions · 1 misuse                │
│ valid in: thermal equilibrium           │
└─────────────────────────────────────────┘
```

Summary content:

- Count of `<Assumption>` children.
- Count of `<CommonMisuse>` children.
- The first `<Assumption type=…>` slug (if present) rendered as
  "valid in: …". If no `type=` slot is filled, this line is
  omitted.

The hover does not show full biography bodies — that's the
chapter-end / course route's job.

**Surface 2: `<ChapterEquations chapter="X" />` (full biography).**

The existing chapter-end roll-up renders one block per equation.
Post-A7, each block expands to show all biography fields:

```text
## Wien's Law
$$\lambda_{peak} = b T^{-1}$$

**Observable:** Peak wavelength of thermal emission…

**Assumptions:**
- thermal-equilibrium — Source is in local thermodynamic…
- blackbody — Source emits as an ideal blackbody…

**Units:** T [K], λ_peak [cm]

**Breaks when:** Non-thermal emission (synchrotron, masers, …).

▸ Common misuses (1)   [collapsed]
```

The `<CommonMisuse>` list collapses behind a `<details>` disclosure
because misuse explanations are typically the bulkiest field and
benefit from progressive disclosure during chapter review.

**Surface 3: `<CourseEquations />` at `/equations` (full biography).**

Same rendering as `<ChapterEquations>`, applied across every
chapter's equations on the course-wide `/equations` route. Each
equation block links back to its source chapter via the existing
`<ChapterRef>` infrastructure.

**Deferred:** a dedicated `/equations/<slug>` page per equation
(mirroring A5's MisconceptionGraphPage) with reverse-lookups
("which chapters cite this?", "which misconceptions pair with
it?", "what other equations share assumptions?") is a future ADR
("Equation Pages"). The biography schema this ADR establishes is
the prerequisite; the page is a separate concern.

### Artifact 3: Three new E-prefix audit invariants

Extends the existing PR-C2 equations family (E1, E4, E6) rather
than carving a new EB-prefix. The invariants govern `<KeyEquation>`,
and `<KeyEquation>` already has an E-prefix family.

| ID | Level | Fires when |
|---|---|---|
| **E7** | INFO | `<KeyEquation>` declares at least one biography child (any of `<Observable>`, `<Assumption>`, `<Units>`, `<BreaksWhen>`, `<CommonMisuse>`) but lacks `<Observable>`. Chapter-author nudge toward complete biographies. |
| **E8** | WARNING | `<Units symbol="X">` symbol does not match any `canonical_symbol` or `alias` in the Notation Registry for the concept that owns this equation. **Fires only when NR is opted-in** via `pedagogy-contract.yaml.math_and_units_standards.notation_registry: true` (per ADR 0042 + ADR 0043). The correctness gate of the family. |
| **E9** | INFO | `<CommonMisuse>` lacks a `misconception="<slug>"` cross-ref to the A5 misconception graph. Soft suggestion toward curriculum coherence — chapter-author can opt to link or not. |

**All three invariants only fire when biography children are
present.** A `<KeyEquation>` with no biography children sees no
new audit lines from A7. This is what makes A7 "universal with
per-equation opt-in" rather than "opt-in via Pedagogy Contract":
the opt-in granularity is at the equation level (author the
children, get the audit), not the course level.

E8 is the only correctness gate. E7 and E9 are nudges. CI does
not fail on INFO; CI fails on ERROR. WARNING is reviewable. The
existing exit-code semantics of `sophie audit` (per ADR 0045 + the
`sophie diff` consumer pattern) carry through.

### What lives in code vs. what lives in docs

This ADR + its reference doc ship as **docs only**, matching the
ADR 0040–0045 precedent. The code PR follows separately:

- `packages/core/src/schema/key-equation.ts` — extend the existing
  `KeyEquationSchema` with `biography` field aggregating the
  children data; per-child Zod sub-schemas
  (`ObservableSchema`, `AssumptionSchema`, `UnitsSchema`,
  `BreaksWhenSchema`, `CommonMisuseSchema`).
- `packages/components/src/equation-biography/` — six new
  components (`<Observable>`, `<Assumption>`, `<Units>`,
  `<BreaksWhen>`, `<CommonMisuse>`, plus the extension to
  `<KeyEquation>` that handles the children walk).
- `packages/components/src/eq-ref/hover-summary.tsx` — render
  the compact summary line in the existing `<EquationRef>` hover card.
- `packages/astro/src/components/ChapterEquations.astro` and
  `CourseEquations.astro` — extend to render biography sections
  with `<details>` disclosure for `<CommonMisuse>` lists.
- Three new audit invariants added to
  `packages/astro/src/lib/pedagogy-audit/runner.ts` (E7, E8, E9).
- axe-core tests per
  [ADR 0004](./0004-component-contract-revisions.md).

That code PR follows the standard branch + PR cadence per
[`feedback_branch_pr_scope`](../../../) memory.

## Rationale

### Children-mode over prop extension or wrapper component

The brainstorm framed Q1 as three options: extend `<KeyEquation>`
props (compact, type-safe, but array-prop authoring in MDX is
awkward); wrap in `<KeyEquationBiography>` (extra nesting for
nothing); children-mode siblings (consistent SoTA pattern).
Children-mode wins on the same grounds that earned the pattern
its keep in PR-C4, ADR 0043, and ADR 0044:

- **AI-scaffolding is mechanical.** A scaffolder writing biography
  has one child per field — no array literals, no embedded JSON
  in MDX. Each child is a slot with a name.
- **Source reads naturally.** A human reader sees the math, then
  observable, then assumptions, then units, then breaks-when, then
  misuses — in the visual order they conceptually appear.
- **Extension is non-breaking.** v2 biography fields are new child
  components, not breaking prop-signature changes.
- **The extractor pattern is identical to existing infrastructure.**
  Remark walks children at MDX-parse time and populates
  `PedagogyIndex.equations[i].biography`; no new walker, no new
  AST shape.

Verbosity is the only cost (3-line source becomes 15-line source
for fully-authored equations). The verbosity is *legible* — each
field is named, each carries a short body — which is what Sophie's
authoring stack is optimized for.

### Free-form prose body + optional `type=` slot on `<Assumption>`

Q2's choice. Typed taxonomies earn their keep when (a) types
recur across many sources, (b) recurrence has citation-grade
literature, (c) tooling benefits from knowing the type. Physics
assumptions partly pass (a) (`small-angle`, `non-relativistic`,
`thermal-equilibrium` do recur) but only weakly pass (b) (folk
knowledge, not a citation-per-type). Computational-science
assumptions (i.i.d., convex, vectorized) overlap zero with
astrophysical ones, making a single platform `assumption-index.ts`
either too large or course-extensible.

The honest v1 answer keeps `<Assumption>` as a prose-body
component with an *optional* `type=` slot. Meaning is in the
body; the slot is reserved. If ASTR 201 + COMP 521 turn out to
reuse 8–10 types across chapters, a future ADR can promote them
to a platform `assumption-index.ts` (mirroring `move-index.ts` +
`intervention-index.ts`). If they don't, no infrastructure rots.

This mirrors the precedent of ADR 0043's looser `related_concepts`
vs stricter `concept_ref` modeling — different fields get different
typing strictness based on where typing actually pays.

### Three rendering surfaces, detail-tuned per context

Q3's choice. The three surfaces already exist; biography render is
a render-layer change, not a data-layer change. Each surface
gets the level of detail appropriate to its context:

- **Hover** is a tooltip. A full biography would be overwhelming;
  the compact summary ("2 assumptions · 1 misuse · valid in thermal
  equilibrium") gives reviewers a one-glance gist.
- **Chapter-end / `/equations`** are dense roll-ups. Full
  biography belongs here, with progressive disclosure for the
  bulkiest field (`<CommonMisuse>` lists can be long).

Per "build the best now," shipping all three at appropriate detail
is the right v1 ambition. The dedicated `/equations/<slug>` page
is genuinely richer (reverse-lookups, cross-references) but it's a
separate concern — it *consumes* the schema this ADR establishes.
The future "Equation Pages" ADR can land without redesigning A7.

### Three new E-prefix invariants over a new EB-prefix family

Q4's choice. New invariant family prefixes (NR, MR, MG, I in
ADRs 0043 + 0044) earned their keep when the surface they govern
was new. B1 governs `<KeyEquation>` — an existing surface with an
existing E-prefix family (E1, E4, E6 from PR-C2). Extending
E-prefix is the consistent shape: E7, E8, E9 are *to `<KeyEquation>`*
as E1/E4/E6 are.

The three-invariant ratio (one WARNING, two INFO) reflects what's
actually gateable. E8 (NR symbol mismatch) is real correctness;
E7 (missing Observable) and E9 (missing misconception cross-ref)
are authoring suggestions that don't justify ERROR or WARNING
status. The audit's role here is "Sophie has opinions about good
equation biographies, even where it doesn't gate on them."

### Prose-only for non-`<Units>` biography children — follows the structured-for-facts, prose-for-stances principle

Q5's choice. `<Units>` carries a `symbol=` that meaningfully cross-
refers to the Notation Registry — it's a tag pointing at a typed
thing. `<Observable>`, `<Assumption>`, `<CommonMisuse>`,
`<BreaksWhen>` are prose; the meaning IS the body. Adding a
`concept_ref=` slot to them mixes two registers (tag + prose) in
one element, which is hard to author cleanly.

This decision is the canonical exemplar of the
**structured-for-facts, prose-for-stances** principle declared in
[ADR 0043 Rationale](./0043-notation-registry-multirep-alignment-audit.md#the-structured-for-facts-prose-for-stances-principle-introduced-2026-05-14)
(hardened 2026-05-14). The biography schema sorts cleanly:

- **Structured (facts):** `<Units symbol="X" unit="Y">` — facts
  about an equation's symbol/unit pair. Enumerable, recurrent,
  audit-checkable (E8 fires on symbol mismatch with NR).
- **Prose (stances):** `<Observable>`, `<Assumption>` body,
  `<BreaksWhen>`, `<CommonMisuse>` body — author's narrative
  position on what the equation observes, what it assumes, where
  it breaks, what students commonly misuse. Conflating either
  direction (structuring stances or prose-ifying facts) degrades
  both.

Same pattern applies in ADRs 0040 (TDR `evidence_summary` is prose;
fields like `evidence_type` are enumerable), 0042 (`ai_workflow`
is structured; `ai_training_provenance.known_limitations` is
prose), 0043 (`<RepCode>` external-mode provenance is structured;
NR concept descriptions are prose).

If a chapter needs to reference an NR concept inside biography
prose, it does so by inline link (`Peak wavelength of *thermal*
emission [see thermal-equilibrium](...)`). The cross-ref is
author-driven; the audit doesn't try to infer it.

v2 may promote selected biography children to typed `concept_ref`
slots if authoring data shows the need. The schema is forward-
compatible (adding an optional attribute to a child is non-breaking).

### Universal scope with per-equation opt-in

Q6's choice. ADR 0043 (NR) is opt-in via Pedagogy Contract because
the entire `notation-registry.yaml` is a separate authoring
burden — a non-STEM course shouldn't be forced to declare an empty
registry. ADR 0044 (Misconception Graph) is universal because every
course has misconceptions and they're declared per-chapter.

B1 sits closer to A5 than to A4. There's no platform-level YAML
to author; biography is optional children of `<KeyEquation>`. A
course that uses `<KeyEquation>` but doesn't want biography just
omits the children — and crucially, all three new audit invariants
only fire when biography children are present.

So there's no audit noise for non-biography-using courses
*whether or not* a course-level toggle exists. Adding an
`equation_biography: true|false` Pedagogy Contract gate would be
a YAGNI knob that buys nothing.

### One ADR over splitting schema from rendering

The biography schema, the three rendering surfaces, and the three
new audit invariants are tightly coupled: the schema is meaningful
because the surfaces render it; the invariants only make sense
against the schema. Splitting forces forward-references. Same
pattern as ADRs 0042 + 0043 + 0044 + 0045 each bundling per
coherent contract.

## Consequences

### For Sophie-the-platform (this commit)

- ADR 0046 ships docs-only on 2026-05-14, alongside
  [equation-biography-schema.md](../reference/equation-biography-schema.md).
- [`vision/features/accepted.md`](../vision/features/accepted.md)
  A7 entry transitions to graduated.
- [`vision/features/backlog.md`](../vision/features/backlog.md) B1
  is already collapsed to a one-line pointer (per the 2026-05-14
  promotion commit).
- [`status/roadmap.md`](../status/roadmap.md) gains an A7 row in
  the LDS-conformance-foundation table (or a new "feature
  graduations post-foundation" section, depending on the
  graduation-commit shape).

### For Sophie-the-platform (future code PR)

- Six new components in `packages/components/src/equation-biography/`
  with `serialize` separation per ADR 0004.
- Schema extension in `packages/core/src/schema/key-equation.ts`
  adding the `biography` aggregate field.
- Render-layer updates to `<EquationRef>` hover, `<ChapterEquations>`,
  `<CourseEquations>`.
- Three new E-prefix invariants in
  `packages/astro/src/lib/pedagogy-audit/runner.ts`.
- axe-core tests for each new component (per ADR 0004).
- Unit tests for the new schema sub-shapes.
- E2e test: a smoke chapter with one fully-authored equation
  biography renders correctly at all three surfaces and produces
  expected audit output.

### For consumer repos

No required action. Existing chapters continue to render
unchanged (biography children are optional). Consumer repos that
want to author biographies do so per-`<KeyEquation>`, per-field.

Suggested authoring order for ASTR 201 Module 1: Wien's law
first (most fully-formed biography case), then Hubble–Lemaître
(`z << 1` regime is an explicit `<BreaksWhen>`), then inverse-
square law.

### For TDRs (per [ADR 0040](./0040-teaching-decision-records.md))

A Teaching Decision Record citing an equation revision can now
reference biography state explicitly: "I added a `<CommonMisuse
misconception=…>` to the Wien's-law equation in ch4 because
2025-Fa students consistently misapplied it to absorption-line
spectra." The TDR-equation cross-reference is a richer signal
post-A7.

### For the Notation Registry + Pedagogy Contract (ADRs 0042 + 0043)

E8 is the integration point: `<Units symbol=…>` validates against
NR's `canonical_symbol`/`alias` when NR is opted-in. Courses that
have NR enabled get a correctness gate on equation biographies for
free. Courses that don't have NR enabled see E8 not fire.

No changes to the Pedagogy Contract schema — A7 deliberately does
not add a `equation_biography:` field. The opt-in is at the
equation level.

### For the Misconception Graph (per [ADR 0044](./0044-misconception-graph-and-intervention-library.md))

`<CommonMisuse misconception="<slug>">` declares a cross-reference
from the equation into the misconception graph. The audit
(E9 INFO) suggests this link when absent, but does not enforce
it. The cross-reference is bidirectional: the misconception graph
walker (per ADR 0044) can now identify which equations are
linked from each misconception, enabling future tooling (e.g., a
misconception page that lists "equations where this misconception
shows up").

### For `sophie diff` (per [ADR 0045](./0045-pedagogical-diff-curriculum-ci.md))

The new biography children are first-class members of the
PedagogyIndex schema. `sophie diff` classifies them per the
existing taxonomy:

- Adding a `<CommonMisuse>` to a previously-bare equation:
  `structural` × `substantive`.
- Changing a `<BreaksWhen>` body: `semantic` × `substantive`.
- A `<Units symbol=…>` that newly fails NR resolution: `relational`
  × `breaking` (via E8 firing in the conformance axis).
- Adding a `misconception=` cross-ref to a `<CommonMisuse>` that
  previously lacked one: `relational` × `substantive`.

No taxonomy changes needed — the existing two-axis schema covers
biography changes the same way it covers everything else.

**Anchor granularity** (hardened 2026-05-14): biography changes
are tracked at the **equation anchor** (`eq-wiens-law`), not at
sub-equation level (`eq-wiens-law/breaks-when`). v1 simplicity —
TDR `affects_anchors: [eq-wiens-law]` covers all of an equation's
biography children; the diff surfaces the specific biography field
that changed via the semantic-axis `body_diff` payload. If
authoring data eventually shows the need for finer granularity, a
future ADR can add sub-equation anchors (`eq-wiens-law/observable`,
`eq-wiens-law/breaks-when`, etc.); the schema is forward-
compatible.

### For AI authoring (future)

The biography schema is the natural target for a
`sophie-equation-biography` skill or `/sophie-author-biography`
slash command. Given an equation's title + math body, the skill
proposes draft `<Observable>`, `<Assumption>`, `<BreaksWhen>`,
`<CommonMisuse>` children for instructor review. The output is
deterministic in structure (one child per field) and
non-deterministic in content (the AI's prose). The HITL mandate
per ADR 0030 applies: the instructor reviews each proposed
biography before commit.

### For SoTL paper + tenure case

Equation biographies are concrete artifacts of pedagogical
intentionality. A migrated ASTR 201 chapter with fully-authored
biographies (vs the same chapter in Quarto without them) is a
publishable comparison: structured pedagogical metadata, audit-
gated correctness, cross-references to misconceptions. Advances
B7 (Course as Research Object) without that ADR yet existing.

## Alternatives considered

### Prop-extension over children-mode

*Rejected.* `<KeyEquation observable_meaning="..." assumptions={[
'thermal-equilibrium', 'blackbody']} units={{T: 'K', lambda: 'cm'}}
common_misuses={[...]} breaks_when="...">` violates the SoTA
authoring pattern established three times over (LearningObjectives,
MultiRep, Intervention). MDX array-prop authoring is awkward;
prose fields don't fit prop strings.

### Wrapper component `<KeyEquationBiography>`

*Rejected.* Adds a level of nesting that achieves the same thing
as children-mode (Option C) with extra indirection. Doesn't earn
its keep.

### Typed `<Assumption type=…>` with v1 platform catalog

*Deferred.* Worth doing eventually if authoring data shows the
types recur. Premature in v1: physics assumptions vary by sub-
discipline; computational-science assumptions overlap zero. A
catalog now would either be too narrow (astrophysics-only, then
breaks for COMP 521) or too broad (every assumption Anna can think
of, never used by any one course). v2 promotion path is clean.

### Dedicated `/equations/<slug>` page per equation in v1

*Deferred.* Genuinely useful (reverse-lookups, cross-references)
but it's a separate concern from "biography fields exist." The
page *consumes* the schema this ADR establishes. Future "Equation
Pages" ADR can ship without redesigning A7.

### EB-prefix audit invariant family

*Rejected.* B1 governs `<KeyEquation>`; `<KeyEquation>` already has
an E-prefix family from PR-C2. New prefixes earn their keep when
governing new surfaces (NR/MR/MG/I), not when extending an existing
one with new fields.

### `concept_ref=` slots on `<Observable>` / `<Assumption>` / etc.

*Deferred.* Mixes two registers (tag + prose body) in one element.
v1 keeps non-`<Units>` biography children as prose. v2 may
promote if authoring data shows the need.

### Pedagogy Contract `equation_biography: true|false` opt-in

*Rejected.* Solves a problem that doesn't exist. Per-equation
opt-in (by virtue of authoring biography children) already gives
non-biography-using courses zero audit noise.

### Required `<Observable>` on every biography-bearing `<KeyEquation>`

*Considered.* The strict version would make E7 a WARNING (or
ERROR) rather than INFO. Rejected: authoring biographies
incrementally (just `<Assumption>` first, `<Observable>` added
later) should be supported; nudging without gating is the right
posture for v1.

## References

- [ADR 0004 — Component contract revisions](./0004-component-contract-revisions.md)
  — `serialize` separation, axe-core requirement.
- [ADR 0030 — Audience + AI author model](./0030-audience-and-ai-author-model.md)
  — HITL mandate; biography is AI-scaffolding-friendly under
  instructor review. Per the 2026-05-14 amendment, also documents
  Sophie's commitment to AI-primary authoring as deliberate
  design.
- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md)
  — `PedagogyIndex.equations` is where biography is stored;
  children-mode extractor pattern.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `math_and_units_standards.notation_registry` opt-in gates E8.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — `canonical_symbol`/`alias` lookup that E8 fires on;
  declared the *structured-for-facts, prose-for-stances* principle
  this ADR exemplifies (Q5 lock).
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — misconception slugs that `<CommonMisuse misconception=…>`
  references; precedent for children-mode component cross-refs
  into a graph.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — biography changes classify under the existing diff taxonomy;
  TDR `affects_anchors` lists equation anchors at the equation
  level (not sub-equation).
- [ADR 0048 — Sophie LDS Content Plugin System](./0048-sophie-lds-content-plugins.md)
  — future cross-course equation sharing (weaker case than for
  concepts or misconceptions; equations are typically course-
  specific in detail even when they share names). Forward-ref
  only; per-course shape is forward-compatible.
- [`vision/features/backlog.md`](../vision/features/backlog.md) —
  B1 entry surfaced this ADR; collapsed to one-line pointer in
  the 2026-05-14 promotion commit.
- [`vision/features/accepted.md`](../vision/features/accepted.md)
  A7 — defended priority claim and brainstorm Q1–Q6 summaries.
- [equation-biography-schema.md](../reference/equation-biography-schema.md)
  — full schema specification with per-component shape, render-
  surface details, and the three audit invariants.

## Revisions (2026-05-17 — Reasoning OS Core Phase 1 hardening)

The Reasoning OS pedagogical-core sprint locked one substantive new
decision (explicit `epistemicRole` const per biography component) and
re-confirmed several existing locks for hardening clarity. Full design
lockup at [`docs/plans/2026-05-17-equation-biography-design.md`](../../plans/2026-05-17-equation-biography-design.md).

### R1 — Each biography component declares `epistemicRole` as hardcoded const (new ADR 0058 binding)

Each biography child declares a fixed `epistemicRole` value in its
component definition — NOT an author-set prop. PedagogyIndex entries
carry the role explicitly. Authors don't see or set the role; the
schema/extractor surfaces it for consumers.

Role mapping per ADR 0058's 8-role taxonomy:

| Component | epistemicRole |
|---|---|
| `<Observable>` | `"observable"` |
| `<Assumption>` | `"assumption"` |
| `<BreaksWhen>` | `"approximation"` (validity-domain marker) |
| `<CommonMisuse>` | (no own role — cross-refs the misconception graph; the linked end carries `"misconception"`) |
| `<Units>` | (no role — descriptive metadata per ADR 0058's "components that don't fit any role are likely chrome") |
| `<KeyEquation>` math body | `"model"` (per ADR 0058 §3 lookup table) |

Rationale:

- **Greenfield**: no retrofit cost. Biography children don't ship
  yet; declaring `epistemicRole` at the component-definition level is
  one extra const per component.
- **Code-grounds the ADR 0058 §3 lookup table**: the component is the
  source of truth instead of a documentation-only mapping. Reduces
  drift risk between docs and code.
- **Unlocks the queryable epistemic surface**: consumers (audit, AI
  authoring, theme tokens) read a uniform field from the pedagogy
  index. Trivial v2 queries: "show me every `assumption` declared in
  Module 4" or "every `approximation` (BreaksWhen) across the course."
- **Pairs with MultiRep's registry-as-catalog decision** (ADR 0043 §R2
  in its 2026-05-17 hardening): registry carries concept-level role;
  components carry component-level role. Together they complete the
  Reasoning OS role-binding surface.

This is the **first greenfield surface to take the explicit-role-
declaration path** from ADR 0058 §2's "optional, additive" stance —
biography children declare role at v1 ship rather than via the
implicit lookup table.

Schema consequence: `PedagogyIndex.equations[i].biography.observable.epistemicRole`,
`.biography.assumptions[j].epistemicRole`,
`.biography.breaks_when.epistemicRole` are **required fields** at v1
(value supplied by extractor from component const). `<Units>` and
`<CommonMisuse>` entries do not carry the field. Unlocks the
uniform-query layer trivially at v2.

### R2 — Rendering updates bundled into PR-β

The 6 biography components have no own UI — they serialize children
into KeyEquation's pedagogy-index schema. The user-visible payoff is
the rendering updates to three existing components: `<EquationRef>` hover
preview (compact summary), `<ChapterEquations>` (full + `<details>`
disclosure for misuse lists), `<CourseEquations>` (full).

PR-β bundles the 6 new biography components + the three render-surface
updates as a single coherent family deliverable. Splitting rendering
into PR-β' would ship biography components with no consumer.

### R3 — Smoke fixture locked as Wien's law

Per the ADR's own "Suggested authoring order for ASTR 201 Module 1:
Wien's law first (most fully-formed biography case)." Wien's law
exercises every biography child (2 assumptions, 1 BreaksWhen, 1
CommonMisuse, 2 Units, 1 Observable) and renders end-to-end at all
three surfaces.

Inverse-square law gets its biography in Phase 4 (PR-7 chapter
capstone for the Reasoning OS Core arc) — separates the
EquationBiography sprint's smoke fixture from the chapter-capstone
deliverable.

### R4 — Re-confirmations from prior locks

The 2026-05-17 hardening pass re-confirmed several decisions already
in ADR 0046 §Decision text, calling them out explicitly for
implementation clarity:

- All 6 biography children remain **optional** (E7 stays INFO, not
  WARNING / ERROR — authoring incrementally is supported)
- **Per-equation `/equations/<slug>` page deferred** to a future
  "Equation Pages" ADR; CourseEquations covers v1
- **No Pedagogy Contract gate** — per-equation opt-in by authoring;
  the three E-prefix invariants only fire when biography children
  present

### R5 — Forward-compat seams baked into v1

Reserved schema slots for non-breaking v2 evolution:

- `<Assumption type>` is `z.string().optional()` at v1; v2 may
  promote to `assumption-index.ts` enum (back-compat via
  `z.enum([...]).or(z.string())`)
- Reserve `concept_ref?: z.array(z.string()).optional()` on
  `<Observable>` / `<Assumption>` / `<BreaksWhen>` entry schemas
  (unused at v1; v2 may add explicit NR linkage)
- Reserve `citation_doi?: z.string().optional()` +
  `citation_bibtex?: z.string().optional()` on `<CommonMisuse>` entry
  schema (unused at v1; v2 fills with structured citations)
- Anchor granularity is equation-level (`eq-wiens-law`) at v1; v2
  may add sub-equation anchors (`eq-wiens-law/breaks-when`) per ADR
  0045 without schema break

### R6 — PR cadence: α → β → γ → δ (no ε)

| PR | Subject |
|----|---------|
| α  | Schema for 6 biography sub-schemas + aggregate `BiographySchema` + extend `KeyEquationSchema` with optional `biography` field |
| β  | 6 biography components (each with hardcoded `epistemicRole` const where applicable) + extend `<KeyEquation>` walker + rendering updates to `<EqRef>` (renamed to `<EquationRef>` in PR #102) + `<ChapterEquations>` + `<CourseEquations>` + tests + stories |
| γ  | `transformEquationBiography` extractor + extend `pedagogy-index-extractor.ts` + Wien's law smoke fixture |
| δ  | E7 + E8 + E9 audit invariants + per-invariant tests |

No PR-ε — rendering happens in existing surfaces, no aggregator needed.

### R7 — Phase 1 complete (2026-05-18)

All four PRs in the α → β → γ → δ cadence shipped and squash-merged to
`main`:

| PR | Shipped | Status |
|----|---------|--------|
| α  | [#91](https://github.com/drannarosen/sophie/pull/91) | `BiographySchema` + 5 sub-schemas + `EquationEntry.biography?` + `EquationEntry.symbols`; every schema `.strict()` per the §F1 forward-compat clause |
| β  | [#92](https://github.com/drannarosen/sophie/pull/92) | 5 biography components (`<Observable>` / `<Assumption>` / `<Units>` / `<BreaksWhen>` / `<CommonMisuse>`) + `KeyEquation.symbols` prop + `<EqRef>` (renamed to `<EquationRef>` in PR #102) hover compact biography summary + `<ChapterEquations>` + `<CourseEquations>` full biography render via shared `BiographyRender.astro` |
| γ  | [#93](https://github.com/drannarosen/sophie/pull/93) | `buildBiographyFromKeyEquationChildren` extractor + Wien's law smoke fixture (`examples/smoke/src/content/chapters/01-foundations/wiens-law-fixture.mdx`) |
| δ  | [#94](https://github.com/drannarosen/sophie/pull/94) | E7 INFO + E8 WARNING + E9 INFO audit invariants + NR1/NR3/NR4 (closes ADR 0043 §R5) + NR2 modification (symbols now count as a reference signal) |

**Cross-family work landed in the same sprint**:
- ADR 0058 `EpistemicRoleSchema.extract([...])` pattern proved out at scale
  (see ADR 0058 §R-greenfield revision note for the canonical-pattern call-out).
- Cross-family composition (KeyEquation ↔ MultiRep ↔ Aside misconception ↔
  Intervention) traced end-to-end in the Phase B Reasoning OS core audit
  §2.7 (`docs/reviews/2026-05-17-reasoning-os-core.md`).
- Audit verdict: A− (91/100); cleanup PR-A
  ([#95](https://github.com/drannarosen/sophie/pull/95)) brought the
  audit-header docstring + schema `.strict()` symmetry back in line.

**`EpistemicRoleSchema.extract([...])` compile-time grounding** is the
canonical role-declaration pattern for any future role-bearing
component:

```ts
// In the schema file (@sophie/core/src/schema/):
import { EpistemicRoleSchema } from "./epistemic-role.js";

export const ObservableEntrySchema = z
  .object({
    body: NonEmptyString,
    epistemicRole: EpistemicRoleSchema.extract(["observable"]),
  })
  .strict();
```

```ts
// In the component file (@sophie/components/src/components/Observable/):
import type { EpistemicRole } from "@sophie/core/schema";

export const OBSERVABLE_EPISTEMIC_ROLE =
  "observable" as const satisfies EpistemicRole;
```

`EpistemicRoleSchema.extract([...])` narrows the 8-role enum to a
single literal at compile time AND at parse time — a typo like
`"observabel"` fails type-check *and* runtime parse. Combined with
`as const satisfies EpistemicRole` on the component-side const, the
binding is grounded structurally rather than by inline strings.

**Deferred to a follow-on pass** (not in scope for Phase 1):
- Per-equation page route (out of scope — see §Alternatives considered).
- `assumption-index.ts` catalog (§F1 forward-compat; promotes
  `AssumptionEntrySchema.type` from free-form slug to enum once
  recurring patterns emerge across courses).
- E10 (and similar) misconception-graph cross-ref audit invariants
  for `<CommonMisuse misconception="X">` — scheduled for PR-D of the
  Session 4 audit-fix sprint (see audit §P3-2).

## Revisions (2026-05-18 — Registry ecosystem amendment)

[ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md) moves
equation biographies from chapter-inline storage to a per-equation
registry. The **biography contract is unchanged** — what changes is
*where* the biography lives.

### R8 — Equation biography migrates to registry storage

Pre-0060: a `<KeyEquation id="..." symbols={[…]}>` block in a chapter
MDX held the equation's primary `$$tex$$` plus biography children
(Observable, Assumption, Units, BreaksWhen, CommonMisuse) inline.
The pedagogy-index extractor walked the chapter MDX AST to build
`PedagogyIndex.equations[i]`.

Post-0060: each equation gets its own file at
`src/content/equations/<id>.mdx`. Frontmatter holds the structured
fields (`id`, `title`, `tex`, `symbols`, plus new fields detailed
in §R9). Body holds the biography children (Observable, Assumption,
BreaksWhen, CommonMisuse) using exactly the same components ADR 0046
defines.

Chapter MDX shrinks dramatically. The new chapter-side authoring
shape:

```mdx
<KeyEquation refId="wiens-law">
  We've seen Wien's law before; in this chapter we apply it to
  dust thermal emission…
</KeyEquation>
```

- `refId` (new prop) looks up the registry entry at build time and
  renders the full card from registry-pulled biography children.
- Children render as **chapter framing prose at the top of the
  card**, before the equation tex. Authors who don't want
  chapter-specific framing write `<KeyEquation refId="..." />`
  self-closing.
- Chapter-side biography overrides are **not supported at v1**
  (strict — preserves the registry as one source of truth). If a
  chapter needs a different biography slice, the right move is to
  add an `Assumption` or `BreaksWhen` clause to the registry entry,
  not to override locally.

### R9 — Net-new biography fields beyond ADR 0046's original five

PR-7's chapter capstone surfaced four "multiple parts" that the
ADR 0046 biography contract didn't cover. ADR 0060 brainstorm
locked these as additional Phase-1 fields:

| Field | Storage | Shape |
|---|---|---|
| **Constants table** | frontmatter | `constants: [{ symbol, value, unit, name }]` — equation-specific constants (Wien's b, gravity's G, Planck's h) |
| **Rearranged forms** | frontmatter | `rearranged_forms: [{ tex, solves_for, label? }]` — sibling forms of the primary equation (e.g., `d = sqrt(L/4πF)` alongside `F = L/4πd²`) |
| **Related-equation cross-refs** | frontmatter | `related: [{ refId, kind, description? }]` where `kind ∈ {"see-also", "prereq", "derives-from"}` |
| **Derivation step list** | body | `<DerivationStep label="...">` children — collapsible-by-default; chapter force-expands via `<KeyEquation refId="..." showDerivation />` |

`<DerivationStep>` is a **new biography component** added to ADR
0046's family. It inherits the same pattern as Observable /
Assumption / BreaksWhen / CommonMisuse: a Tier-3 chrome card, an
`epistemicRole` const (likely `"model"` — the derivation IS the
model-construction trace), and an extractor path that serializes
children into the index.

### R10 — Symbol units migrate to notation-registry, not per-equation

ADR 0046's original `<Units symbol="..." unit="...">` biography
child carried the unit inline. ADR 0060 moves unit declaration to
the notation registry: the equation file declares `symbols: ["T",
"\\lambda_{peak}"]`, and the loader resolves each symbol to its
notation-registry concept (which carries `units`).

The `<Units>` biography child remains supported for cases where the
notation registry doesn't have an entry (e.g., one-off equation-
local symbols), but the **registry path is the default**. This
eliminates the duplication PR-7 surfaced (units declared once in
notation-registry AND again per equation in `<Units>` children)
and resolves the JSX-attribute-vs-expression escaping mismatch the
fixture chapter has been hitting since it landed.
