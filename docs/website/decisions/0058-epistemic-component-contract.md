---
date: 2026-05-16T00:00:00.000Z
tags:
  - pedagogy
  - reasoning-os
  - component-contract
  - schema
  - lds
  - thesis
status: shipped
validation:
  status: in-progress
  last_validated_date: "2026-05-28"
  evidence:
    - kind: test
      ref: scripts/lint-epistemic-role.ts
      date: "2026-05-28"
      notes: "R-graduation: epistemic-role enforced-for-new via CI lint gate (lint job, after R11 lint:axe-render). 59/59 component dirs accounted for: 5 declare, 1 role-via-slot, 39 chrome, 14 grandfathered (tracked-not-blocking, pending the Anna-adjudicated domain pass)."
    - kind: test
      ref: packages/astro/src/components/CourseObservables.axe.test.ts
      date: "2026-05-23"
      notes: "W4c Observable rollup chrome (per §4 slot-name-binds-role) — derived from OMIFlowEntry.observable; axe-clean."
    - kind: test
      ref: packages/astro/src/components/CourseModels.axe.test.ts
      date: "2026-05-23"
      notes: "W4c Model rollup chrome (per §4 slot-name-binds-role) — derived from OMIFlowEntry.model; axe-clean."
    - kind: test
      ref: packages/astro/src/components/CourseInferences.axe.test.ts
      date: "2026-05-23"
      notes: "W4c Inference rollup chrome (per §4 slot-name-binds-role) — derived from OMIFlowEntry.inference; axe-clean."
    - kind: test
      ref: packages/astro/src/components/ObservableSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "W4c per-callsite Spec route; carries data-epistemic-role='observable' on role label paragraph."
    - kind: test
      ref: packages/astro/src/components/ModelSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "W4c per-callsite Spec route; carries data-epistemic-role='model' on role label paragraph."
    - kind: test
      ref: packages/astro/src/components/InferenceSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "W4c per-callsite Spec route; carries data-epistemic-role='inference' on role label paragraph."
    - kind: deployment
      ref: examples/smoke/dist/library/observables/index.html
      date: "2026-05-23"
      notes: "Smoke build emits Observable/Model/Inference rollups + Spec pages with data-epistemic-role attributes per §R-deep-dive table."
---

# ADR 0058: Epistemic Component Contract

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0003](./0003-zod-as-source-of-truth.md), [0004](./0004-component-contract-revisions.md), [0044](./0044-misconception-graph-and-intervention-library.md), [0046](./0046-equation-biography.md)
:::

## Context

Sophie has been growing an *epistemic* layer in its component
ecosystem without naming it as such. Three locked ADRs each encode a
slice of scientific-reasoning structure into the platform:

- **ADR 0044 (Misconception Graph + Intervention Library)** declares
  misconceptions as a first-class node type with prerequisite /
  related edges and discipline-scoped concept refs.
- **ADR 0046 (Equation Biography)** ships `<Observable>`,
  `<Assumption>`, `<Units>`, `<BreaksWhen>`, `<CommonMisuse>` as
  children of `<KeyEquation>` — a per-equation taxonomy of the
  equation's epistemic roles in the surrounding science.
- **OMI framing** (Observable → Model → Inference) is canonized
  vocabulary in [pedagogical-foundations.md](../explanation/pedagogical-foundations.md),
  [architecture.md](../explanation/architecture.md), the
  [content schema](../reference/content-schema.md)
  (`framing: z.literal('OMI'|'PMI'|'custom')`), the
  [glossary](../reference/glossary.md), the
  [teaching-moves reference](../reference/teaching-moves.md), and the
  [component-contract reference](../reference/component-contract.md).

These three features encode the same underlying idea — *every
pedagogy element on a Sophie page has a recognizable epistemic role*
— but they encode it three different ways: as a graph node type
(0044), as a child-component family (0046), and as a chapter framing
discriminator (OMI). A reader of the codebase today has no single
place to look up "what are the canonical epistemic roles in Sophie?"
because Sophie has never declared the set as a contract.

The trigger for this ADR is a thesis-level reframing of Sophie's
platform identity. In the
[vision/reasoning-os/](../vision/reasoning-os/index.md) section newly
published alongside this ADR, Sophie is articulated as the **STEM
vertical specialization** of its existing [Learning Design System
positioning](../vision/index.md) — *a platform whose component
contract encodes the epistemic structure of scientific reasoning*.
The reframing is descriptive of 0044/0046/OMI rather than aspirational
beyond them; what's missing is the single contract that names what
those three features are instances of.

Without this contract:

1. Future components inherit no convention. A net-new `<OMIFlow>`,
   `<AssumptionStack>`, or `<UncertaintyLens>` (registered as A8–A11
   in [accepted features](../vision/features/accepted.md)) would each
   re-invent its own role vocabulary.
2. AI authoring (per [ADR 0030](./0030-audience-and-ai-author-model.md))
   cannot target role-aware generation. The four AI roles in
   [ADR 0030](./0030-audience-and-ai-author-model.md) (author /
   pedagogy / domain / brainstorming) currently reason about
   *component types*, not *epistemic roles*. Targeting an intervention
   to a misconception's prerequisite assumption is harder than it
   should be.
3. The eventual epistemic theme-token slot on
   [ADR 0005's three-layer theming](./0005-theming-three-layers.md)
   (`color.role.observable`, `color.role.inference`, motion language
   for transitions between roles, edge-style for assumption vs.
   approximation) has nothing stable to bind to.
4. The Pedagogy Contract ([ADR 0042](./0042-pedagogy-contract-and-ai-contribution-ledger.md))
   cannot grow a conformance gate of the shape "every chapter
   declaring `framing: 'OMI'` must reach a coherent set of epistemic
   roles on the page" because the role set isn't named.

This ADR names the set. It declares zero net-new components and zero
required migrations. It is a **contract-only** ADR — its job is to
make the implicit pattern in 0044/0046/OMI legible as one general
shape so future work has a stable target to extend.

## Decision

Sophie adopts an **eight-role epistemic taxonomy** as the canonical
contract for pedagogy-component roles, exposed as an optional Zod
enum on the component schema and as a documented vocabulary in the
Reasoning-OS vision section. The taxonomy is:

```ts
// packages/core/src/schema/epistemic-role.ts (future code PR)
export const EpistemicRole = z.enum([
  "observable",     // measured / observed phenomenon — what data shows
  "model",          // formal / equational / computational model — what we posit
  "inference",      // probabilistic conclusion from model + data
  "assumption",     // explicit precondition on a model's validity
  "approximation",  // simplification with a known domain of validity
  "uncertainty",    // posterior spread, error bar, degeneracy
  "numerical",      // discretization, integrator, convergence artifact
  "misconception",  // canonical student-side wrong model
]);
```

Five concrete commitments:

### 1. The eight roles are the canonical set

The list is closed at v1. A ninth role earns its keep only via a new
ADR amending this one. Closure matters: this is the vocabulary AI
authoring, audit invariants, theme tokens, and future linked-
representation primitives all bind to. An open set defeats the
purpose of having a contract.

### 2. `epistemicRole` is an **optional, additive** schema field

Every existing pedagogy component schema **may** declare an optional
top-level `epistemicRole: EpistemicRole.optional()` field. No
component is required to declare it. No migration of existing
components ships with this ADR. The retrofit pass is opportunistic:
when a component already encodes a role implicitly via a `variant=`,
`kind=`, or child-component-shape (e.g.,
`<Callout variant="misconception">`,
`<KeyEquation>` child `<Observable>`), a future PR can either lift
the field to explicit or leave it implicit. Both are valid; the ADR
documents the lookup table so the *meaning* is stable either way.

### 3. Implicit role is documented, not deprecated

Three classes of role-encoding coexist:

| Pattern               | Example                                     | Role inferred  |
| --------------------- | ------------------------------------------- | -------------- |
| Explicit field        | `<SomeComponent epistemicRole="inference">` | direct         |
| Variant discriminator | `<Callout variant="misconception">`         | misconception  |
| Child component       | `<KeyEquation>` child `<Observable>`        | observable     |

The [explanation/scientific-reasoning-os.md](../explanation/scientific-reasoning-os.md)
page (shipping alongside this ADR) carries the canonical lookup
table for every Sophie component's implicit role. The pedagogy-index
extractor (per [ADR 0038](./0038-pedagogy-index-pattern.md)) can
populate `PedagogyIndex[*].epistemicRole` from either the explicit
field or the implicit signal; the consumer of the index sees a
uniform shape.

### 4. Composite components must declare role per slot

The four C-tier composite components registered in
[accepted features](../vision/features/accepted.md) (A8 `<OMIFlow>`,
A9 `<AssumptionStack>`, A10 `<UncertaintyLens>`, A11 linked-
representation state primitive) **must** declare role for each named
slot when their authoring ADRs ship. `<OMIFlow>` declares three slots
with roles `observable` / `model` / `inference`; `<AssumptionStack>`
declares its members as `assumption` (with an optional
`approximation` discriminator for entries that carry a validity
domain); `<UncertaintyLens>` declares `uncertainty` as its overlay
role. The contract makes their per-slot binding cheap.

### 5. Audit invariant deferred to a later ADR

The natural follow-on audit invariant — *"every chapter declaring
`framing: 'OMI'` must contain at least one component carrying role
`observable`, one carrying `model`, and one carrying `inference`"* —
is **not** part of this ADR. The contract has to exist before
audit can bind to it. A future ADR (likely paired with the A8
`<OMIFlow>` graduation) carries that invariant; the role set this
ADR locks is the prerequisite.

:::{note} Graduated in ADR 0063 as OF-2 (2026-05-19)
[ADR 0063](./0063-omiflow-composite-primitive.md) graduates the
A8 `<OMIFlow>` composite primitive and lands this deferred invariant
as **OF-2** (chapter-level conformance ERROR): chapters with
`framing: 'OMI'` MUST contain ≥ 1 `<OMIFlow>` callsite. The strict-3
slot tuple from ADR 0063 §Decision 3 reduces the invariant to a
one-line audit check (per-chapter presence of any OMIFlowEntry).
:::

## Rationale

### Why declare the contract now rather than incrementally

This ADR introduces no new components, no required migrations, and
no audit gates. The cost of shipping it is one ADR + one vision
section + one explanation page + a CLAUDE.md amendment. The cost of
*not* shipping it is that every future epistemic component
(`<OMIFlow>`, `<AssumptionStack>`, `<UncertaintyLens>`, and beyond)
re-invents the role vocabulary, and the four AI-authoring roles
in ADR 0030 keep reasoning about types instead of roles. Naming the
shape before the components that consume it is the
[ADR 0023 vertical-slice-first](./0023-vertical-slice-build-order.md)-
compatible way to build a contract: lean Phase 0, refactor outward
*around a known interface*. Without the interface, "refactor outward"
becomes "rewrite each time."

This is also the canonical instance of the
[engineering principle](../../../CLAUDE.md) *"build the best now, plan
ahead — not what's simple now causing more work later."* The naive
alternative — let each future component re-coin its own role
vocabulary — would not break v1, but it would leave 0044, 0046, and
OMI looking like three unrelated pedagogy features forever. Naming
them as instances of one general shape is what converts them from
features into a *contract*.

### Why eight roles and not more or fewer

The eight roles are the **minimum closed set** that covers what
0044 / 0046 / OMI already encode plus the immediate-future
components A8–A11 need:

| Role            | Already-encoded-in                                                  | Future C-tier consumer                    |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------- |
| `observable`    | ADR 0046 `<Observable>` child; OMI framing                          | A8 `<OMIFlow>` first slot                 |
| `model`         | OMI framing; `<KeyEquation>` math body                              | A8 `<OMIFlow>` middle slot                |
| `inference`     | OMI framing; future Bayesian-update components                      | A8 `<OMIFlow>` last slot                  |
| `assumption`    | ADR 0046 `<Assumption>` child                                       | A9 `<AssumptionStack>` members            |
| `approximation` | ADR 0046 `<BreaksWhen>` (validity-domain marker)                    | A9 `<AssumptionStack>` variant            |
| `uncertainty`   | (none yet — newest of the set)                                      | A10 `<UncertaintyLens>`                   |
| `numerical`     | (none yet — vision principle, not yet a component)                  | future `<NumericsPlayground>` family      |
| `misconception` | ADR 0044 misconception graph; `<Callout variant="misconception">`   | future misconception-aware interventions  |

Every role has either ≥1 existing in-tree instance or ≥1 named
C-tier consumer. No role on this list is speculative; equivalently,
no obvious epistemic stance is missing. The closure isn't permanent
— a future ADR can add a ninth role — but it is firm enough that v1
consumers can rely on the set.

### Why optional + additive rather than required

The component contract from
[ADR 0004](./0004-component-contract-revisions.md) governs ~17
existing components, most of which (Aside, ChapterRef, Figure,
FigureRef, EquationRef, GlossaryTerm, Search, CollapsibleCard) are
*chrome* — they participate in pedagogy but they don't encode a
role. Forcing `epistemicRole` as a required field would either
mis-classify chrome as epistemic content or balloon the role list
to include chrome-shaped roles (`reference`, `glossary`, `search`)
that aren't actually about scientific reasoning. Optional + additive
keeps the role list scoped to genuine epistemic content and lets
chrome stay chrome.

Optionality also lets the retrofit pass land opportunistically.
A future PR adding `epistemicRole: "misconception"` to
`<Callout variant="misconception">` is non-breaking; a future PR
adding `epistemicRole: "observable"` to `<KeyEquation>`'s
`<Observable>` child is non-breaking. The pedagogy-index extractor
can rely on either signal, and `[ADR 0044]`/`[ADR 0046]` consumers
keep working unchanged.

### Why implicit role is "documented, not deprecated"

The implicit-role patterns (variant discriminators, child-component
shapes) were locked by ADRs that pre-date this contract. Deprecating
them would force a migration on already-shipped pedagogy primitives
to satisfy an after-the-fact naming choice — wrong shape.
Documenting them as implicit-but-canonical is the right shape:
the lookup table in
[scientific-reasoning-os.md](../explanation/scientific-reasoning-os.md)
declares "`<Callout variant='misconception'>` has role `misconception`"
and any consumer that needs role-uniformity reads it from the
extractor's normalized output. Two valid in-source shapes, one
normalized read shape.

### Why defer the audit invariant

The natural audit gate (*"every OMI-framed chapter reaches all
three roles"*) requires that role-bearing components exist in
abundance on the page. Today, the only consistently-tagged
role-bearing components are misconception Asides and Equation
Biography children — too narrow a base for a chapter-level
conformance check. A8 `<OMIFlow>` is the component that makes the
audit invariant cheap to write (one OMIFlow per OMI chapter
trivially satisfies the gate). Shipping the invariant before A8
exists would fire false-positives across every existing chapter.
Defer.

## Alternatives considered

- **Implicit-only via variants** (status quo). Pros: no new schema
  surface; existing components already work. Cons: scales poorly
  across components (each component invents its own variant
  vocabulary); AI authoring cannot reason about role uniformly;
  future C-tier components have no contract to inherit; the
  Reasoning-OS thesis has nothing concrete to point at. **Rejected.**

- **Role as a *required* field on every pedagogy component.** Pros:
  uniformity is enforced. Cons: misclassifies chrome as epistemic
  content; balloons the role list to include non-reasoning roles;
  forces a 15-component migration today for benefit that lands
  later. **Rejected** on YAGNI grounds and on
  [ADR 0023 vertical-slice-first](./0023-vertical-slice-build-order.md)
  grounds.

- **Role as a Tailwind `data-` attribute, no schema.** Pros: cheap
  to add. Cons: violates the
  [ADR 0003 Zod-as-source-of-truth](./0003-zod-as-source-of-truth.md)
  rule; AI authoring cannot read DOM-only signals; the pedagogy-
  index extractor would have no access. **Rejected.**

- **Twelve roles instead of eight** (adding `data`, `prediction`,
  `derivation`, `limitation`). Pros: finer granularity. Cons:
  `data` collapses into `observable`; `prediction` is a *teaching
  move* (`<Predict>`) not an epistemic role; `derivation` is a
  rendering surface of a `model`; `limitation` is either
  `approximation` (with validity domain) or `assumption` (without).
  Each candidate dissolves into the eight on closer inspection.
  **Rejected** — collapse-to-eight is the SoTA shape.

- **Four roles only** (OMI + assumption). Pros: minimal surface.
  Cons: leaves `uncertainty`, `numerical`, and `misconception`
  un-typed; misses the entire computational-thinking and
  uncertainty-aware vein of the Reasoning-OS thesis;
  `<UncertaintyLens>` has nothing to bind to. **Rejected** —
  too narrow.

- **Defer the contract until the first C-tier component is built.**
  Pros: just-in-time. Cons: the first C-tier component would set
  the vocabulary unilaterally; the post-hoc retrofit of 0044/0046/
  OMI to that vocabulary is harder than naming the set first.
  **Rejected** on "build the best now" grounds.

## Consequences

**Easier:**

- Authors and reviewers can ask *"what's the epistemic role of this
  element on the page?"* and get a canonical answer from the eight-
  role taxonomy plus the implicit-role lookup table.
- AI authoring per [ADR 0030](./0030-audience-and-ai-author-model.md)
  can generate role-aware content. The pedagogy AI role can target
  *"propose three observables and one inference for this OMI
  section"*, not just *"propose three components."*
- Future C-tier composite components (A8–A11) have a stable
  vocabulary to extend. The per-slot role declaration is a one-line
  schema addition rather than a per-component design exercise.
- The Reasoning-OS thesis in
  [vision/reasoning-os/](../vision/reasoning-os/index.md) is
  defensible from locked ADRs (0044, 0046, 0058) rather than from
  aspiration.
- The eventual epistemic theme-token slot on
  [ADR 0005](./0005-theming-three-layers.md)
  (`color.role.observable`, motion language for role transitions,
  edge-style for `assumption` vs. `approximation`) has a stable
  enum to bind to.

**Harder:**

- Future component proposals will be asked *"what epistemic role does
  this encode?"* — a small but real cognitive cost on new component
  design. Components that don't fit any role are likely chrome;
  this is a feature, not a bug, but it forces explicit reflection.
- The lookup table in
  [explanation/scientific-reasoning-os.md](../explanation/scientific-reasoning-os.md)
  is a maintenance burden: every new pedagogy component with an
  implicit role needs a lookup entry. Drift is the failure mode.
- The closed eight-role set forecloses on ninth-role proposals
  without an amending ADR. A future role like `provenance`,
  `intervention`, or `representation` would need its own ADR
  amendment. The closure is a feature for stability but a friction
  for evolution.

**Triggers:**

- **Future code PR** (out of scope for this ADR): add
  `packages/core/src/schema/epistemic-role.ts` exporting the
  `EpistemicRole` Zod enum; extend the pedagogy-index extractor
  (per [ADR 0038](./0038-pedagogy-index-pattern.md)) to normalize
  implicit-role signals to the same shape as the explicit field.
- **CLAUDE.md amendment** (in this PR): add the Reasoning-OS thesis
  sentence to "What Sophie is"; refresh the locked-decisions table
  through 0058; add an "epistemic legibility is a first-class
  concern" engineering principle.
- **vision/features/accepted.md** (in this PR): register A8
  `<OMIFlow>`, A9 `<AssumptionStack>`, A10 `<UncertaintyLens>`,
  A11 linked-representation state primitive as accepted-pending-ADR
  with this ADR as their prerequisite.
- **Future ADRs** (out of scope): A8 ADR for `<OMIFlow>` (the
  canonical compound primitive that proves the contract works
  end-to-end); A11 ADR defining the cross-component linked-
  representation state primitive (architecturally distinct from
  [`useInteractive`](./0007-persistence-indexeddb.md), which is
  per-component persistence); a future ADR extending
  [ADR 0005](./0005-theming-three-layers.md) with epistemic theme-
  token slots.
- **Future audit invariant** (out of scope): the OMI-coherence
  invariant — *"every chapter with `framing: 'OMI'` reaches all
  three observable / model / inference roles"* — paired with the
  A8 `<OMIFlow>` graduation so the gate has something cheap to
  satisfy.

## Revisions

### R-greenfield — First greenfield application at scale (2026-05-18)

The Reasoning OS Core Phase 1 sprint
([ADR 0046](./0046-equation-biography.md) §R7 PR-α/β/γ/δ;
[#91](https://github.com/drannarosen/sophie/pull/91) /
[#92](https://github.com/drannarosen/sophie/pull/92) /
[#93](https://github.com/drannarosen/sophie/pull/93) /
[#94](https://github.com/drannarosen/sophie/pull/94)) shipped the first
greenfield application of this ADR's component-side role const +
schema-side `z.literal` pattern (§Decision "pattern 3") at scale. Three
biography children carry `epistemicRole` via the canonical shape; two
deliberately omit it per §"chrome":

| Component | Role | Pattern applied |
|-----------|------|-----------------|
| `<Observable>` | `observable` | Component const `OBSERVABLE_EPISTEMIC_ROLE = "observable" as const satisfies EpistemicRole` + schema `EpistemicRoleSchema.extract(["observable"])` |
| `<Assumption>` | `assumption` | Component const `ASSUMPTION_EPISTEMIC_ROLE` + schema `EpistemicRoleSchema.extract(["assumption"])` |
| `<BreaksWhen>` | `approximation` (validity-domain marker) | Component const `BREAKS_WHEN_EPISTEMIC_ROLE` + schema `EpistemicRoleSchema.extract(["approximation"])` |
| `<Units>` | — (chrome) | NO role const; schema omits `epistemicRole`; comment-documented per §"chrome" |
| `<CommonMisuse>` | — (cross-ref carries) | NO role const; inherits linked misconception's role at audit-time via the optional `misconception:` slug field |

**`EpistemicRoleSchema.extract([...])` grounds the role binding twice**
— at compile time (TS literal narrowing) AND at parse time (Zod
literal validation). A typo like `"observabel"` fails type-check at
the component callsite AND fails parse when the schema runs against
an extractor output. This double-binding is the canonical role-
declaration shape for any future role-bearing greenfield component.

**The Tier-3 chrome omission is structurally enforced**, not merely
descriptive: every biography schema is `.strict()` (per ADR 0046 §F1),
so a future extractor accidentally emitting
`epistemicRole: "misconception"` on a `<Units>` or `<CommonMisuse>`
entry now *fails parse* rather than silently shipping a drifted role.
PR-A
([#95](https://github.com/drannarosen/sophie/pull/95)) extended the
same `.strict()` discipline to `MultiRep*Schema` and
`Intervention*Schema` so all three Reasoning OS Core families share
one schema posture.

**Audit verification**: the Phase B Reasoning OS core audit
(`docs/reviews/2026-05-17-reasoning-os-core.md` §2.4) called out
this pattern as "the *cleanest* pattern in the codebase for greenfield
component-role declaration" and recommended this §R-greenfield note
back-fill as a P1 priority. Future role-bearing components (whether
biography-family or otherwise) should follow this shape; reviewers
should flag drift on every PR.

### R-deep-dive — Callout deep-dive variant joins the implicit-role table; the-more-you-know stays outside the taxonomy (2026-05-19)

Session 9 P3 ([PR #130](https://github.com/drannarosen/sophie/pull/130))
shipped two new `<Callout>` variants at the renderer surface:

- `<Callout variant="deep-dive">` — technical depth on the same topic
  the surrounding prose covers (telescope icon, native `<details>`
  collapsibility, "Deep Dive: " title prefix, default-collapsed,
  print-mode auto-expand).
- `<Callout variant="the-more-you-know">` — adjacent enrichment
  (history, fun facts, connections) with the same collapse shape.

PR-B (this PR) ships the pedagogy-tracking layer. The two variants
divide cleanly across the taxonomy boundary:

| Variant                                 | Implicit role                                  | Tracked in `PedagogyIndex.deepDives`?                               | Pattern                              |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `<Callout variant="deep-dive">`         | inherited from surrounding pedagogical context | **Yes** — one `DeepDiveEntry` per call site (anchor + title + body) | §Decision §3 (variant discriminator) |
| `<Callout variant="the-more-you-know">` | — (chrome / enrichment)                        | **No** — intentionally outside the eight-role contract              | §Decision §3 "chrome" treatment      |

**Why deep-dive is tracked but the-more-you-know is not.** The eight
roles (observable / model / inference / assumption / approximation /
uncertainty / numerical / misconception) are about *scientific
reasoning*. Deep-dive surfaces scaffold reasoning — they extend a
chapter's main thread with technical depth, derivation, mechanism, or
worked detail. Their epistemic role is *inherited* from the
surrounding context: a math-derivation deep-dive carries `derivation`-
shaped content (often `model`), a physical-picture deep-dive carries
`model`, a mechanism deep-dive carries `inference`. The deep-dive
component itself does NOT declare a fixed role const — mirroring the
ADR 0046 `<CommonMisuse>` pattern of inheriting role from a linked
container.

The-more-you-know is **deliberately outside** the taxonomy. Enrichment
content (cultural history, scientist anecdotes, fun connections) is
not scientific reasoning. Forcing every Callout into a role would
either mis-classify enrichment as epistemic content or balloon the
role list with non-reasoning categories (`history`, `enrichment`,
`anecdote`). Drawing the line at *the-more-you-know = no role* keeps
the role list scoped to what ADR 0058 §Rationale §"why eight roles"
already locked: minimum closed set covering reasoning.

**This is the first ADR-blessed precedent for "rendered but not
indexed."** Future Callout-class variants should declare on PR which
side of the boundary they sit on: tracked (gets a `PedagogyIndex`
entry kind) or chrome (renders normally but produces no index entry).
Reviewers should ask the boundary question on every new variant PR.

**Index shape.** PR-B adds `PedagogyIndex.deepDives:
readonly DeepDiveEntry[]` and the anchor-prefix table entry `dd-`
(auto: `dd-${counter}` when no `id`/`title` present, slug(title) when
title present, explicit `id` otherwise). The `DeepDiveEntry` schema
mirrors the inline-content shape (`chapter`, `anchor`, `title`,
`body`) and lives in `inline-content.ts` per ADR 0061 C4 domain
grouping. The extractor (`extractDeepDives`) walks `<Callout
variant="deep-dive">` flow elements only and follows the unified-
anchor precedence established in [PR #128](https://github.com/drannarosen/sophie/pull/128).

**Updates to inline-content.ts §1 mapping.** The header comment in
`packages/core/src/schema/pedagogy-index-entries/inline-content.ts`
now lists deep-dive alongside definition / key-insight /
misconception:

- definition  → observable / inference (terminological grounding)
- key-insight → inference (the "so what" of a chapter)
- misconception → uncertainty (the durable wrong-model alert)
- **deep-dive → role-inherited from container (per §R-deep-dive)**

### 2026-05-23 — Wedge B-followup W4c: Observable/Model/Inference rollup chrome + per-callsite Spec routes

W4c ships the first cross-component application of this ADR's §4
composite contract (*"Composite components must declare role per
slot"*) at scale. Three new CourseX rollup components
(CourseObservables / CourseModels / CourseInferences) and three
new per-OMIFlow-callsite Spec routes
(`/library/observables/<unit>-<anchor>/`,
`/library/models/<unit>-<anchor>/`,
`/library/inferences/<unit>-<anchor>/`) **derive their entry
lists from existing `OMIFlowEntry` slot data** — no new schema,
no new extractor. Per §4, OMIFlow's three slots (`observable` /
`model` / `inference`) already carry the role binding, so each
rollup is a projection of `PedagogyIndex.omiFlows` through the
relevant slot accessor.

**`data-epistemic-role` on role label paragraphs.** Each new
rollup component and each new Spec page entry renders a small
role-label paragraph carrying
`data-epistemic-role="observable|model|inference"`. This is the
first ADR 0058-blessed *rendered* surface for the role enum (the
prior R-greenfield instances bound role at the schema layer
only — `<Observable>` and friends carry no runtime role marker on
their DOM output). The data attribute lets downstream consumers
(theme tokens per ADR 0005, future epistemic filter UI, AI
authoring per ADR 0030) read the role without re-deriving it
from the slot-name lookup table.

**Three roles still deferred per §4.** `assumption`,
`approximation`, and `numerical` remain unbacked by composite
chrome. The current Sophie surface carries `assumption` and
`approximation` implicitly through `<KeyEquation>`'s
`<Assumption>` and `<BreaksWhen>` children (per §R-greenfield),
but neither has a Library rollup yet — there is no
`<AssumptionStack>` (A9) or `<UncertaintyLens>` (A10) shipped to
provide the slot-name binding the way OMIFlow does for the OMI
triple. `numerical` has no in-tree role-bearer at all. **Trigger
to revisit:** when role-tagging extends to other entry types
(e.g., a future `<EquationCommentary>` declaring
`epistemicRole="approximation"` explicitly) OR a new entry type
with explicit role ships (A9 / A10 / future `<NumericsPlayground>`).
Until then the contract is honored by intentional non-extension,
not by chrome that doesn't exist.

**Role assignments for the five W4a Spec routes** (per the
§R-deep-dive table's "rendered but typed" precedent):

| Spec route                           | Role            | Source                                                |
| ------------------------------------ | --------------- | ----------------------------------------------------- |
| `/library/key-insights/<slug>/`      | `inference`     | Per §R-deep-dive table ("the 'so what' of a chapter") |
| `/library/glossary/<slug>/`          | `observable`    | Terminological grounding per §R-deep-dive table       |
| `/library/misconceptions/<slug>/`    | `misconception` | Canonical instance per §3                             |
| `/library/equations/<id>/`           | `model`         | Per the canonical KeyEquation role binding            |
| `/library/figures/<name>/`           | `observable`    | W2 default — registry doesn't carry explicit role     |

These are **rendered** assignments on the Spec page templates, not
schema fields — the underlying entries carry no `epistemicRole`
field at v1 (the W2 default for non-greenfield components per
§2). When a future PR opportunistically lifts a role to explicit
on one of these entry types (per §2 optional + additive), the
template binding stays consistent; the read shape is the same.

**Companion ADRs.** [ADR 0070 W4c entry](./0070-library-room-and-registry-spec-pages.md#id-2026-05-23-wedge-b-followup-w4c-shell-extraction-3-omiflow-rooms-8-per-entry-spec-routes)
documents the full Library shell extraction; [ADR 0079 W4c
entry](./0079-topic-registry-and-resolution-pattern.md#id-2026-05-23-wedge-b-followup-w4c-pra-2-graduation-topic-spec-card-body-inline-rendering)
documents the Topic Spec page changes.

### R-0080-A2 — Chrome vs. pedagogy component-set split (2026-05-26)

The course-info projection sprint
([PR #199](https://github.com/drannarosen/sophie/pull/199), commit
`4e0730e`) operationalizes this ADR's chrome-vs-pedagogy boundary at
the code level. Two factories ship at
[`packages/astro/src/components.tsx`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components.tsx):

- `makeStaticComponents({ figures })` — chapter MDX; full set
  including the eight epistemic-role pedagogy primitives.
- `makeChromeComponents({ figures })` — course-info prose fragments
  at `src/content/course-info/`; excludes pedagogy primitives
  (`<OMIFlow>`, `<WorkedExample>`, `<MultiRep>`, `<Intervention>`)
  whose meaning depends on chapter context. Includes the inline
  chrome subset (`<Callout>`, `<GlossaryTerm>`, `<KeyEquation>`,
  `<EquationRef>`, `<FigureRef>`, `<Aside>`).

Plus a separate family of **five MDX-authorable course-management
chrome components** at `@sophie/components/chrome/`: `<Due>`,
`<Points>`, `<Reading>`, `<OfficeHours>`, `<Week>`. All carry **no
epistemic role** per this ADR's chrome classification; they read
course data via `useCourseSpec()` (SSR-setter store doctrine, not a
`virtual:` import in `@sophie/components`).

The boundary is now structurally enforced: an AI author cannot
accidentally emit `<OMIFlow>` inside a course-info prose fragment
because `makeChromeComponents` doesn't expose it. The eight-role
taxonomy stays optional + additive (§2); this amendment names the
boundary at which the set is sliced.

See [ADR 0080 Amendment 2](./0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26)
for the projection-pattern decision trail.

### R-graduation — `epistemicRole` enforced for new components (2026-05-28)

**Trigger.** ITEM 5 of the post-ITEM-2 hardening arc. The eight-role
contract shipped optional + additive (§2): self-evident components
declared a role, but nothing stopped a *new* pedagogy component from
silently shipping role-less. That left "Sophie is a Scientific
Reasoning OS" conventional rather than structural — true by author
discipline, not by construction. This revision graduates the contract
from **optional/additive → enforced-for-new** via a repo-level lint
gate, without changing the taxonomy itself (still the locked eight
roles) or requiring a migration of existing components.

**The gate.** [`scripts/lint-epistemic-role.ts`](https://github.com/drannarosen/sophie/blob/main/scripts/lint-epistemic-role.ts)
(mirrors `scripts/lint-axe-render.ts` / R11 structurally) scans every
immediate child dir of `packages/components/src/components/`. A dir is
**compliant** iff ANY of:

1. it declares a role via the canonical §Decision "pattern 3" shape
   (`export const X_EPISTEMIC_ROLE = "<role>" as const satisfies
   EpistemicRole`; the field form `epistemicRole: "<role>"` also
   matches defensively) — detected **after comment-stripping**, so
   prose mentions of `epistemicRole` in headers/docblocks do not
   register as declarations;
2. it is in `ROLE_VIA_SLOT` — OMI composites that bind role per-slot
   (§4), currently `OMIFlow` (1);
3. it is in `CHROME` — role-less by design (structural / layout /
   navigation / course-info chrome), each entry with a one-line
   rationale (39);
4. it is in `GRANDFATHERED` — contestable pedagogy pending the domain
   pass, **tracked-not-blocking** (14).

Non-compliant → `process.exit(1)` (CI red); a moved/unreadable SCOPE →
`process.exit(2)` with a one-line diagnostic. Wired into the CI `lint`
job (after the R11 `lint:axe-render` step) as `pnpm
lint:epistemic-role`.

**Conservative scope (B2 — no new annotations).** The five
**auto-detected declarers** — `<Observable>`, `<Assumption>`,
`<BreaksWhen>` (R-greenfield), `<DerivationStep>`, `<WorkedExample>` —
already carry the canonical const; this revision adds **no new role
annotations**. Self-evident components had already declared; the rest
split cleanly into chrome (role-less by design) or grandfathered
(contestable). Forcing a role onto an ambiguous component to satisfy
the gate would corrupt the very vocabulary the contract protects.

**Deferred: the ambiguous role-adjudication domain pass.** The 14
`GRANDFATHERED` entries (the formative family — `<MCQ>` /
`<MultiSelect>` / `<FillBlank>` / `<NumericQuestion>` / `<QuickCheck>`
/ `<PracticeProblem>` / `<Solution>` / `<Hint>`; the representation
family — `<RepEquation>` / `<RepFigure>` / `<RepVerbal>` /
`<MultiRep>`; `<KeyEquation>`; `<CommonMisuse>`) have genuinely
contestable roles — assessment-as-chrome vs. inference-act,
role-lives-on-the-bound-concept, role-per-part-not-per-component,
declare-vs-inherit. Adjudicating them is **its own follow-up PR,
Anna-adjudicated** (the chrome-vs-pedagogy and obvious-vs-ambiguous
lines are the epistemics the whole contract is about; miscategorizing
undermines the thesis). The `GRANDFATHERED` list is designed to
**shrink toward empty** as that pass resolves each entry to a role or
to chrome.

This revision adds no fields, changes no taxonomy, and migrates no
existing component; it makes the *new-component* obligation a CI
invariant rather than a convention. The optional/additive guarantee of
§2 stands for everything already shipped.

## References

- [ADR 0003 — Zod as source of truth](./0003-zod-as-source-of-truth.md)
  — why `epistemicRole` is a Zod enum, not a DOM attribute.
- [ADR 0004 — Component contract revisions](./0004-component-contract-revisions.md)
  — the contract this ADR amends with the optional role field.
- [ADR 0005 — Three-layer theming](./0005-theming-three-layers.md)
  — future epistemic token slots bind to this ADR's enum.
- [ADR 0007 — Persistence (IndexedDB)](./0007-persistence-indexeddb.md)
  — `useInteractive` is per-component persistence;
  linked-representation state (A11) is architecturally distinct.
- [ADR 0023 — Vertical-slice build order](./0023-vertical-slice-build-order.md)
  — why naming the contract now (lean) before building C-tier
  components (refactor outward) is the right shape.
- [ADR 0030 — Audience + AI author model](./0030-audience-and-ai-author-model.md)
  — the four AI roles consume the epistemic role vocabulary.
- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md)
  — the extractor that normalizes implicit-role signals.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — future role-aware conformance gates bind here.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — the canonical instance of role `misconception`.
- [ADR 0046 — Equation Biography](./0046-equation-biography.md)
  — the canonical instance of roles `observable`, `model`,
  `assumption`, `approximation` (via `<BreaksWhen>`).
- [vision/reasoning-os/](../vision/reasoning-os/index.md) — the
  thesis section this ADR underwrites.
- [explanation/scientific-reasoning-os.md](../explanation/scientific-reasoning-os.md)
  — author-facing how-to-use page with the implicit-role lookup
  table.
- [vision/features/accepted.md](../vision/features/accepted.md) —
  A8–A11 registered as accepted-pending-ADR with this ADR as their
  prerequisite.
