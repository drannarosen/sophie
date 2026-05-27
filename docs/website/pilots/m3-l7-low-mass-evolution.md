---
title: 'Pilot report: ASTR 201 Module 3 Lecture 7 — After the Main Sequence'
short_title: 'Pilot: M3-L7 Low-Mass Evolution'
description: 'Production migration of ASTR 201 Lecture 3-7 (Low-Mass Evolution and White Dwarfs) into the astr201 consumer repo. First chapter with an explicit per-Part Observable/Model/Inference spine (kept as H3 headings, non-OMI), first to hit the <Video> missing-component gap (resolved as a link Callout), 3 new equation entities + 2 reused, 7 canonical evolutionary-phase glossary terms incl. a White-dwarf takeover, 2 WorkedExamples, no Practice Problems.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 7 — "After the Main Sequence:
Low-Mass Evolution and White Dwarfs"** from Quarto `.qmd` into the **astr201
consumer repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-07-low-mass-evolution/`.
It lands at **order 7** (after L1–L6). Source `astr201-sp26/` was read-only. Scope:
full reading (guiding question + opening Observable section + Parts 1–6 + Reference
Tables). At **1230 lines** this is the second-largest source migrated. **No
`practice.mdx`** (no Practice Problems section). This chapter raised two firsts: an
explicit Observable/Model/Inference spine, and the `<Video>` missing-component gap.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 7 figures, all new. Asset filenames differ from figure ids (e.g. `gaia-hr-diagram` ← `Gaia_s_Hertzsprung-Russell_diagram.jpg`); copied to `/figures/<id>.<ext>`. |
| `{{< video URL >}}` (in a "Watch:" callout) | `<Callout>` with a labeled link | ✅ decided | **Missing-component gap halted to Anna; resolved as a link Callout** (the iframe→link precedent). Renders 0 iframes + a descriptive YouTube link, so no axe `frame-title` / CSP issue. |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | 5 includes → **2 reused** (`virial-theorem` — the source's `stellar-virial` is the identical $2K_{th}+U_{grav}=0$; `stefan-boltzmann`) + **3 new** (`triple-alpha`, `degeneracy-pressure`, `wd-mass-radius`). |
| `#### Radius example` / `#### Density example` (prose) + unit checks | `<WorkedExample>` | ✅ remap | 2 embedded numerical examples; the "kelvin units cancel" / "g/cm³" lines → `.DimCheck`. |
| `### Observable` / `### Model` / `### Inference` (per Part) | `###` subheadings | ✅ structural | **Non-OMI framing** (Anna's call): the spine is preserved as H3 headings, not `<OMIFlow>` (the Model sections are multi-paragraph derivations, not strict-3 boxes; the source has 0 `.omi` callout boxes). |
| `:::{.callout-tip}` "Reasoning Task" + collapse Solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | 5 reasoning tasks. |
| `:::{.callout-note collapse}` Enrichment | `<Callout variant="the-more-you-know">` | ✅ direct | Type Ia white-dwarf runaway. |
| `:::{.callout-important}` Final Inference | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-note}` Reading-Map / Math-Grammar | `<Callout variant="info">` | ✅ direct | |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 7 canonical definitions. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`), **0 `<OMIFlow>`**. The chapter's Observable→Model→Inference
spine is unusually explicit — every Part carries `### Observable / ### Model / ### Inference` —
but those are full prose sections (with derivations and worked examples), not the compact
strict-3 arcs the `<OMIFlow>` component is for. They are preserved as H3 subheadings, which
keeps the epistemic scaffolding visible without forcing content into a box it doesn't fit.

### Glossary canonical (ADR 0086)

This is the low-mass-evolution chapter, so it **takes 7 terms canonical**: Red giant branch,
Horizontal branch, Asymptotic giant branch, Planetary nebula, Triple-alpha process, Helium
flash, and **White dwarf**. The White-dwarf marker is a **clean takeover** — it was defined
non-canonically in M2-L4 and M2-L5 with no canonical owner, and L7 is its physics home (it
derives degeneracy support and the mass-radius relation). Degeneracy pressure is referenced
as prose (deferred to R8 Chandrasekhar, consistent with L6); main-sequence turnoff (M3-L1),
virial theorem (M3-L2), and HR diagram (M2-L5) are also prose.

### Equation registry

Three new entities. `triple-alpha` (net reaction $3\,{}^4\text{He}\to{}^{12}\text{C}+\gamma$)
`see-also` `virial-theorem` (virial heating raises the core to ignition). `degeneracy-pressure`
($P_\text{deg}\sim(\hbar^2/m_e)n_e^{5/3}$) `derives-from` `heisenberg` and `see-also`
`wd-mass-radius`. `wd-mass-radius` ($R_\text{WD}\propto M^{-1/3}$) `derives-from`
`degeneracy-pressure` and `see-also` `central-pressure-scaling`. The new entities form the
white-dwarf support chain Heisenberg → degeneracy pressure → mass-radius in the `related` graph.

## Pedagogical decisions log

- **Video → link Callout** — the `<Video>` component is unbuilt; halted to Anna, who chose the
  link-Callout remap over building the component or deferring the chapter.
- **Non-OMI + O/M/I as H3 headings** — confirmed at the gate; the spine is preserved without
  OMIFlow components.
- **Reuse virial-theorem (= stellar-virial) + stefan-boltzmann; 3 new entities** — confirmed.
- **degeneracy-pressure entity authored here** (L7's first quantitative use); R8 will extend it
  to the relativistic regime.
- **7 canonical terms incl. White-dwarf takeover** — confirmed (no prior canonical owner).
- **2 embedded examples → WorkedExample; 5 Reasoning Tasks → tip + Dropdown.**
- **No `practice.mdx`** — no Practice Problems section in source.

## Surprises

**1. First `<Video>` missing-component gap.** The runbook flags `<Video>` as a halt-or-decide
gap. M3-L7 is the first migrated chapter to actually contain `{{< video >}}`. Per ADR 0064 it
was halted to Anna rather than worked around silently; her decision (link Callout) keeps the
pedagogical "watch this" intent, renders 0 iframes, and passes the axe gate.

**2. Reaction entities need non-empty `symbols`.** Authoring `triple-alpha` with `symbols: []`
failed the content collection schema (`InvalidContentEntryDataError`). The fix is to list the
nuclei (`{}^4He`, `{}^{12}C`, `γ`), matching the `pp-chain-net` precedent — the schema requires
≥1 symbol even for a net reaction with no scalar variables.

**3. An explicit O/M/I spine that is *not* OMIFlow.** Earlier chapters used OMIFlow for clean
strict-3 arcs inside an otherwise Parts-spine reading. L7 inverts that: its whole structure is
O/M/I, but each slot is a long derivation. The right mapping was H3 headings + non-OMI framing,
not OMIFlow components — a reminder that "OMI structure" and "the OMIFlow component" are different
things.

## Platform issues to file

1. **Gap: `<Video>`** — encountered here for the first time and resolved per Anna as a link
   Callout. A real `<Video>` component (lazy/privacy-friendly YouTube embed with a `title` for
   axe) remains the proper long-run fix and would unblock future video chapters.
2. **Tracked residual #198** — no occurrence: all 3 tables use inline-math cells, so desktop axe
   is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (guiding question, opening Observable section, Parts 1–6,
  Reference Tables, per-Part O/M/I preserved as headings). No practice problems → no `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 7), 7 new `figures.ts` entries + assets, 3 new
  equation entities (reusing virial-theorem + stefan-boltzmann).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 7 figures, 0 broken; 205 KaTeX; 5 KeyEquation
  cards; 2 WorkedExample numerical + 2 DimCheck; 0 OMIFlow (non-OMI, as intended); 0 iframes +
  a descriptive YouTube link; 7 canonical glossary defs; no leaked MDX; the section sidebar reads
  L1→…→L7; axe **0 violations desktop, light (6/6) + dark (4/4)**.
- ✅ ADR 0086: 7 evolutionary-phase terms canonical here (White dwarf takeover, no collision).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
