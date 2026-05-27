---
title: 'Pilot report: ASTR 201 Module 3 Lecture 9 — The Death of Giants'
short_title: 'Pilot: M3-L9 High-Mass Evolution & Supernovae'
description: 'Production migration of ASTR 201 Lecture 3-9 (High-Mass Evolution and Supernovae) into the astr201 consumer repo. Zero new equation entities (both includes reuse chandrasekhar-mass and dynamical-timescale), 12 new figures, 7 new canonical supernova-era glossary terms, 5 Misconception Checks to Interventions, and the shared binding-energy-curve figure deduplicated against M3-L3. No Practice Problems.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 3 Lecture 9 — "The Death of Giants:
High-Mass Evolution and Supernovae"** from Quarto `.qmd` into the **astr201 consumer
repo** at
`src/content/sections/stellar-structure-evolution/units/lecture-09-high-mass-evolution-supernovae/`.
It lands at **order 9** (after L1–L8). Source `astr201-sp26/` was read-only. Scope:
full reading (guiding question + Parts 1–5 + Reference Tables + Summary + Gravity
Scoreboard). At **836 lines**, it is the figure-heaviest Module 3 chapter (12 figures).
**No `practice.mdx`** (no Practice Problems section).

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` | `<Figure name="ID">` | ✅ direct | 12 figures. 11 new (assets copied, id != filename); `binding-energy-curve` was **already registered by M3-L3** and is referenced, not re-added. |
| `{{< include …/X.qmd >}}` + `{{< eqrefcard X >}}` | `<KeyEquation refId="X">` | ✅ reuse | 2 includes, **both reused** — `chandrasekhar-mass` (L8) and `dynamical-timescale` (M3-L1). **Zero new equation entities.** |
| `:::{.callout-warning}` "Misconception Check" ×5 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | (late-stages/mass; iron-is-heaviest; bounce-blows-apart; bright≠dominant; mass-from-Big-Bang) — distinct titles so the `addresses` slugs don't collide. |
| inline boxed derivations (τ_Si/τ_H, τ_dyn, ΔE_grav) | inline `$$` display math | ✅ inline | Unit-checked derivations inside Model prose — kept inline. **No `<WorkedExample>`** (no source-labeled worked examples). |
| `:::{.callout-note .omi}` "Observable → Model → Inference" | `<OMIFlow>` | ✅ direct | 1 clean strict-3 arc (Part 4: solar abundance pattern). |
| `:::{.callout-important}` Big Idea / Physical Meaning | `<Callout variant="key-insight">` | ✅ direct | |
| `:::{.callout-note collapse}` Enrichment ×2 | `<Callout variant="the-more-you-know">` | ✅ direct | SN 1987A; r-process in NS mergers. |
| `:::{.callout-tip}` + collapse Solution | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | 6 Check-Yourself boxes. |
| `:::{.callout-note}` "Gravity Scoreboard — Reading 9" + ASCII | `<Callout variant="key-insight">` + code fence | ✅ motif preserved | |
| `<!-- TODO figure ... -->` ×2 | (dropped) | ✅ migrate-truthfully | The energy-budget bar chart and body-composition chart do not exist as assets; the TODO comments were dropped, not carried over. |
| inline definition terms | `<GlossaryTerm>` + `<Aside kind="definition">` + `<ChapterGlossary>` | ✅ glossary exception | 7 canonical definitions. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`). **1 `<OMIFlow>`** (`omi-nucleosynthesis`): the solar
abundance pattern → nucleosynthesis theory → the periodic table is a record of stellar
nucleosynthesis. Clean strict-3.

### Glossary canonical (ADR 0086)

The supernova/nucleosynthesis home chapter, so it **takes 7 terms canonical**: Core-collapse
supernova, Onion-shell burning, r-process, s-process, Photodisintegration, Supernova remnant,
and Iron peak (Anna's call to own the broad B/A maximum distinctly from M3-L3's "binding energy
per nucleon"). Binding energy per nucleon (M3-L3), Chandrasekhar mass (L8), dynamical timescale
(M3-L1), and white dwarf (L7) are referenced as prose; **neutron star and black hole are deferred
to R10** (their home).

### Equation registry

**No new entities.** Both source includes reuse existing registry entities by `refId`:
`chandrasekhar-mass` (authored in L8, used here for the iron-core stability threshold) and
`dynamical-timescale` (authored in M3-L1, used here for the $\sim 0.04~\text{s}$ collapse
estimate). This is the first migrated chapter to add zero equation entities — a sign the
registry is maturing as Module 3 nears completion.

## Pedagogical decisions log

- **0 new equation entities; reuse chandrasekhar-mass + dynamical-timescale** — confirmed.
- **7 canonical terms incl. Iron peak** — confirmed at the gate (Anna chose the 7-term scope).
- **5 Misconception Checks → misconception + Intervention** — distinct slugs.
- **No `<WorkedExample>`** — the boxed derivations are inline, not source-labeled worked examples.
- **2 TODO-figure comments dropped** — migrate-truthfully: the figures don't exist.
- **No `practice.mdx`** — no Practice Problems section in source.

## Surprises

**1. A shared figure across chapters (the deduplication trap).** `binding-energy-curve` is used
by both M3-L3 (nuclear fusion) and M3-L9. M3-L3 had already registered it in `figures.ts`, so
re-adding it produced a duplicate-key build failure (biome `noDuplicateObjectKeys` + ts(1117)).
The fix per the standing rule: reference the existing key by `name` and delete the duplicate
entry; the re-copied asset was byte-identical, so git showed no change. (A pre-add exact-key grep
should have caught this; the grep was run but mis-parsed — worth an exact `grep -n '"id":'` check
before adding any figure.)

**2. Zero new equation entities.** Because L8 (chandrasekhar-mass) and M3-L1 (dynamical-timescale)
already supplied this chapter's two includes, L9 — despite being a long, physics-dense reading —
added no new entities. The reuse compounds: L8 reused two of L7's entities, and L9 reuses one of
L8's.

**3. A subdirectory asset path.** `nuclear-stellax-burning-stages` lives at
`module-03/nuclear-stellax/teaching_burning_stages.png` — a nested folder, not the flat
`module-03/` directory. The figure-id-to-filename indirection extends to directory depth, so the
`figures.yml` `path` (not a guessed location) is the source of truth for the copy.

## Platform issues to file

1. **Gap: `<Video>`** — not needed by this chapter.
2. **Tracked residual #198** — no occurrence: all tables use inline-math cells, so desktop axe
   is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (guiding question, Parts 1–5, Reference Tables, Summary,
  Gravity Scoreboard, the Part-4 O→M→I arc). No practice problems → no `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 9), 11 new `figures.ts` entries + assets (reusing
  `binding-energy-curve`), 0 new equation entities (reusing 2 existing).
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0/0 (benign practice-unrouted).
- ✅ Rendered-page gate: console = favicon 404 only; 12 figures, 0 broken; 218 KaTeX; 2 KeyEquation
  cards; 1 OMIFlow (1/1/1); 5 Interventions; 7 canonical glossary defs (count verified = planned);
  no leaked MDX; the section sidebar reads L1→…→L9; axe **0 violations desktop, light (5/5) +
  dark (3/3)**.
- ✅ ADR 0086: 7 supernova-era terms canonical here (no collision).
- ✅ Zero edits to `/Users/anna/Teaching/astr201-sp26/`.
