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

1. `packages/components/src/pedagogy/move-index.ts` — the
   component → moves map, populated for every component in
   `@sophie/components`.
2. `packages/core/src/schema/pedagogy.ts` — the `TeachingMove` type
   (string-literal union matching the 18 move IDs).
3. Storybook integration — each component's story reads from the
   map and renders a "Implements moves: …" panel.
4. Audit invariant `MOVE1` (Sophie-platform-audit, not consumer-
   repo-audit) — every component must declare at least one move OR
   explicitly declare itself non-pedagogical (e.g., layout
   primitives like `<Spacer>`, `<TwoColumn>`).

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

*None yet.* Revisions to the taxonomy follow the pattern established
by [ADR 0038 §1, §2](./0038-pedagogy-index-pattern.md) and PR-C3
followups: a new `## Revisions §N` section appended to this ADR
documenting the change + reason.

## References

- [`reference/teaching-moves.md`](../reference/teaching-moves.md) —
  the 18-move library with full entries (citations, descriptions,
  Sophie-component mappings).
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDR Rationale sections cite teaching moves by canonical name.
- [ADR 0030 — audience and AI author model](./0030-audience-and-ai-author-model.md)
  — AI authoring grounds in this taxonomy.
- [ADR 0038 — pedagogy index pattern](./0038-pedagogy-index-pattern.md)
  — the centralized-metadata-map precedent.
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
