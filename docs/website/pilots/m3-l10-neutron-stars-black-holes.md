---
title: 'Pilot report: ASTR 201 Module 3 Lecture 10 — The Final States'
short_title: 'Pilot: M3-L10 Neutron Stars & Black Holes'
description: 'Production migration of ASTR 201 Lecture 3-10 (Neutron Stars and Black Holes) into the astr201 consumer repo — the Module 3 finale and largest source (1494 lines). 1 new equation entity (tov-limit) plus reused schwarzschild-radius, 13 canonical compact-object glossary terms (incl. Event horizon + Schwarzschild radius takeovers from foundations), 3 OMIFlow from unmarked O/M/I callouts, 2 video link Callouts, 6 Misconception Interventions, and the first practice.mdx of the series (9 problems).'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 10 — "The Final States: Neutron
Stars and Black Holes"** from Quarto `.qmd` into the **astr201 consumer repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-10-neutron-stars-black-holes/`.
It lands at **order 10** and **completes Module 3** (L1–L10 now fully migrated). Source
`astr201-sp26/` was read-only. At **1494 lines** this is the largest source in the
module. It ships a **Practice Problems section** (→ the first `practice.mdx` of the
series) and a **prose glossary of 14 terms**.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 10 figures, all new (assets copied, id != filename). |
| `{{< video URL >}}` ×2 (in "Watch:" callouts) | `<Callout>` with a labeled link | ✅ decided | Both ScienceClic videos → link Callouts (the standing iframe→link remap). Renders 0 iframes + 2 descriptive YouTube links — no axe `frame-title`/CSP issue. |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | 2 includes → **1 new** (`tov-limit`) + **1 reused** (`schwarzschild-radius`). |
| `### Worked Example:` ×2 | `<WorkedExample>` | ✅ direct | Sun's Schwarzschild radius; Sgr A*. Each unit reduction → `.DimCheck`. Other boxed calcs (density, spin-up, pulse size) stay inline. |
| `:::{.callout-note}` "Observable → Model → Inference" ×3 | `<OMIFlow>` | ✅ remap (Anna's call) | Compact-object reasoning, Pulsars, GW150914 — clean strict-3 arcs authored as plain callout-notes (NOT `.omi`-marked), mapped to OMIFlow. The opening "Big Question" O/M/I stays a `key-insight` Callout (meta-framing). |
| `:::{.callout-warning}` "Misconception Check" ×6 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | Distinct titles → distinct `addresses` slugs. |
| `:::{.callout-important}` Big Idea / Big Question | `<Callout variant="key-insight">` | ✅ direct | Final "Gravity Scoreboard — Final" is **prose** here (no ASCII fence) → `key-insight`. |
| `:::{.callout-note}` assumptions / anchors / scalings | `<Callout variant="info">` | ✅ direct | |
| `:::{.callout-note collapse}` Enrichment | `<Callout variant="the-more-you-know">` | ✅ direct | Gravitational redshift. |
| `:::{.callout-tip}` + collapse Solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | Think-First / Check-Yourself boxes. |
| `## Practice Problems` (9, with ⭐) | `practice.mdx` sibling | ✅ split | First practice artifact of the series; source ⭐ ratings preserved; problem-classification HTML comments dropped (internal metadata). |
| `## Glossary` (14 prose definitions) | `<GlossaryTerm>` + `<Aside>` + `<ChapterGlossary>` | ✅ glossary exception | The source's explicit 14-term glossary migrated 1:1. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **3 `<OMIFlow>`** — the chapter's three clean
Observable/Model/Inference callout-notes (compact-object reasoning, pulsars, GW150914),
each strict-3. They were not `.omi`-tagged in source, but they encode exactly the
strict-3 arc the component is for, so the remap is faithful (Anna confirmed at the gate).

### Glossary canonical (ADR 0086)

The compact-objects finale, so it **takes 13 terms canonical**: Accretion, Black hole,
Compactness, Dense nuclear matter, Event horizon, Gravitational redshift, Lighthouse
model, Millisecond pulsar, Neutron degeneracy pressure, Neutron star, Pulsar,
Schwarzschild radius, TOV limit. Two are **takeovers** from M1-L2 foundations (Event
horizon, Schwarzschild radius — both non-canonical there; L10 is their physics home).
**Equation of state** is re-defined locally non-canonical (L5 owns it canonical), so the
source's 14-term glossary is migrated complete (13 canonical + 1 non-canonical).

### Equation registry

One new entity, `tov-limit` ($M_\text{TOV} \sim 2\text{–}3\,M_\odot$), `see-also`
`chandrasekhar-mass` (the white-dwarf analog) and `schwarzschild-radius` (above the TOV
limit → black hole). `schwarzschild-radius` is reused by `refId`. The Schwarzschild
radius is also re-derived inline from the Newtonian escape-speed argument.

## Pedagogical decisions log

- **1 new entity (tov-limit); reuse schwarzschild-radius** — confirmed.
- **13 canonical glossary terms incl. 2 foundations takeovers** — confirmed at the gate
  (Anna chose the 13-canonical scope); EOS non-canonical local def keeps the source glossary complete.
- **3 OMIFlow from unmarked O/M/I callouts** — confirmed at the gate.
- **2 WorkedExamples; 6 Misconception → Intervention; 2 video link Callouts** — as recommended.
- **practice.mdx** — first of the series; 9 problems, ⭐ ratings preserved.
- **Prose final scoreboard** — this chapter's "Gravity Scoreboard — Final" is prose, not an
  ASCII code-fence box, so it maps to a `key-insight` Callout (no fenced motif).

## Surprises

**1. Equation-entity `<Assumption type>` slugs must be lowercase kebab-case.** The
`tov-limit` entity failed the build with `[ERROR R3] … failed schema validation` because
its assumption `type="dense-matter-and-GR"` contained uppercase letters (regex
`/^[a-z0-9]+(-[a-z0-9]+)*$/`). Fixed to `dense-matter-and-relativity`. The audit's detailed
`[ERROR R3]` line prints in the audit block near the *front* of the build output, while the
generic "Pedagogy audit found errors" throw appears at the very end — look for the
`Pedagogy audit: N errors, …` summary (appended to the first page-build line) and scroll up.

**2. The comment-scanner trap, again.** The practice.mdx migration comment originally said
`Raw "<" in the pulse-size bound …`, which failed the MDX parse on the raw `<` inside a
`{/* */}` comment (the same trap as M3-L8). Spelling it "less-than sign" fixed it — and the
pulse-size bound itself was rephrased from `R < cP/(2π)` to `R_max = cP/(2π)` to avoid the
raw `<` in body math.

**3. First practice.mdx with a real GR/observational problem set.** Nine problems
(3 conceptual / 3 calculation / 3 synthesis) split cleanly into the sibling artifact; it
builds with the expected #189 authored-but-unrouted warning.

## Platform issues to file

1. **Gap: `<Video>`** — encountered again (2 videos); resolved per the standing call as link
   Callouts. A real `<Video>` component remains the long-run fix.
2. **Tracked residual #198** — no occurrence: all tables use inline-math cells, so desktop
   axe is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (Big Question, Parts 1–6, Reference Tables, Glossary,
  Summary, prose final scoreboard, the three O→M→I arcs). Practice Problems → `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 10), 10 new `figures.ts` entries + assets, 1 new
  equation entity (reusing `schwarzschild-radius`).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0 errors (Pedagogy audit: 0 errors,
  1 pre-existing warning, 68 infos); practice-unrouted warning expected.
- ✅ Rendered-page gate: console = favicon 404 only; 10 figures, 0 broken; 228 KaTeX; 2 KeyEquation
  cards; OMIFlow 3/3/3; 2 WorkedExample numerical + 2 DimCheck; 6 Interventions; 14 glossary
  defs (count verified = planned); 0 iframes + 2 YouTube links; no leaked MDX; the section
  sidebar reads L1→…→L10; axe **0 violations desktop, light (5/5) + dark (3/3)**.
- ✅ ADR 0086: 13 compact-object terms canonical here (incl. 2 foundations takeovers, no collision).
- ✅ **Module 3 complete (L1–L10).** Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
