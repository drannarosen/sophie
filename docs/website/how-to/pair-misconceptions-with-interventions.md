---
title: Pair misconceptions with interventions
short_title: Pair interventions
description: Chapter-author recipe for nesting `<Intervention>` blocks inside misconception Asides (and authoring standalone interventions).
tags: [components, intervention, misconceptions, pedagogy, authoring]
---

# Pair misconceptions with interventions

A misconception is a known wrong model students bring. An intervention
is the cognitive-science-grounded remediation that helps them
restructure it. Sophie makes the pairing *structural*: `<Intervention>`
blocks nest inside misconception Asides (or stand alone with an
explicit `addresses` reference), and the build-time audit verifies the
pairing.

:::{important} Status: in-progress
The `<Intervention>` component is in active implementation per the
[2026-05-17 design hardening](../../plans/2026-05-17-intervention-design.md).
The `MisconceptionEntrySchema` graph fields
(`prerequisite_misconceptions`, `related_misconceptions`, `concept_refs`,
`discipline_scope`) and MG1 + MG2 audit invariants already ship.
:::

## When to pair an intervention

Pair an `<Intervention>` with a misconception when:

- The chapter declares a misconception that students typically arrive
  with (e.g., "the universe expands from a center point").
- The chapter has *more than just stating* the misconception — there's
  a remediation move (an analogy, a contrasting case, a worked
  example) that helps restructure the wrong model.
- You can attribute the move to a literature-grounded intervention
  type (or honestly authoring a course-specific custom intervention).

Skip the `<Intervention>` block when:

- The chapter only flags the misconception without addressing it
  (rare; usually flag + address is the whole point).
- The misconception is mentioned in passing without space for
  remediation in the chapter.

## The 12 canonical interventions (intervention-index.ts)

Sophie ships 12 named interventions across 4 families. Pick the one
that matches the move you're authoring:

**Confrontation** — cognitive dissonance → accommodation:

- `contrasting-cases` — two cases differ only on the key dimension
- `predict-then-reveal` — predict before observation; dissonance
  engages
- `productive-cognitive-conflict` — explicit stage of discrepancy

**Bridging** — scaffold from existing intuition:

- `bridging-analogy` — intuitive analogy mapping target; *declare limits*
- `anchoring-intuition` — identify correct existing intuition; build on it
- `concrete-to-abstract-scaffold` — enactive → iconic → symbolic

**Restructuring** — ontological shift:

- `discrepant-event` — demonstration violating expectations
- `conceptual-exchange` — walk through abandoning one category for another
- `worked-example-contrast` — worked example where misconception fails

**Reinforcement** — consolidate the correct conception:

- `refutation-text` — state misconception, refute, explain why tempting
- `spaced-retrieval-with-misconception-probe` — quiz at spaced intervals
- `self-explanation-against-misconception` — student explains correct + why misconception was tempting

Custom interventions are also valid: use `type="custom"` + `name="..."`
when a course-specific move doesn't fit the canonical 12.

## Source pattern (nested inside misconception Aside)

```mdx
<Aside
  kind="misconception"
  name="universe-with-a-center"
  short="The universe has a center point from which it expanded"
  related_misconceptions={["redshift-as-ordinary-doppler"]}
  concept_refs={["redshift", "hubble-parameter"]}
>
  Many students model the universe as expanding from a single center
  point — like a firework or explosion happening in a pre-existing
  space. The geometry of cosmic expansion is fundamentally different:
  every point is equivalent; there is no center.

  <Intervention type="contrasting-cases" addresses="this">
    Predict what you'd observe if the universe had a center, then
    compare to the actual observation: isotropic Hubble flow from
    every vantage point.
  </Intervention>

  <Intervention type="bridging-analogy" addresses="this" limits="Bread has an outside; the universe doesn't.">
    Bread baking with raisins: from any raisin's perspective, every
    other raisin recedes — no raisin is "the center."
  </Intervention>
</Aside>
```

`addresses="this"` says "this intervention pairs with the enclosing
misconception Aside" — the extractor resolves the reference at build
time.

## Standalone interventions (outside Aside)

For course-level interventions that span multiple chapters, or when
the intervention is declared at chapter start, author standalone:

```mdx
<Intervention
  type="refutation-text"
  addresses="universe-with-a-center"
>
  Despite the everyday intuition that any expansion needs a center
  point, the universe's expansion is fundamentally different…
</Intervention>
```

The standalone form renders with a leading "↗ Addresses:" header
showing which misconception it pairs with — the reader gets the
pairing context that nesting normally provides.

## Custom interventions

When the move you're authoring doesn't fit the canonical 12:

```mdx
<Intervention type="custom" name="scale-comparison" addresses="this">
  Compare the scale of a typical galaxy (10²¹ m) to the average
  inter-galaxy distance (10²³ m). The factor of 100 makes most
  galaxies "points" from a galactic-cluster perspective.
</Intervention>
```

`type="custom"` requires the `name` prop. The render drops the
citation chip (no library entry to cite) and adds a small "custom"
annotation chip.

## Authoring depth

The `depth` prop signals quality:

- `depth="light"` (default) — quick mention, one paragraph or less
- `depth="substantial"` — worked example or practice opportunity + reflection prompt

```mdx
<Intervention type="worked-example-contrast" addresses="this" depth="substantial">
  ... worked example body, multi-paragraph ...
</Intervention>
```

The MG4 audit summary surfaces course-wide depth statistics
("7 / 10 misconceptions have ≥1 substantial intervention") so
instructors see coverage depth at a glance.

## Bridging analogies: declare limits

If you use `type="bridging-analogy"`, Clement 1993 recommends
*explicitly stating the analogy's limits* — students over-extend
analogies when limits aren't declared. The `limits` prop surfaces
this:

```mdx
<Intervention
  type="bridging-analogy"
  addresses="this"
  limits="The expanding balloon has an inside and outside; the
          universe doesn't."
>
  Imagine the universe as the 2D surface of an expanding balloon…
</Intervention>
```

The renderer renders `limits` as a final labeled sub-section
("Limits: …") in italicized text. The I3 INFO audit invariant nudges
bridging-analogy interventions that don't declare limits.

## What the audit checks

When you author misconceptions + interventions, these audit invariants
fire at build time:

| ID | Severity | Check |
|---|---|---|
| MG1 | ERROR   | `prerequisite_misconceptions` form a DAG (no cycles) |
| MG2 | ERROR   | `prerequisite_misconceptions` resolve in earlier chapters |
| MG3 | WARNING | Misconception declared but no `<Intervention>` paired with it |
| MG4 | INFO    | Course-wide depth-coverage summary |
| I1  | WARNING | `<Intervention addresses="…">` resolves to a known misconception |
| I2  | ERROR   | `<Intervention type="…">` is a canonical name or `"custom"` |
| I3  | INFO    | `<Intervention type="bridging-analogy">` declares `limits` |

(I4 — `move:` field on intervention-index entries resolves to a real
move in `move-index.ts` — is deferred until ADR 0041 ships
`move-index.ts`.)

## Authoring tips

- **Pair, don't just flag.** A misconception Aside without an
  `<Intervention>` is incomplete pedagogically — MG3 WARNING flags
  this. Flag misconceptions you have remediation for.
- **Pick from the canonical 12 when possible.** Custom interventions
  are valid but lose citation credibility and cross-course reuse.
- **Declare bridging-analogy limits explicitly.** I3 INFO surfaces the
  Clement 1993 nudge; analogies without declared limits actively harm
  conceptual restructuring.
- **Cite the literature.** The canonical 12 ship with citations that
  render as clickable chips. Custom interventions don't get citation
  chips — that's by design.
- **Multiple interventions per misconception is fine.** Different
  intervention types address different student profiles. Two or three
  paired interventions per misconception is a coverage signal MG4
  rewards.

## Common pitfalls

- **`addresses="this"` outside an Aside.** I1 WARNING fires when
  `"this"` is used without an enclosing misconception parent. Use
  `addresses="<misc-slug>"` for standalone.
- **`type="custom"` without `name`.** I2 ERROR fires; the custom
  intervention needs a name slug to be referenceable.
- **Misspelled canonical type.** I2 ERROR fires if `type=` isn't in
  `intervention-index.ts` and isn't `"custom"`. Use autocomplete or
  cross-reference the [intervention library](../reference/intervention-library.md).

## See also

- [Intervention library reference](../reference/intervention-library.md) — full 12 canonical entries with citations
- [Misconception graph schema](../reference/misconception-graph-schema.md) — graph fields on misconception Asides
- [ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md) — design rationale
- [ADR 0041](../decisions/0041-teaching-move-library.md) — Teaching Move Library (future I4 audit binding)
- [2026-05-17 Intervention design hardening](../../plans/2026-05-17-intervention-design.md) — v1 implementation plan
