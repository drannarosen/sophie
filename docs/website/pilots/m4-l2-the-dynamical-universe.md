---
title: 'Pilot report: ASTR 201 Module 4 Lecture 2 — The Dynamical Universe'
short_title: 'Pilot: M4-L2 The Dynamical Universe'
description: 'Production migration of ASTR 201 Lecture 4-2 (The Dynamical Universe) into the astr201 consumer repo — the figure-heaviest reading in the course (21 figures, all new). One new equation entity (enclosed-mass-circular-speed), 12 canonical glossary terms including a dark-matter canonical takeover from M4-L1, one WorkedExample, two Misconception Interventions, the locked .quiz remap, and a 9-problem practice.mdx.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 4 Lecture 2 — "The Dynamical Universe"**
from Quarto `.qmd` into the **astr201 consumer repo** at
`src/content/sections/galaxies-cosmology/units/lecture-02-the-dynamical-universe/`.
It lands at **order 2** in the galaxies-cosmology section. Source `astr201-sp26/`
was read-only. At **615 lines and 21 figures** this is the **figure-heaviest reading
in the course**. It ships a source-labeled Worked Example, a Practice Problems
section (→ `practice.mdx`), and a 12-term prose glossary.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` ×21 | `<Figure name="ID">` | ✅ direct | 21 figures, **all new** (assets copied, id != filename). No collisions with the shared Module 1–2 art — these are all galaxy-dynamics/cosmology specific. |
| `{{< include …/enclosed-mass-circular-speed.qmd >}}` + `{{< eqrefcard >}}` | `<KeyEquation refId="enclosed-mass-circular-speed">` | ✅ **1 new entity** | $M(\lt r) = rv^2/G$ — authored fresh with full biography (Observable / two Assumptions / DerivationStep / BreaksWhen / CommonMisuse). Anna's call at the gate. |
| `### Worked Example: Weighing a Galaxy` | `<WorkedExample>` | ✅ direct | Problem (givens) / two Steps / DimCheck (the unit reduction) / Result (the boxed $2.2\times10^{11}\,M_\odot$ + the "dynamical mass, not stellar mass" interpretation). |
| `:::{.quiz}` single-best-answer MCQ | `<Callout variant="tip">` + ballot-box bullets + `<Dropdown label="Answer">` | ✅ locked | The mapping locked in M4-L1 applied unchanged. |
| `:::{.callout-note title="Quick Check N"}` + collapse `Answer` ×6 | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | |
| `:::{.callout-warning}` "Misconception Check" ×2 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | "Flat speed is not flat mass" and "The Bullet Cluster is not just a dramatic picture." (The profile said 3; the source has 2.) |
| `:::{.callout-tip title="Evidence Chain"}` | `<Callout variant="key-insight">` | ✅ remap | **Multi-observable** O/M/I (galaxies + X-ray gas + lensing) — fails the OMIFlow strict-3 invariant, so a key-insight Callout, not an OMIFlow. |
| `:::{.callout-important}` assumptions / takeaways | `<Callout variant="info">` / `variant="key-insight">` | ✅ direct | |
| `:::{.callout-note collapse}` Enrichment (Track B) | `<Callout variant="the-more-you-know">` | ✅ direct | |
| `## Practice Problems` (9, with ⭐) | `practice.mdx` sibling | ✅ split | Source ⭐ ratings preserved. |
| `## Glossary` (12 prose definitions) | `<GlossaryTerm>` + `<Aside>` + `<ChapterGlossary>` | ✅ glossary exception | 12 terms migrated 1:1. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **Zero `<OMIFlow>`** — the only Observable/
Model/Inference box ("Evidence Chain") is multi-observable, failing strict-3, so it is
a `key-insight` Callout. The observe→model→infer method runs through the prose.

### Glossary canonical (ADR 0086) — and a dark-matter takeover

**12 terms canonical here**: Active galactic nucleus, Bullet Cluster, Cosmic web,
**Dark matter**, Enclosed mass, Flat rotation curve, Galaxy cluster, Gravitational
lensing, Large-scale structure, Local Group, Rotation curve, Supermassive black hole.
Eleven are new with no collisions. The twelfth, **Dark matter, is a takeover from
M4-L1**: L1 (Galaxies as Ecosystems) defined it canonical provisionally, but L2 is its
physics home (rotation curves, the Bullet Cluster, lensing, structure growth), so at
the gate **Anna moved the canonical home to L2**. The same change dropped the
`canonical` flag on L1's dark-matter `<Aside>` (which stays as a non-canonical local
definition), keeping the build's one-canonical-per-slug guard satisfied. This is the
routine "canonical takeover when migrating a term's true home out of order" pattern.

### Equation registry

**One new entity**, `enclosed-mass-circular-speed` ($M(\lt r) = rv^2/G$), the spine of
the reading — it weighs the Galactic-center black hole (S-stars), reads rotation
curves, and powers the Worked Example and the practice set. `see-also`
`orbital-velocity`, `kepler-third-law`, `virial-theorem`.

## Pedagogical decisions log

- **1 new equation entity (enclosed-mass-circular-speed)** — confirmed at the gate.
- **Dark-matter canonical moved L1 → L2** — confirmed at the gate; L1's Aside dropped to non-canonical in the same change.
- **Non-OMI; multi-observable Evidence Chain → key-insight Callout** — confirmed.
- **1 WorkedExample** ("Weighing a Galaxy") — mandatory for a source-labeled worked example (ADR 0064 §3).
- **2 Misconception → Intervention; .quiz → tip + Dropdown (locked); 9-problem practice.mdx.**

## Time spent per phase

| Phase | Rough time |
|---|---|
| Read-first + inventory (21 figures, include, glossary collisions) | ~25% |
| Gate decisions (equation entity, dark-matter takeover) | ~5% |
| Scaffold (entity, 21 assets, figures.ts, unit JSON, conversion) | ~40% |
| Verify (biome / astro check / build / Playwright render + axe) | ~25% |
| Report + TOC | ~5% |

## Surprises

**1. The `M(<r)` notation is a raw-`<` hazard — fixed with `\lt`.** `<r` is a `<`
before a *letter*, which the author-trap lint (raw-`<`-before-non-letter) does not
flag, but MDX/acorn can still misread `<r` as a JSX tag open. Writing the enclosed-mass
notation with KaTeX's `\lt` macro (`M(\lt r)`) in all body math and in the entity's
`tex`/`symbols` renders the identical `<` glyph with no raw `<` anywhere. The render
probe confirmed `\lt` rendered to `<` (no leaked macro).

**2. A silently-missing glossary Aside, caught only by the rendered count.** The first
build passed clean (0 errors, no D4/D5) with the "Enclosed mass" term simply absent —
because neither the `<GlossaryTerm>` nor its `<Aside>` existed, there was no D4/D5
pairing violation to fire. The Playwright canonical-definition count (11, planned 12)
caught it; adding the term restored 12. This is exactly the memory-pt-14 trap the
rendered count exists to catch.

**3. The "MOD 3" breadcrumb is correct.** Carried from M4-L1: the breadcrumb shows the
0-indexed `section.order` (foundations renders "MOD 0"), so galaxies-cosmology = "MOD 3".

## Platform issues to file

1. **No new gaps.** The `.quiz` remap (tip + Dropdown) and the video-link remap (none in
   L2) remain the only non-1:1 mappings; both preserve epistemic role.
2. **Tracked residual #198** — no occurrence: L2 has no stacked-`\frac` summary tables,
   so desktop axe is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (Concept Throughline, Reading Map, Parts 1–6,
  Worked Example, Synthesis, Summary, Exit Ticket, six Quick Checks, two Misconceptions).
  Practice Problems → `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 2); 21 new `figures.ts` entries + assets;
  **1 new equation entity** (`enclosed-mass-circular-speed`).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0 errors (Pedagogy audit: 0 errors,
  1 pre-existing warning [equilibrium-temperature D5], 71 infos); practice-unrouted
  warning (#189) expected.
- ✅ Rendered-page gate: console = favicon 404 only; 21 figures, 0 broken; 67 KaTeX;
  1 KeyEquation card; 1 WorkedExample (numerical + DimCheck); 2 Interventions; **12
  glossary defs (count verified = planned, after restoring "Enclosed mass")**; 0
  iframes; no leaked MDX (`\lt` rendered to `<`); the sidebar reads Galaxies as
  Ecosystems → The Dynamical Universe; axe **0 violations desktop, light + dark**.
- ✅ ADR 0086: 12 terms canonical here, including the dark-matter takeover from M4-L1
  (no two-canonical collision; build guard satisfied).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
