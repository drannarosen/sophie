---
title: 'Pilot report: ASTR 201 Module 3 Lecture 8 — The Quantum Limit'
short_title: 'Pilot: M3-L8 Degeneracy & Chandrasekhar'
description: 'Production migration of ASTR 201 Lecture 3-8 (Degeneracy Pressure and the Chandrasekhar Mass) into the astr201 consumer repo. Reuses both L7 entities (degeneracy-pressure, wd-mass-radius) plus 1 new (chandrasekhar-mass), reuses the L7 wd-mass-radius figure (no new assets), and finally homes the Degeneracy pressure glossary term canonical (the takeover L6/L7 deferred) alongside 5 other new canonical QM terms. No Practice Problems.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 8 — "The Quantum Limit:
Degeneracy Pressure and the Chandrasekhar Mass"** from Quarto `.qmd` into the
**astr201 consumer repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-08-degeneracy-chandrasekhar/`.
It lands at **order 8** (after L1–L7). Source `astr201-sp26/` was read-only. Scope:
full reading (guiding question + Parts 1–5 + Reference Tables + Summary + Gravity
Scoreboard). At **543 lines** this is the smallest Module 3 source so far. **No
`practice.mdx`** (no Practice Problems section). This chapter is the payoff for L6/L7's
forward references: it reuses both equation entities authored in L7 and finally takes
the *Degeneracy pressure* glossary term canonical.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ reuse | 1 figure (`wd-mass-radius`), already registered in L7 — **no new assets**. |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ direct | 3 includes → **2 reused** (`degeneracy-pressure`, `wd-mass-radius`, both authored in L7) + **1 new** (`chandrasekhar-mass`, with the $Y_e$ composition form as a `rearranged_form`). |
| `### Plugging In the Numbers` (prose calc) | inline `$$` display math | ✅ inline | A continuation of the Chandrasekhar derivation, not a standalone worked example — kept inline. No `<WorkedExample>` in this chapter. |
| `:::{.callout-note .omi}` "Observable → Model → Inference" | `<OMIFlow>` | ✅ direct | 1 clean strict-3 arc (Part 4: white-dwarf mass distribution). |
| `:::{.callout-tip}` "Misconception Check" (Part 5) | `<Callout variant="tip">` + `<Dropdown>` | ✅ as authored | Despite the title, the source box is a `callout-tip` Q&A with a Solution, **not** a `callout-warning` wrong-statement — so it maps to tip + Dropdown, not misconception + Intervention. |
| `:::{.callout-tip}` + collapse Solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | 5 Check-Yourself boxes total. |
| `:::{.callout-important}` Big Idea | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-note collapse}` Enrichment ×2 | `<Callout variant="the-more-you-know">` | ✅ direct | Fermi energy; Chandrasekhar-Eddington controversy. |
| `:::{.callout-note}` "Gravity Scoreboard — Reading 8" + ASCII | `<Callout variant="key-insight">` + code fence | ✅ motif preserved | |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 6 canonical definitions. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **1 `<OMIFlow>`** (`omi-chandrasekhar`): white-dwarf
masses cluster below ~1.4 M_⊙ → relativistic degeneracy + hydrostatic equilibrium →
the Chandrasekhar limit divides remnant fates. Clean strict-3.

### Glossary canonical (ADR 0086)

This is the QM-trilogy/degeneracy home chapter, so it **takes 6 terms canonical**:
Pauli exclusion principle, Chandrasekhar mass, Fermi momentum, Fermion, and Fermi
energy (all new), plus **Degeneracy pressure** — the **takeover** that L6 and L7
explicitly deferred here. Degeneracy pressure had a non-canonical definition in M3-L2
and no canonical owner, so marking it canonical here is clean. White dwarf (L7),
Heisenberg uncertainty principle (L6), de Broglie (L3), and virial theorem (M3-L2)
are referenced as prose.

### Equation registry

One new entity, `chandrasekhar-mass` ($M_\text{Ch} \sim (\hbar c/G)^{3/2}/m_p^2$, with the
composition form $\approx 5.83\,Y_e^2\,M_\odot$ as a `rearranged_form`). It `derives-from`
`degeneracy-pressure` (the relativistic $\rho^{4/3}$ softening) and `see-also`
`wd-mass-radius`. The two reused entities are referenced by `refId` only — this chapter
adds no degeneracy-pressure or mass-radius re-authoring, just consumes L7's work.

## Pedagogical decisions log

- **1 new entity (chandrasekhar-mass); reuse degeneracy-pressure + wd-mass-radius** — confirmed.
- **6 canonical terms incl. the Degeneracy-pressure takeover** — confirmed at the gate (Anna
  chose the 6-term scope, adding Fermion + Fermi energy to the core 4).
- **Part-5 "Misconception Check" → tip + Dropdown** — faithful to the source's `callout-tip`
  structure; no Intervention (so no orphaned `addresses` slug).
- **No `<WorkedExample>`** — "Plugging In the Numbers" is inline derivation, not a labeled
  worked example.
- **No `practice.mdx`** — no Practice Problems section in source.

## Surprises

**1. The reuse dividend from L7.** Because L7 authored `degeneracy-pressure` and
`wd-mass-radius` (and registered the `wd-mass-radius` figure), L8 — the chapter that is
*most* about those objects — needed only one new entity and zero new figure assets. Sequencing
the white-dwarf physics in L7 paid off directly in L8's small diff.

**2. The Degeneracy-pressure canonical takeover finally lands.** L6 and L7 both wrapped
"degeneracy pressure" as prose with an explicit note that R8 is its home. L8 closes that loop:
it is the only chapter to mark the term canonical, so the build-guard one-canonical-per-slug
rule is satisfied and the `/library/glossary` representative is now the dedicated derivation.

**3. The author-trap lint scans comment text too.** The remnant-fate table's raw `<` (in
`$M_\text{core} < 1.4\,M_\odot$`) was rewritten as `\lesssim` — but the *migration comment*
describing that fix also contained a raw `<` before a quote, which failed the build with
"Raw `<` before a non-letter character." The fix is to spell out "less-than sign" in prose
and comments. (Reinforces the standing rule: never a raw `<` before a non-letter, anywhere —
math, prose, or `{/* */}` comments.)

## Platform issues to file

1. **Gap: `<Video>`** — not needed by this chapter.
2. **Tracked residual #198** — no occurrence: all tables use inline-math cells, so desktop
   axe is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (guiding question, Parts 1–5, Reference Tables, Summary,
  Gravity Scoreboard, the Part-4 O→M→I arc). No practice problems → no `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 8), 1 new equation entity (reusing 2 from L7),
  reused `wd-mass-radius` figure (no new assets).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 1 figure, 0 broken; 226 KaTeX; 3 KeyEquation
  cards; 1 OMIFlow (1/1/1); 0 WorkedExample and 0 Interventions (as intended); 6 canonical
  glossary defs; no leaked MDX; the section sidebar reads L1→…→L8; axe **0 violations desktop,
  light (5/5) + dark (3/3)**.
- ✅ ADR 0086: 6 terms canonical here, including the Degeneracy-pressure takeover (no collision).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
