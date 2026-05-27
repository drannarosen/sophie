---
title: 'Pilot report: ASTR 201 Module 3 Lecture 5 — The Stellar Blueprint'
short_title: 'Pilot: M3-L5 Structure Scalings'
description: 'Production migration of ASTR 201 Lecture 3-5 (Structure Equations & Main-Sequence Scalings) into the astr201 consumer repo. The largest source migrated to date (1279 lines) and the first derivation-dense reading with zero equation includes. Adds 1 new equation entity (the theoretical L ~ M^3/kappa), reuses 3 existing scaling entities, takes 6 structure-equations glossary terms canonical (ADR 0086), maps 4 Misconception Check boxes to Interventions, and has no worked examples and no Practice Problems section.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 5 — "The Stellar Blueprint:
Structure Equations and Main-Sequence Scalings"** from Quarto `.qmd` into the
**astr201 consumer repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-05-stellar-structure-scalings/`.
It lands at **order 5** (after L1 Ages & Lifetimes, L2 Hydrostatic Equilibrium,
L3 Nuclear Fusion, L4 Radiation Transport). Source `astr201-sp26/` was read-only.
Scope: full reading (guiding question + Concept Throughline + Parts 1–6 +
Reference Tables + Summary). At **1279 lines** this is the largest source migrated
so far, and the **first derivation-dense reading with zero equation `{{< include >}}`s**
— it derives the main-sequence scaling ladder inline. **No `practice.mdx`** (the
source has no Practice Problems section; it ends at "Looking Ahead") and **no
worked examples** (it is a pure derivation/scaling reading).

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 5 figures, all new (registry + assets): coupling ring, scaling ladder, toy-vs-empirical M–L, convection-stability cartoon, structure-zones. |
| inline derivation steps (no `{{< include >}}`) | `<KeyEquation refId="X">` (selective) + inline `$$` | ✅ deliberate call | No source includes. 3 **reused** entities (`central-pressure-scaling`, `core-temperature-scaling`, `nuclear-timescale`) + **1 new** (`luminosity-mass-scaling`). Intermediate rungs (ρ~M/R³, R~M^{3/7}) and the four structure ODEs stay inline display math. |
| `### Unit check:` / `:::callout-note` "Unit check" | `<Callout variant="info">` | ✅ remap | Two dimensional verifications. **Not** `<WorkedExample>` — there are no numerical worked examples in this reading. |
| `:::{.callout-warning}` "Misconception Check" ×4 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | (plug-into-formulas; one-average-T; die-young-from-fuel; convection-from-heat) — distinct titles so the `addresses` slugs don't collide. |
| `:::{.callout-important}` Big Idea / Direction / What-it-says / Closing / Final Takeaway | `<Callout variant="key-insight">` | ✅ direct | The load-bearing insights. |
| `:::{.callout-note}` Note-on-math / Reading-Map / Four-ODEs / Scaling≠equality / What-this-assumes | `<Callout variant="info"` or `"deep-dive">` | ✅ direct | Four-ODEs closure box → `deep-dive`. |
| `:::{.callout-note}` "Enrichment: Convective cores" | `<Callout variant="the-more-you-know">` | ✅ direct | |
| `:::{.callout-tip}` + `:::callout-note` Solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | 4 Check-Yourself boxes carry Solutions → Dropdowns; the 3 Think-First/Predict boxes (no solution) stay plain tip Callouts. |
| explicit "Observable → Model → Inference" section (Part 6) | `<OMIFlow>` | ✅ direct | 1 clean strict-3 arc. |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 6 canonical definitions. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **1 `<OMIFlow>`**: `omi-main-sequence` (narrow
HR band + steep M–L → structure equations + closure relations → mass-controlled
structural sequence). Clean strict-3. Part 4's "How to Read the Next Derivation"
box also names Observable/Model/Inference, but it is reading *guidance* (meta-scaffold),
so it stays a `key-insight` Callout rather than a second OMIFlow.

### Glossary canonical (ADR 0086)

This is the structure-equations home chapter, so it **takes 6 terms canonical**:
Stellar structure equations, Equation of state, Schwarzschild criterion, Convective
instability, Adiabatic gradient, Radiative gradient — all new (verified pre-merge
that none were already canonical). Terms owned elsewhere are referenced as plain
prose: opacity, convection, radiative diffusion (M3-L4); hydrostatic equilibrium,
mean molecular weight, ideal gas (M3-L2); main sequence, HR diagram (M2-L5); nuclear
timescale (M3-L1); pp-chain/CNO (M3-L3).

### Equation registry

One new entity, `luminosity-mass-scaling` ($L \propto M^3/\kappa$), the chapter's
central inference. Its `related` links encode the causal ladder: it `derives-from`
`central-pressure-scaling`, `core-temperature-scaling`, and `radiative-diffusion-luminosity`,
and is `see-also` the empirical `mass-luminosity` ($L \propto M^{3.5}$) entity — so a
student clicking the theoretical card can walk back up the structure ladder and across
to the empirical relation. The two pressure/temperature rungs and the lifetime relation
are reused (not re-authored) via `refId`.

## Pedagogical decisions log

- **1 new entity for the theoretical L∝M³/κ, distinct from empirical M^3.5** — confirmed
  at the gate. The toy transport-limited result and the empirical fit are different
  objects with different biographies.
- **Reuse central-pressure / core-temperature / nuclear-timescale; keep ρ~M/R³ and
  R~M^{3/7} inline** — confirmed at the gate (no includes → deliberate per-rung call).
- **6 structure-equations terms canonical here** — confirmed at the gate (the home chapter).
- **4 Misconception Check → misconception + Intervention** — distinct slugs.
- **No `<WorkedExample>`** — the source has no worked examples; the two "Unit check"
  blocks are dimensional verifications → `info` Callouts.
- **No `practice.mdx`** — migrate-truthfully: no Practice Problems section in source.
- **No Gravity Scoreboard** — the source has no scoreboard motif (only L4 does, and L4's
  scoreboard "Next" line points forward to this reading). None was invented.

## Surprises

**1. First include-free, derivation-dense reading.** Every prior migration had at least
one `{{< include >}}` + `{{< eqrefcard >}}` pair to map directly to a `<KeyEquation>`.
M3-L5 derives the scaling ladder inline, so the equation-entity decision became a
deliberate per-rung judgment (reuse vs new vs inline) rather than a mechanical 1:1 map.

**2. The wide-table axe failure was *vertical*, not horizontal.** The reference tables
initially tripped `scrollable-region-focusable` at desktop in both themes. Root cause:
Sophie's global `table { overflow-y: auto }` plus stacked `\frac` cells producing
**fractional row heights** (e.g. `162.234px` → `scrollHeight 164 > clientHeight 162`,
a 1–2px sub-pixel vertical overflow). Switching the *summary* tables to slash-form math
(`dM/dr = 4πr²ρ`, `ρ ~ M/R³`) gives integer-aligned row heights and clears it — the
full stacked forms remain in the body display math. This is the mechanism behind the
memory note "compact inline tables avoid #198"; it is specifically a vertical-overflow
effect of fraction row heights, not table width.

**3. Prompt-vs-source drift, resolved by migrate-truthfully.** The migration prompt
named figure `eddington-vs-main-sequence-luminosity` and a "Gravity Scoreboard — Reading 5"
motif; neither is in the actual source (the source uses `stellar-structure-zones` and has
no scoreboard). Followed the source, not the prompt's assumptions.

## Platform issues to file

1. **Gap: `<Video>`** — not needed by this chapter.
2. **Tracked residual #198** — addressed in-chapter for desktop by slash-form summary
   tables; desktop axe (the acceptance gate) is clean in light + dark. The underlying
   `table { overflow-y: auto }` global remains the platform-side root cause.

## Success criteria

- ✅ Full reading migrated truthfully (guiding question, Concept Throughline, Parts 1–6,
  Reference Tables, Summary, the Part-6 O→M→I arc). No worked examples and no practice
  problems in source → none invented.
- ✅ Registries scaffolded: unit JSON (order 5), 5 new `figures.ts` entries + assets,
  1 new equation entity (`luminosity-mass-scaling`), reusing 3 existing scaling entities.
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 5 figures, 0 broken; 243 KaTeX;
  OMIFlow 1/1/1; 4 KeyEquation cards (4 Observable + 4 Assumption biography slots);
  4 interventions; 6 canonical glossary defs; no leaked MDX; the section sidebar reads
  L1→L2→L3→L4→L5; axe **0 violations desktop, light + dark** (6/6 light, 4/4 dark runs).
- ✅ ADR 0086: 6 structure-equations terms canonical here (no collision).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
