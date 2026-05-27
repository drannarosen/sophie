---
title: 'Pilot report: ASTR 201 Module 4 Lecture 1 — Galaxies as Ecosystems'
short_title: 'Pilot: M4-L1 Galaxies as Ecosystems'
description: 'Production migration of ASTR 201 Lecture 4-1 (Galaxies as Ecosystems) into the astr201 consumer repo — the OPENING reading of Module 4, which scaffolds the new galaxies-cosmology section (order 3). Zero new equation entities (dynamical-timescale reused from M3-L1), 13 new figures, 12 canonical glossary terms (10 source-glossary + baryon + dark matter), 1 opening video link Callout, 1 Misconception Intervention, the first .quiz MCQ remap of the corpus, and an 8-problem practice.mdx.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 4 Lecture 1 — "Galaxies as Ecosystems"**
from Quarto `.qmd` into the **astr201 consumer repo** at
`src/content/sections/galaxies-cosmology/units/lecture-01-galaxies-as-ecosystems/`.
It lands at **order 1** and **opens Module 4** — the galaxies-cosmology section did
not exist before, so this migration **scaffolds the new section**
(`src/content/sections/galaxies-cosmology.json`, order 3, the sibling of
foundations=0 / hr-diagram=1 / stellar-structure-evolution=2). Source
`astr201-sp26/` was read-only. At **355 lines** this is a compact, figure-heavy,
math-light opener. It ships a **Practice Problems section** (→ `practice.mdx`) and a
**10-term prose glossary**.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` ×13 | `<Figure name="ID">` | ✅ direct | 13 figures, all new (assets copied, id != filename). No collisions with Modules 1–3. |
| `{{< media rubin-zoomout-galaxies >}}` | `<Callout variant="info">` with a labeled link | ✅ decided | The opening Rubin/LSST zoom-out resolves through `assets/media.yml` to a YouTube video → link Callout (the standing iframe/video→link remap). Renders 0 iframes + 1 descriptive YouTube link — no axe `frame-title`/CSP issue. |
| `{{< include …/dynamical-timescale.qmd >}}` + `{{< eqrefcard dynamical-timescale >}}` | `<KeyEquation refId="dynamical-timescale">` | ✅ reuse | The lone include is the dynamical timescale, already a registry entity (M3-L1, reused again in M3-L9). **Zero new equation entities.** |
| `:::{.quiz}` single-best-answer MCQ | `<Callout variant="tip">` + ballot-box bullets + `<Dropdown label="Answer">` | ✅ remap (Anna's call) | **New source pattern** (appears in all three Module 4 readings, none in Modules 1–3). A raw GFM task-list would throw one axe `label` violation per option; the ballot-box (`☐`) bulleted list + Dropdown answer preserves the retrieval role with no form control. |
| `:::{.callout-note title="Quick Check N"}` + `:::{.callout-note collapse title="Answer"}` ×7 | `<Callout variant="tip">` + `<Dropdown label="Answer">` | ✅ direct | The seven conceptual self-checks. |
| `:::{.callout-warning}` "Misconception Check" ×1 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | The Hubble tuning-fork misconception. |
| `:::{.callout-tip title="Observe → Model → Infer"}` | `<Callout variant="key-insight">` | ✅ remap | **Multi-observable** O/M/I box (color, shape, dust lanes, clumps…) — fails the OMIFlow strict-3 invariant (OF-1), so it stays a key-insight Callout, not an OMIFlow (Anna's call). |
| `:::{.callout-note collapse}` Enrichment (Track B) | `<Callout variant="the-more-you-know">` | ✅ direct | "What Rubin Changes." |
| `:::{.callout-note title="Units Sanity Check"}` | `<Callout variant="info">` + `$$` display math | ✅ direct | The $G\bar{\rho}$ dimensional check stays inline display math (not a WorkedExample — no source-labeled worked example). |
| `:::{.callout-note title="Reading Map"}`, Exit Ticket | `<Callout variant="info">` / `<Callout variant="tip">` | ✅ direct | Track A/B map; exit ticket. |
| `## Practice Problems` (8, with ⭐) | `practice.mdx` sibling | ✅ split | Source ⭐ ratings preserved; problem-classification HTML comments dropped (internal metadata). |
| `## Glossary` (10 prose definitions) | `<GlossaryTerm>` + `<Aside>` + `<ChapterGlossary>` | ✅ glossary exception | 10 source terms migrated 1:1, plus `baryon` (defined inline) and `dark matter` per the glossary-enrichment exception. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **Zero `<OMIFlow>`** — the chapter's only
Observable/Model/Inference box is multi-observable, which fails the strict-3
invariant, so it maps to a `key-insight` Callout. The observe→model→infer method is
the chapter's prose throughline, not a compact 3-slot arc. (Consistent with the
M3-L7/L9 precedent: OMIFlow only for clean strict-3 arcs.)

### Glossary canonical (ADR 0086)

The Module 4 opener and the **home of the galaxy-ecosystem vocabulary**, so it takes
**12 terms canonical** — all new ownership, no collisions, no takeovers: Baryon,
Baryon cycle, Cold gas, Dark matter, Dust, Feedback, Galaxy morphology, Interstellar
medium, Metal enrichment, Neutral hydrogen, Starburst, Tidal interaction. Ten come
from the source's explicit glossary; `baryon` (defined inline in Part 4) and
`dark matter` (mentioned in Part 2) are added per the glossary-enrichment exception.
**Dark matter is taken canonical here at Anna's call** even though L2 (the dynamical
universe) is its physics home — L2 will reference it.

### Equation registry

**Zero new entities.** The single include is `dynamical-timescale`
($\tau_{\text{dyn}} \sim 1/\sqrt{G\bar{\rho}}$), authored for M3-L1 and reused by
`refId`. The registry is mature enough that a galaxy-scale star-formation argument
reuses a stellar-structure clock unchanged.

## Pedagogical decisions log

- **New section scaffolded** — `galaxies-cosmology.json` (order 3) created alongside the unit JSON (order 1). L2/L3 will only add unit JSONs.
- **`.quiz` MCQ → tip Callout + Dropdown** — confirmed at the gate; locks the mapping for L2/L3 (both have `.quiz` blocks). Ballot-box bullets avoid the GFM task-list axe `label` violation.
- **12 canonical glossary terms incl. dark matter** — confirmed at the gate (Anna chose the 11+dark-matter scope). No collisions; galaxies-cosmology opens clean.
- **Non-OMI; multi-observable O/M/I → key-insight Callout** — confirmed at the gate.
- **Opening video → link Callout** — the standing iframe/video→link remap.
- **0 WorkedExamples** — no source-labeled worked example; the Units Sanity Check stays inline display math.
- **practice.mdx** — 8 problems (3 conceptual / 2 calculation / 3 synthesis), ⭐ ratings preserved.

## Time spent per phase

| Phase | Rough time |
|---|---|
| Read-first (runbook, memory, ADR 0064, template, source, registries) | ~30% |
| Gate decisions surfaced to Anna (quiz, glossary scope, framing) | ~5% |
| Scaffold (section + unit JSON, 13 assets, figures.ts, conversion) | ~35% |
| Verify (biome / astro check / build / Playwright render + axe) | ~25% |
| Report + TOC | ~5% |

Conversion-time dominated; zero platform-shaping time (the platform is hardened).

## Surprises

**1. The `.quiz` block is a genuinely new source pattern.** It appears in all three
Module 4 readings but never in Modules 1–3, so there was no precedent. Resolved as a
tip Callout + ballot-box bullets + Dropdown answer (Anna's call). The naive GFM
task-list (`- [x]`/`- [ ]`) would have thrown one axe `label` violation per option.

**2. The "empty sidebar / MOD 3" scare was a probe artifact.** `innerText` on the
ModuleNav's collapsed `<details>` accordions returns empty, and the breadcrumb's
module label is the **0-indexed `section.order`** (foundations renders "MOD 0",
stellar-structure-evolution "MOD 2"), so galaxies-cosmology correctly renders
"MOD 3". Inspecting `innerHTML` confirmed the section renders 4th with L1
`aria-current="page"`. Lesson reinforced: inspect structure, not `innerText`, for
collapsed nav, and compare against a known-good page before calling it a bug.

**3. `media` ≠ `video`.** The source profile reported "0 video," but the opening
`{{< media >}}` shortcode resolves through `assets/media.yml` (with an
`assets/videos/` dir) to a YouTube URL — i.e. it is a video, handled by the standing
link-Callout remap.

## Platform issues to file

1. **No new gaps.** The `.quiz` MCQ has no dedicated Sophie component, but the tip +
   Dropdown remap preserves the epistemic role (retrieval/self-check), so it is not a
   blocking gap under ADR 0064 §3. A future dedicated single-best-answer component
   could be worth scoping if `.quiz` density grows in Module 4.
2. **Tracked residual #198** — no occurrence: L1 has no summary tables, so desktop
   axe is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (Concept Throughline, Reading Map, opening
  video, Parts 1–7, Summary, Exit Ticket, the seven Quick Checks, the tuning-fork
  Misconception). Practice Problems → `practice.mdx`.
- ✅ New section scaffolded: `galaxies-cosmology.json` (order 3) + unit JSON (order 1).
- ✅ Registries scaffolded: 13 new `figures.ts` entries + assets; **zero** new equation
  entities (reusing `dynamical-timescale`).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0 errors (Pedagogy audit: 0
  errors, 1 pre-existing warning [equilibrium-temperature D5], 69 infos);
  practice-unrouted warning (#189) expected.
- ✅ Rendered-page gate: console = favicon 404 only; 13 figures, 0 broken; 21 KaTeX;
  1 KeyEquation card; 0 OMIFlow; 1 Intervention; **12 glossary defs (count verified =
  planned)**; 0 iframes + 1 YouTube link; no leaked MDX; the section sidebar reads
  Foundations → HR Diagram → Stellar Structure → **Galaxies & Cosmology** with L1
  `aria-current`; axe **0 violations desktop, light + dark**.
- ✅ ADR 0086: 12 galaxies-cosmology terms canonical here (no collisions, no takeovers).
- ✅ **Module 4 opened.** Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
