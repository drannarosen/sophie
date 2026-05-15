---
title: Intervention Library
short_title: Interventions
description: Sophie's canonical library of 12 named misconception interventions across 4 families (confrontation, bridging, restructuring, reinforcement) with citations, descriptions, and Teaching Move bindings. Also documents the `<Intervention>` component and the `type="custom"` escape hatch.
tags: [pedagogy, reference, interventions, misconceptions, library, lds]
---

# Intervention Library

Sophie's canonical library of **12 named interventions** for
addressing misconceptions, modeled on the
[Teaching Move Library](teaching-moves.md) (ADR 0041). Each
intervention has a literature-grounded canonical name, a practice
gloss, a citation, a description, and a mapping to the Teaching
Moves it implements.

The full rationale lives at
[ADR 0044 — Misconception Graph + Intervention Library](../decisions/0044-misconception-graph-and-intervention-library.md).

## How interventions are used

Chapters pair interventions with misconceptions via the
`<Intervention>` component, typically nested inside a
`<Aside kind="misconception">` block (children-mode source pattern,
parallel to [PR-C4's LearningObjectives refactor](../decisions/0038-pedagogy-index-pattern.md)):

```mdx
<Aside kind="misconception" name="universe-with-a-center">
  Many students model the universe as expanding from a single point...

  <Intervention type="contrasting-cases" addresses="this">
    Predict what you'd observe if the universe had a center, then
    compare to the actual observation: isotropic Hubble flow from
    every vantage point.
  </Intervention>
</Aside>
```

The `type` prop references this library's canonical names. The
audit (invariant **I2**) verifies the reference resolves.

## `<Intervention>` component props

| Prop | Required | Type | Purpose |
|---|---|---|---|
| `type` | required | canonical name \| `"custom"` | Library entry referenced; `"custom"` for course-specific |
| `addresses` | optional | misconception `name` \| `"this"` | Which misconception is addressed; `"this"` = enclosing Aside |
| `name` | required when `type="custom"` | string | Bespoke intervention name |
| `limits` | recommended for `bridging-analogy` | inline markdown | Where the intervention breaks down |
| `id` | optional | string | Anchor id (auto-generated if omitted) |

Child content is the intervention's prose / structure (the
predict-then-reveal sequence, the contrasting cases, the analogy
mapping, etc.).

## Intervention → Move linkage (post-2026-05-14 hardening)

Per [ADR 0041 hardening §1](../decisions/0041-teaching-move-library.md#hardening-additions-2026-05-14),
every canonical intervention in `intervention-index.ts` declares a
**parent move** via the `move: <slug>` field. The parent move is
the primary teaching move the intervention instantiates — the one
whose name pattern the intervention follows. Each intervention may
*also* implement secondary moves (listed below as *Teaching Moves
implemented*), but exactly one is the parent.

```ts
// intervention-index.ts (post-hardening)
export const interventionIndex: Record<string, InterventionEntry> = {
  "contrasting-cases": {
    family: "Confrontation",
    move: "comparison-cases",          // parent move (required)
    secondary_moves: [                  // additional moves invoked
      "productive-cognitive-conflict",
      "misconception-confrontation"
    ],
    citation: "Bransford & Schwartz 1999",
    ...
  },
  // ...
};
```

In this reference doc, each intervention entry's *"Teaching Moves
implemented"* line lists the parent move first, then secondary
moves. The machine-readable shape distinguishes them; the docs
shape sequences them.

**Audit invariant I4 (WARNING, cross-ADR with ADR 0041).** Every
canonical intervention's `move:` field must resolve to a real move
in `move-index.ts`. Custom interventions (`type="custom"`) can
declare `move=` too; if they do, I4 applies. Couples the two
libraries structurally — there's no way to ship an intervention
whose parent move doesn't exist.

**Render: citation-grade caption at use site.** The `<Intervention>`
component renders a small caption below the intervention's body
naming the parent move with citation:

```text
[intervention body]
─────
Intervention: contrasting-cases (instance of move
`comparison-cases`, Bransford & Schwartz 1999)
```

Caption is screen-reader-accessible (rendered as `<figcaption>` or
equivalent semantic element); subtly styled in print and on
screen. Authors don't write the caption — it's auto-rendered from
the intervention's `move:` field + move-index citation lookup.

**Reverse-pointer.** Each move entry's `instantiated_as: [<intervention-slug>]`
is computed at audit-build time from the intervention library's
`move:` declarations. Readers of `move-index.ts` see "this move
has interventions X, Y, Z" without authoring the back-pointer.

## The 4 families

| Family | What it does | When to use |
|---|---|---|
| **Confrontation** | Surface the misconception, force the student to commit, then introduce disconfirming evidence | Concrete misconceptions about observable phenomena |
| **Bridging** | Anchor a correct intuition the student already has and extend it analogically | Misconceptions where students lack any usable mental model |
| **Restructuring** | Replace one conceptual framework with another | Deep-structural misconceptions about category boundaries |
| **Reinforcement** | Re-encounter the misconception in spaced or varied contexts | Already-introduced misconceptions vulnerable to relapse |

## Family 1: Confrontation

### `contrasting-cases`

**Canonical name:** Contrasting cases.
**Also known as:** Comparison cases; side-by-side discrimination.
**Citation:** Bransford, J. D., & Schwartz, D. L. (1999). *Rethinking
transfer.* Review of Research in Education, 24, 61–100.
**Teaching Moves implemented:** *Comparison cases*,
*productive-cognitive-conflict*, *misconception-confrontation*.

Place two cases side-by-side where the misconception predicts the
same outcome for both but the actual outcome differs. The
difference between cases isolates the variable the misconception
ignores.

**Authoring example:**

```mdx
<Intervention type="contrasting-cases" addresses="brightness-is-intrinsic">
  Star A: m = 4 (apparent magnitude). Distance = 10 pc.
  Star B: m = 4 (apparent magnitude). Distance = 100 pc.
  Both *look* equally bright. Are they?
</Intervention>
```

### `predict-then-reveal`

**Canonical name:** Predict-Observe-Explain (POE).
**Also known as:** Predict-then-reveal; spoiler-alerts framing.
**Citation:** White, R. T., & Gunstone, R. F. (1992). *Probing
understanding.* Falmer Press.
**Teaching Moves implemented:** *predict-observe-explain*,
*elicit-prior-model*, *productive-cognitive-conflict*.

Ask the student to commit to a prediction *before* showing the
observation. The act of committing creates productive cognitive
dissonance when the observation diverges.

**Authoring example:**

```mdx
<Intervention type="predict-then-reveal" addresses="redshift-as-ordinary-doppler">
  Predict z for a galaxy receding at v = 0.5c using the classical
  Doppler formula. Write your answer before continuing.

  [Reveal] The correct cosmological z = 0.732, not 0.500. Why?
</Intervention>
```

### `productive-cognitive-conflict`

**Canonical name:** Productive cognitive conflict.
**Also known as:** Productive failure; conceptual conflict.
**Citation:** Vosniadou, S. (1994). Capturing and modeling the
process of conceptual change. *Learning and Instruction*, 4(1),
45–69.
**Teaching Moves implemented:** *productive-cognitive-conflict*,
*productive-failure*.

Set up a problem where the student's existing model gives a clearly
wrong answer, then provide tools to resolve the conflict. Distinct
from `predict-then-reveal` in that the *failure* is the
intervention, not the prediction.

## Family 2: Bridging

### `bridging-analogy`

**Canonical name:** Bridging analogy with declared limits.
**Also known as:** Anchoring analogy; conceptual bridge.
**Citation:** Clement, J. (1993). Using bridging analogies and
anchoring intuitions to deal with students' preconceptions in
physics. *Journal of Research in Science Teaching*, 30(10),
1241–1257.
**Teaching Moves implemented:** *bridging-analogy*,
*multiple-representations-binding*.

Identify a domain where the student already has correct intuition,
then map the structure across to the target concept. **Declare the
analogy's limits explicitly** — where it breaks down.

**Authoring example:**

```mdx
<Intervention type="bridging-analogy" addresses="expansion-vs-motion-in-space">
  Bread baking with raisins: from any raisin's perspective, every
  other raisin recedes — no raisin is "the center."

  <Limits>
    The bread has an outside surface; the universe doesn't. The
    analogy captures relative recession but misses the absence of a
    boundary.
  </Limits>
</Intervention>
```

Audit invariant **I3** flags `bridging-analogy` interventions
without declared `<Limits>` as INFO (Clement 1993 recommends
explicit-limits authoring).

### `anchoring-intuition`

**Canonical name:** Anchoring intuition.
**Citation:** Clement, J. (1993) (same as `bridging-analogy`).
**Teaching Moves implemented:** *elicit-prior-model*,
*bridging-analogy*.

Surface a correct intuition the student already has that *they
don't realize applies*. Distinct from `bridging-analogy` — the
anchor *is* the target conceptual structure, just expressed in
familiar terms. No analogy mapping required.

### `concrete-to-abstract-scaffold`

**Canonical name:** Concrete-fading scaffold.
**Also known as:** Concrete-to-abstract; fading representations.
**Citation:** Goldstone, R. L., & Son, J. Y. (2005). The transfer of
scientific principles using concrete and idealized simulations.
*Journal of the Learning Sciences*, 14(1), 69–110.
**Teaching Moves implemented:** *concrete-fading*,
*worked-example-with-fading*.

Begin with a concrete instance, then progressively abstract toward
the general structure. The intervention is the *sequencing*, not a
single representation.

## Family 3: Restructuring

### `discrepant-event`

**Canonical name:** Discrepant event.
**Citation:** Liem, T. L. (1987). *Invitations to science inquiry.*
**Teaching Moves implemented:** *productive-cognitive-conflict*,
*elicit-prior-model*.

Present a phenomenon that violates the student's predictions in a
*visceral* way (often a demo or video). The visceral violation
creates motivation to restructure, distinct from the cognitive
dissonance of `predict-then-reveal`.

### `conceptual-exchange`

**Canonical name:** Conceptual exchange.
**Citation:** Hewson, P. W., & Hewson, M. G. A. (1984). The role of
conceptual conflict in conceptual change. *Instructional Science*,
13(1), 1–13.
**Teaching Moves implemented:** *misconception-confrontation*,
*productive-cognitive-conflict*.

Make the misconception's status as a *theory among theories*
explicit. Present the alternative framework as an option the
student can adopt rather than a doctrine they must believe.
Distinct from `predict-then-reveal` — the exchange is structural,
not phenomenon-driven.

### `worked-example-contrast`

**Canonical name:** Worked-example contrast.
**Citation:** Renkl, A. (2014). Toward an instructionally oriented
theory of example-based learning. *Cognitive Science*, 38(1), 1–37.
**Teaching Moves implemented:** *worked-example-with-fading*,
*comparison-cases*.

Provide a worked example using the misconception alongside a worked
example using the correct framework, with side-by-side annotation
of the divergence point.

## Family 4: Reinforcement

### `refutation-text`

**Canonical name:** Refutation text.
**Citation:** Tippett, C. D. (2010). Refutation text in science
education. *International Journal of Science and Mathematics
Education*, 8(6), 951–970.
**Teaching Moves implemented:** *misconception-confrontation*,
*self-explanation-prompt*.

Prose that *names the misconception* explicitly, states why it's
wrong, and presents the correct alternative. Distinct from generic
explanatory prose because the misconception is named as a target.

**Authoring example:**

```mdx
<Intervention type="refutation-text" addresses="big-bang-as-explosion-in-space">
  The misconception: "the Big Bang was an explosion at a point in
  space." Why this is wrong: the Big Bang *is* the expansion of
  space itself; there is no pre-existing space for an explosion to
  occur within.
</Intervention>
```

### `spaced-retrieval-with-misconception-probe`

**Canonical name:** Spaced retrieval with misconception probe.
**Citation:** Roediger, H. L., & Karpicke, J. D. (2006).
Test-enhanced learning. *Psychological Science*, 17(3), 249–255.
**Teaching Moves implemented:** *retrieval-practice*,
*concept-inventory-probe*.

Schedule a retrieval-practice prompt at a later module that
*re-surfaces* the misconception as a distractor. Tests whether the
student has actually restructured vs. surface-learned the
distinction.

### `self-explanation-against-misconception`

**Canonical name:** Self-explanation prompt against the misconception.
**Citation:** Chi, M. T. H., De Leeuw, N., Chiu, M.-H., & LaVancher,
C. (1994). Eliciting self-explanations improves understanding.
*Cognitive Science*, 18(3), 439–477.
**Teaching Moves implemented:** *self-explanation-prompt*,
*transfer-prompt*.

Prompt the student to explain *why* the misconception is wrong in
their own words. Distinct from generic self-explanation because the
prompt names the misconception as the target.

## Custom interventions (`type="custom"`)

Some interventions are bespoke to a course and don't earn library
status. Use `type="custom"` with a required `name` field:

```mdx
<Intervention
  type="custom"
  name="spoiler-alerts-framing"
  addresses="universe-with-a-center"
>
  Frame the chapter as a spoiler-warning: "the rest of this lecture
  will challenge your intuitive model of the universe. Before we
  reveal anything, write down what you currently think about [...]"
</Intervention>
```

The audit doesn't validate custom interventions beyond presence.
Courses using many custom interventions may want to file an ADR
proposing one of them for promotion to the library.

## Family-to-move mapping

Cross-reference for chapter authors: which canonical Teaching Move
do these interventions implement?

| Move | Interventions implementing it |
|---|---|
| *misconception-confrontation* | `predict-then-reveal`, `productive-cognitive-conflict`, `conceptual-exchange`, `refutation-text`, `self-explanation-against-misconception` |
| *productive-cognitive-conflict* | `contrasting-cases`, `predict-then-reveal`, `productive-cognitive-conflict`, `discrepant-event`, `conceptual-exchange` |
| *bridging-analogy* | `bridging-analogy`, `anchoring-intuition` |
| *comparison-cases* | `contrasting-cases`, `worked-example-contrast` |
| *concrete-fading* | `concrete-to-abstract-scaffold` |
| *retrieval-practice* | `spaced-retrieval-with-misconception-probe` |
| *self-explanation-prompt* | `refutation-text`, `self-explanation-against-misconception` |

## Choosing the right intervention

Heuristics (not rules):

- **Concrete phenomenon, student has predictions** → start with
  `predict-then-reveal` or `discrepant-event`.
- **Student has no mental model at all** → `bridging-analogy` or
  `anchoring-intuition`.
- **Misconception is structural / categorical** →
  `conceptual-exchange` or `worked-example-contrast`.
- **Already-addressed misconception, vulnerable to relapse** →
  `spaced-retrieval-with-misconception-probe` or `refutation-text`.
- **Need explicit naming** → `refutation-text`.
- **Multiple representations are at stake** → pair with `<MultiRep>`
  (per [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md))
  and use `bridging-analogy` for the conceptual binding.

Pair multiple interventions per misconception when the
misconception is load-bearing. Often the most robust treatment is
*confrontation* (force the conflict) → *bridging* or *restructuring*
(provide the alternative) → *reinforcement* (lock it in later).

## Updating the library

Revisions to the library follow the ADR-revisions pattern (per
[ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md#revisions)):

1. New interventions earning entries: appended with a citation +
   move mapping.
2. Renamed or refined entries: documented in the ADR's `## Revisions
   §N` section.
3. Promotions from `type="custom"`: file an ADR amendment proposing
   the new canonical entry with evidence of cross-course reuse.

## Connections to other Sophie machinery

### Teaching Move Library (ADR 0041)

Every canonical intervention declares which Teaching Moves it
implements. The reverse mapping (which interventions realize a
move) renders in `move-index.ts` (future, per
[ADR 0041 Consequences](../decisions/0041-teaching-move-library.md#consequences)).

### Pedagogy Contract (ADR 0042)

The Pedagogy Contract may include a `misconception_policy` section
declaring stricter authoring requirements:

```yaml
misconception_policy:
  every_module_addresses_misconceptions: true
  bridging_analogies_declare_limits: true
  intervention_library_canonical_only: false   # allow custom
```

### Notation Registry + MultiRep (ADR 0043)

`bridging-analogy` interventions often pair with `<MultiRep>`
bindings — the analogy is one representation; the equation /
figure / code are others. The Notation Registry's `concept_refs`
field on a misconception links the misconception graph to the
notation graph.

### TDRs (ADR 0040)

A TDR may justify the choice of intervention for a specific
misconception. Example: a TDR cites the choice of
`predict-then-reveal` over `refutation-text` for the
`universe-with-a-center` misconception because empirical evidence
in ASTR 201 Fall 2025 showed POE produced longer retention.

## Reader-facing rendering

The `<Intervention>` component's reader UI is TBD in the follow-up
code PR per [ADR 0044 Consequences](../decisions/0044-misconception-graph-and-intervention-library.md#consequences).
Design intent:

- Visual containment within / adjacent to the misconception Aside
  (paired pedagogical unit).
- `<Limits>` rendered as a sub-block beneath the analogy body.
- An "intervention type" badge (canonical name + family) helps
  readers recognize the pattern.

The `/about-this-course/misconception-graph/` page additionally
shows the intervention-to-misconception pairing as a separate
metadata layer of the graph.
