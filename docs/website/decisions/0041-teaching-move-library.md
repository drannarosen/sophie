---
date: 2026-05-14
tags: [pedagogy, decisions, teaching-moves, taxonomy, components, lds]
---

# ADR 0041: Teaching Move Library

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's chapter components — `<Predict>`, `<Aside kind="key-insight">`,
`<ComprehensionGate>`, `<Reflection>`, `<CollapsibleCard>`,
`<Aside kind="misconception">`, `<KeyEquation>`, and the rest — each
*implement* a pedagogical move. `<Predict>` elicits prior models;
`<Aside kind="misconception">` confronts wrong models; `<Reflection>`
prompts self-explanation; `<ComprehensionGate>` runs retrieval
practice; and so on. But the *moves themselves* aren't named in
Sophie. When a chapter author (or AI under instructor supervision)
designs a new section, the available vocabulary is the component
list — not the move list. The question "what teaching move are we
making here?" lacks a place to land before "what component do you
want?"

This matters for three reasons:

1. **AI-authoring grounding.** When the future `sophie-chapter-author`
   workflow (deferred per
   [`vision/features/backlog.md`](../vision/features/backlog.md))
   matures, AI scaffolding needs a *move vocabulary* to reason in.
   Without it, every prompt reinvents the moves; with it, AI can
   ground decisions in named patterns ("for this concept, use a POE
   sequence: elicit-prior-model → contrasting-evidence → reconciliation").
2. **Curriculum-design legibility.** TDRs (per
   [ADR 0040](./0040-teaching-decision-records.md)) capture
   *why* a curriculum was designed this way. Many TDR rationales
   will reference a teaching move ("we use predict-then-reveal here
   because…"). Without a canonical move library, TDR rationales
   diverge in vocabulary across chapters, across courses, across
   instructors.
3. **SoTL credibility.** Sophie's tenure-case + SoTL-paper claims
   depend on the platform being *grounded in cognitive-science
   research*, not pedagogical folk practice. Naming Sophie's moves
   after established constructs (Posner et al., Chi, Sweller,
   Ainsworth, Renkl, Roediger & Karpicke, etc.) with proper citations
   makes the platform publishable and citable.

This ADR is the second graduation through the
[staging-area lifecycle](../vision/transitions/index.md) — the
[`vision/features/accepted.md`](../vision/features/accepted.md) A2
entry surfaced the open ADR question; this ADR resolves it.

## Decision

Sophie ships a **Teaching Move Library**: a canonical set of ~18
named pedagogical moves, each with a literature-grounded canonical
name, a practice gloss, citations where available, a description, a
list of Sophie components that implement it, and adjacency notes
("don't confuse with…").

The library lives at
[`reference/teaching-moves.md`](../reference/teaching-moves.md) as
the platform-docs source of truth. Consumer repos (per
[ADR 0001](./0001-platform-not-monorepo.md)) reference it by name;
they do not need their own copies.

### Taxonomy origin: hybrid

Each move's *canonical name* is grounded in cognitive-science
literature where a single citation applies (e.g., **Productive
cognitive conflict** per Vosniadou 1994; **Worked example with
fading** per Sweller 1988 / Renkl 2014). Each move's *practice gloss*
is the name Anna or other instructors actually use ("predict-then-
reveal", "misconception elicitation", "the OMI scaffold"). The
move library renders both — canonical name as the heading, practice
gloss as `**Also known as:**`.

Two moves (out of 18) ground in *Sophie-native practice* rather than
single-citation literature because no single citation fits cleanly:

- **Observable → model → inference scaffold** — Anna's epistemic
  framing for ASTR 201, aligned with Hempelian DN reasoning but not
  a single citable construct.
- **Frontier flagging** — Sophie's convention for surfacing open
  research questions; not yet a literature construct.

One move (**Approximation honesty**) is STEM-teaching folk practice
without a single dominant citation; it's named anyway because it's
load-bearing for STEM courses.

### Where `pedagogy_intent` lives in code

Sophie's components declare their pedagogical intent via a
**centralized TypeScript map**:

```
packages/components/src/pedagogy/move-index.ts
```

This file exports a single typed map from component name to teaching
move(s):

```ts
import type { TeachingMove } from "@sophie/core/schema/pedagogy";

export const componentMoves: Record<string, ReadonlyArray<TeachingMove>> = {
  Predict: ["elicit-prior-model", "predict-observe-explain", "productive-failure"],
  AsideMisconception: ["misconception-confrontation"],
  Reflection: ["self-explanation-prompt", "transfer-prompt"],
  ComprehensionGate: ["self-explanation-prompt", "retrieval-practice", "concept-inventory-probe"],
  KeyEquation: ["notation-introduction-protocol"],
  // … etc.
};
```

Storybook stories read from this map (display-only — shows "This
component implements: Elicit Prior Model, POE, Productive Failure"
in the component's documentation). A future audit invariant reads
the same map to verify every shipped component declares at least one
move.

### Hardening additions (2026-05-14)

Per the [foundation review](/Users/anna/Teaching/sophie/docs/reviews/2026-05-14-adrs-0040-0045-foundation-review.md),
the original `move-index.ts` shape was extended with four
coordinated refinements. All ship as part of the v1 platform-docs +
follow-up code PR; together they resolve the Move/Intervention
overlap surfaced by the review, add a measurement layer the
original ADR lacked, and tag the v1 catalog with provisional/
validated lifecycle data.

**1. Move–Intervention linkage** (extends ADR 0044). Each entry in
`packages/components/src/intervention/intervention-index.ts` (per
[ADR 0044](./0044-misconception-graph-and-intervention-library.md))
gains a `move: <slug>` field pointing at the parent move in
`move-index.ts`. Required on canonical interventions; optional on
custom interventions.

```ts
// intervention-index.ts (post-hardening)
export const interventionIndex: Record<string, InterventionEntry> = {
  "contrasting-cases": {
    family: "Confrontation",
    move: "comparison-cases",          // ← NEW: parent-move link
    citation: "Schwartz & Bransford 1998",
    ...
  },
  "bridging-analogy-with-limits": {
    family: "Bridging",
    move: "bridging-analogy",
    citation: "Clement 1993",
    ...
  },
  // ...
};
```

Establishes the clean two-level hierarchy: 18 moves → 12 v1
canonical interventions (each linked to its parent move) →
arbitrary chapter-authored `<Intervention type="custom">`
instances (optional `move=` for self-classification).

**2. Reverse-direction `instantiated_as` field** on move entries
(computed, not authored). The audit-build process walks
`intervention-index.ts` and populates each move entry's
`instantiated_as: [<intervention-slug>, ...]` reverse-pointer.
Readers of `move-index.ts` see "this move has interventions X, Y,
Z" without manual back-pointer authoring.

**3. Inferred move-usage attribution.** Each move entry gains an
`instantiated_by: [<component-pattern>, ...]` field declaring
which Sophie components invoke it at chapter level:

```ts
// move-index.ts (post-hardening)
export const moveIndex: Record<string, MoveEntry> = {
  "predict-observe-explain": {
    family: "Eliciting prior knowledge",
    canonical_name: "Predict-Observe-Explain (POE)",
    practice_gloss: "predict-then-reveal",
    citation: "White & Gunstone 1992",
    instantiated_by: ["Predict"],            // ← NEW
    validated_in: ["astr201-sp25", "astr201-sp26-ch4"],  // ← NEW
    instantiated_as: ["predict-then-reveal-with-stakes"], // ← computed
    ...
  },
  "multiple-representations-binding": {
    family: "Representations + comparison",
    instantiated_by: ["MultiRep"],
    ...
  },
  "contrasting-cases": {
    instantiated_by: [
      "Intervention[type=contrasting-cases]",
      "MultiRep[mode=comparison]"
    ],
    ...
  },
  // ...
};
```

The audit walks the chapter-level PedagogyIndex, counts component
instantiations matching each move's `instantiated_by` patterns,
and emits a **course-level `move_usage` aggregation** in
`sophie audit --summary` (per
[ADR 0047 Empirical Validation Plan](./0047-empirical-validation-plan.md)
`sophie audit --metrics`):

```text
Move usage across course:
  predict-observe-explain        12 instances across 7 chapters
  contrasting-cases               5 instances across 4 chapters
  retrieval-with-feedback         9 instances across 6 chapters
  bridging-analogy                3 instances across 3 chapters
  metacognition-prompts           1 instance  across 1 chapter   (outlier?)
  pedagogical-diff                0 instances                    (unused)
```

Surfaces curriculum-coverage imbalances (over-reliance on one
move family) without forcing any threshold. **Inferred attribution
keeps authoring burden zero** — no per-component `move=` prop;
the declarative `instantiated_by` mapping in `move-index.ts` is
the only declaration.

**4. Provisional-vs-validated tagging.** Each move entry gains
`validated_in: string[]` (default `[]`, semester-anchored slugs
like `astr201-sp25` or `astr201-sp26-ch4`). v1 catalog ships with
realistic values reflecting Anna's prior course experience — moves
exercised in past semesters land as `validated_in: ["astr201-sp25"]`;
speculative moves stay `[]`. The audit summary includes a
validation-status footer:

```text
Validation status: 3 of 18 moves validated in current course;
                   5 validated in prior courses but unused here;
                   10 remain provisional.
```

Implicit lifecycle via `validated_in` (empty = provisional;
non-empty = validated). No separate `status: provisional | validated`
field — it would drift from `validated_in` over time.

### Audit invariant I4 (extends ADR 0044's I-family)

**I4 (WARNING)** — every canonical intervention's `move:` field
must resolve to a real move in `move-index.ts`. Custom
interventions (`type="custom"`) can declare `move=` too; if they
do, I4 applies. Cross-ADR couples ADR 0041 and ADR 0044 — the
invariant lives in ADR 0044's I-family because that's where
`<Intervention>` lives, but its target is ADR 0041's move
library.

### Move list (v1: 18 moves)

The full move list with citations, descriptions, and component
mappings lives in
[`reference/teaching-moves.md`](../reference/teaching-moves.md). The
v1 taxonomy organizes 18 moves into 7 families:

| Family | Moves |
|---|---|
| **Eliciting prior knowledge** | Elicit prior model; Productive cognitive conflict; Predict-observe-explain (POE) |
| **Confronting misconceptions** | Misconception confrontation; Bridging analogy |
| **Worked examples + fading** | Worked example with fading; Backwards-faded scaffolding; Productive failure |
| **Representations + comparison** | Comparison cases; Multiple representations binding; Concrete-fading |
| **Metacognition + retrieval** | Self-explanation prompt; Retrieval practice; Transfer prompt |
| **Diagnostics** | Concept-inventory probe |
| **Sophie-native** | Observable → model → inference scaffold; Approximation honesty; Frontier flagging |

The list is open to revision — moves can be added (e.g., Mayer's
multimedia learning principles when narrated-slide-deck integration
ships), renamed, or refined as the platform matures. Revisions follow
the ADR-revisions pattern (this ADR gains a `## Revisions §N` section
when the taxonomy changes).

## Rationale

### Hybrid taxonomy beats literature-only or practice-only

**Literature-only** would maximize SoTL credibility but minimize
instructor-author usability — most instructors don't read Posner et
al. 1982. Asking authors to think in `productive-cognitive-conflict`
terms when their lived vocabulary is "the predict-then-reveal move"
creates friction that doesn't earn its keep.

**Practice-only** would maximize immediate usability but minimize
SoTL credibility. A TDR citing "the spoiler alerts move" reads as
idiosyncratic; a TDR citing "Posner et al.'s productive cognitive
conflict (in this course implemented as the spoiler alerts framing)"
reads as defensible.

**Hybrid** gives both: canonical names for citation + SoTL paper +
talk titles; practice glosses for the day-to-day "what move am I
making here?" lookup. Sophie's audience-of-four ([`vision/index.md`](../vision/index.md)
Audiences) — Anna-today, Anna-next-semester, other-instructors,
SoTL-researchers — all benefit. The instructor audiences read the
practice gloss; the SoTL audience reads the citation.

### Centralized map beats per-component schema field

Putting `pedagogy_intent` on every component's Zod `PropsSchema`
would bloat ~30 schemas with a field that's *not author-facing* (no
chapter author writes `<Predict pedagogy_intent={...} />`). The
declaration is *component-author metadata*: it says "this component,
as designed, implements these moves." That's not runtime data; it's
component-library reference data.

A centralized `move-index.ts` map:

- Keeps the binding in one file (easy to audit; easy to
  cross-reference; easy to lint).
- Removes per-component schema bloat.
- Lets Storybook + audit invariants + future AI-authoring prompts
  read from the same source of truth.
- Mirrors the precedent set by
  [PR-C4's PedagogyIndex pattern](./0038-pedagogy-index-pattern.md)
  — load-bearing platform metadata lives in one canonical map,
  consumed by many surfaces.

### v1 scope: 18 moves is the right floor

Fewer than ~15 moves leaves gaps (Sophie's existing components
implement more moves than that). More than ~25 moves at v1 is
premature — the taxonomy is harder to learn, harder to maintain, and
harder to update if moves turn out to overlap. 18 covers Sophie's
shipped components plus the obvious extensions
(`<WorkedExample>`, `<MultiRep>`, `<Approximation>`) without
front-running unshipped territory.

## Consequences

### For Sophie-the-platform (this commit)

This commit ships **docs only**:

1. ADR 0041 (this file) — ratifies the practice + design.
2. [`reference/teaching-moves.md`](../reference/teaching-moves.md) —
   the 18-move library with citations, descriptions, mappings.
3. `myst.yml` — registers both files in their respective TOC
   sections.
4. `vision/features/accepted.md` — A2 collapsed to a graduated
   pointer.
5. `vision/features/index.md` — second graduation announced.

### For Sophie-the-platform (future code PR)

A subsequent code PR will ship:

1. `packages/components/src/pedagogy/move-index.ts` — the move
   library map, populated for every move in v1, with
   `instantiated_by` patterns + `validated_in` slugs per move,
   plus computed `instantiated_as` reverse-pointers from the
   intervention library.
2. `packages/components/src/intervention/intervention-index.ts`
   amendment (per ADR 0044) — each canonical intervention gains
   the `move:` field pointing at its parent move.
3. `packages/core/src/schema/pedagogy.ts` — the `TeachingMove`
   type (string-literal union matching the 18 move IDs) +
   `MoveEntry` shape including `instantiated_by`, `validated_in`,
   `instantiated_as`.
4. Storybook integration — each component's story reads from the
   map and renders a "Implements moves: …" panel.
5. `<Intervention>` render update — citation-grade caption at use
   site: *"Intervention: contrasting-cases (instance of move
   `comparison-cases`, Schwartz & Bransford 1998)"*.
6. Audit invariant `MOVE1` (Sophie-platform-audit, not consumer-
   repo-audit) — every component must declare at least one move OR
   explicitly declare itself non-pedagogical (e.g., layout
   primitives like `<Spacer>`, `<TwoColumn>`).
7. Audit invariant **I4** (cross-ADR with ADR 0044) — every
   canonical intervention's `move:` resolves in `move-index.ts`.
8. Audit aggregation: `sophie audit --summary` emits course-level
   `move_usage` statistics (counts + chapter coverage per move +
   validation-status footer).

That code PR follows the standard branch + PR cadence per
[`feedback_branch_pr_scope`](../../../) memory. This commit doesn't
include it; the ADR + reference doc precede the code.

### For TDRs (per [ADR 0040](./0040-teaching-decision-records.md))

TDR Rationale sections cite teaching moves by canonical name:

> *"We use a Predict-Observe-Explain (POE) sequence here per White &
> Gunstone (1992); see Sophie ADR 0041 move catalog."*

This gives every TDR a *named pedagogical handle* that survives
revision and is transferable across courses.

### For AI authoring (future)

The `sophie-chapter-author` workflow (deferred; see
[`vision/features/backlog.md`](../vision/features/backlog.md) /
roadmap Phase 3) reads `move-index.ts` as part of its context. When
prompted to scaffold a new section, AI proposes a *move sequence*
("for this Hubble's-law section: elicit-prior-model → predict-
observe-explain → comparison-cases → notation-introduction-protocol"),
each grounded in the canonical taxonomy. The instructor reviews the
proposed move sequence as a TDR draft before any prose is generated.

### For SoTL paper + tenure case

The Teaching Move Library is a citable artifact in its own right.
Paper-1-methods (per [`strategy/papers/`](../strategy/papers/index.md))
can describe "Sophie's 18-move taxonomy grounded in cognitive-science
literature" with the reference doc as supporting material. The
literature-grounded canonical names make every component citation
defensible.

## Alternatives considered

### Literature-only taxonomy

Use only literature-grounded names; no practice glosses. Rejected
because most instructor-authors don't read the cited literature
fluently. Forcing them to operate in academic-vocabulary terms when
their lived vocabulary is more concrete creates friction that
doesn't pay off. The hybrid taxonomy keeps the literature names as
canonical (for citation purposes) while letting instructors operate
in their own terms day-to-day.

### Practice-only taxonomy

Use only Anna's practice vocabulary; skip the literature grounding.
Rejected because (a) it limits the taxonomy to one instructor's
idiom, blocking multi-instructor adoption; (b) it weakens SoTL
defensibility — a paper citing "the spoiler alerts move" reads as
idiosyncratic, not as a category-defining construct.

### Per-component schema field for `pedagogy_intent`

Add a `pedagogy_intent: TeachingMove[]` field to every Zod
PropsSchema. Rejected as ceremony: the declaration is
component-author metadata (not chapter-author data), so putting it
in a runtime-validated schema is a category error. A centralized map
serves the same audit + Storybook needs without 30 schema additions.

### No code binding — reference doc only

Skip the `move-index.ts` map; let `reference/teaching-moves.md`
stand alone as a doc. Rejected because future AI authoring + audit
invariants need a *queryable* binding, not just a doc that humans
read. The centralized map is the smallest possible binding; reference-
only would force re-introducing this work later.

### Larger v1 move list (25-30 moves)

Front-load moves Sophie doesn't yet have components for (e.g.,
Mayer's multimedia principles for narrated slides, Black & Wiliam
formative-assessment moves for assignment grading, VanLehn's
intelligent-tutoring moves for adaptive feedback). Rejected as
speculative: the v1 list covers what Sophie's components currently
implement plus the obvious-next-extensions
([`<WorkedExample>`, `<MultiRep>`, `<Approximation>`]). Front-running
unshipped territory creates phantom entries that have no Sophie
components implementing them — visible vacancies in the reference
doc.

### Smaller v1 move list (8-12 moves)

Cover only the most-frequently-invoked moves; defer the rest.
Rejected because the cost of adding a move later (revising the doc,
updating the map, updating TDRs that referenced an absent move) is
higher than the cost of including it at v1. The 18-move list is
the *floor*, not the ceiling.

## Revisions

**§1 — 2026-05-14 Hardening pass.** Per
[the foundation review](/Users/anna/Teaching/sophie/docs/reviews/2026-05-14-adrs-0040-0045-foundation-review.md),
this ADR was edited in place (under Anna's explicit mutability
override for the first hardening pass) to add:

- Move/Intervention linkage: `move: <slug>` field on
  `intervention-index.ts` entries (resolves the architectural
  overlap with ADR 0044).
- Reverse `instantiated_as` field on move entries (computed,
  not authored).
- Inferred move-usage attribution: `instantiated_by:
  [<component-pattern>]` on move entries; audit infers usage from
  PedagogyIndex; no per-component `move=` prop burden.
- Course-level `move_usage` aggregation in `sophie audit --summary`
  (no new audit invariant; derived statistics).
- Provisional-vs-validated tagging: `validated_in: string[]` on
  move entries (default `[]`, semester-anchored slugs); implicit
  lifecycle, no separate status field.
- Cross-ADR audit invariant **I4** (WARNING): intervention's
  `move=` must resolve in `move-index.ts` (extends ADR 0044's
  I-family).
- `<Intervention>` renders parent move as citation-grade caption
  at use site.

The immutability convention re-applies after this hardening pass
completes. Future revisions land as new ADRs.

Further taxonomy revisions (move additions / renames / refinements
beyond the hardening pass) follow the pattern established by
[ADR 0038 §1, §2](./0038-pedagogy-index-pattern.md): a new
`## Revisions §N` section appended documenting the change + reason.

## References

- [`reference/teaching-moves.md`](../reference/teaching-moves.md) —
  the 18-move library with full entries (citations, descriptions,
  Sophie-component mappings, `instantiated_by`, `validated_in`).
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDR Rationale sections cite teaching moves by canonical name.
- [ADR 0030 — audience and AI author model](./0030-audience-and-ai-author-model.md)
  — AI authoring grounds in this taxonomy. Per the 2026-05-14
  hardening, ADR 0030 also documents Sophie's commitment to AI-
  primary authoring.
- [ADR 0038 — pedagogy index pattern](./0038-pedagogy-index-pattern.md)
  — the centralized-metadata-map precedent.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — the parent-move link from each intervention; cross-ADR audit
  invariant I4 lives here.
- [ADR 0047 — Empirical Validation Plan](./0047-empirical-validation-plan.md)
  — move-usage aggregation feeds the eight-metric headline set;
  `validated_in` tagging surfaces in the validation summary.
- [ADR 0049 — `sophie refactor` CLI Family](./0049-sophie-refactor-cli-family.md)
  — refactor commands may touch move-index entries when a move is
  renamed or merged.
- [`reference/intervention-library.md`](../reference/intervention-library.md)
  — the 12-v1 canonical intervention list; each entry's `move:`
  field points at this ADR's taxonomy.
- [`vision/features/accepted.md`](../vision/features/accepted.md) A2
  — the staging-area entry this ADR graduates.
- [`vision/index.md`](../vision/index.md) — the Sophie-as-LDS
  framing.

### Key cognitive-science citations (full list in `reference/teaching-moves.md`)

- Posner, G. J., Strike, K. A., Hewson, P. W., & Gertzog, W. A.
  (1982). Accommodation of a scientific conception. *Science
  Education*, 66(2), 211–227.
- Chi, M. T. H., De Leeuw, N., Chiu, M.-H., & LaVancher, C. (1994).
  Eliciting self-explanations improves understanding. *Cognitive
  Science*, 18(3), 439–477.
- Sweller, J. (1988). Cognitive load during problem solving.
  *Cognitive Science*, 12(2), 257–285.
- Renkl, A. (2014). Toward an instructionally oriented theory of
  example-based learning. *Cognitive Science*, 38(1), 1–37.
- Ainsworth, S. (2006). DeFT: A conceptual framework for considering
  learning with multiple representations. *Learning and Instruction*,
  16(3), 183–198.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning.
  *Psychological Science*, 17(3), 249–255.
- Vosniadou, S. (1994). Capturing and modeling the process of
  conceptual change. *Learning and Instruction*, 4(1), 45–69.
- White, R. T., & Gunstone, R. F. (1992). *Probing understanding*.
  Falmer Press.
- Kapur, M. (2008). Productive failure. *Cognition and Instruction*,
  26(3), 379–424.
- Schwartz, D. L., & Bransford, J. D. (1998). A time for telling.
  *Cognition and Instruction*, 16(4), 475–522.
- Driver, R., Guesne, E., & Tiberghien, A. (Eds.). (1985).
  *Children's ideas in science*. Open University Press.
- Hestenes, D., Wells, M., & Swackhamer, G. (1992). Force Concept
  Inventory. *The Physics Teacher*, 30(3), 141–158.

Full citations + DOIs in `reference/teaching-moves.md` per-entry.
