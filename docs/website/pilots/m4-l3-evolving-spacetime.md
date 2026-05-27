---
title: 'Pilot report: ASTR 201 Module 4 Lecture 3 — The Universe as an Evolving Spacetime'
short_title: 'Pilot: M4-L3 Evolving Spacetime'
description: 'Production migration of ASTR 201 Lecture 4-3 (The Universe as an Evolving Spacetime) into the astr201 consumer repo — the Module 4 and course-wide reading-migration FINALE. Two new equation entities (hubble-law, cosmological-redshift), 11 new figures plus 2 reused shared figures, a CMB OMIFlow, 13 glossary terms (11 canonical + 2 non-canonical referencing M4-L2), the locked .quiz and video-link remaps, and a 9-problem practice.mdx. Completes Modules 1-4.'
authors:
  - name: Anna Rosen
date: 2026-05-27
---

## Pilot context

Production migration of **ASTR 201 Module 4 Lecture 3 — "The Universe as an Evolving
Spacetime"** from Quarto `.qmd` into the **astr201 consumer repo** at
`src/content/sections/galaxies-cosmology/units/lecture-03-evolving-spacetime/`. It
lands at **order 3** and **closes Module 4** — and with it the entire course's reading
migration (Modules 1–4 now fully migrated). Source `astr201-sp26/` was read-only. At
**385 lines** it is the cosmology capstone: the distance ladder, Hubble's law,
cosmological redshift, deep fields, the CMB, and Big Bang nucleosynthesis. It ships a
Practice Problems section (→ `practice.mdx`) and a 13-term prose glossary.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `{{< fig ID >}}` ×13 | `<Figure name="ID">` | ✅ direct | **11 new** (assets copied, id != filename) + **2 reused by name** (`cmb-map`, `periodic-table-origins` — already registered elsewhere; NOT re-added, per the exact-key dedup grep). |
| `{{< include …/hubble-law.qmd >}}` | `<KeyEquation refId="hubble-law">` | ✅ **1 new entity** | $v = H_0 d$, with biography (Observable / Assumption: large-scale average / DerivationStep: empirical pattern / BreaksWhen: bound systems / CommonMisuse: motion-through-space-with-a-center). |
| `{{< include …/cosmological-redshift.qmd >}}` | `<KeyEquation refId="cosmological-redshift">` | ✅ **1 new entity** | The aligned $z$ / $1+z = \lambda_{\rm obs}/\lambda_{\rm emit} = a_0/a_{\rm emit}$ block. |
| `{{< media scienceclic-... >}}` | `<Callout variant="info">` + labeled YouTube link | ✅ decided | The ScienceClic video → link Callout (standing remap; the source already supplied a fallback link). 0 iframes, 1 link. |
| `:::{.quiz}` single-best-answer MCQ | `<Callout variant="tip">` + ballot-box bullets + `<Dropdown>` | ✅ locked | The M4-L1 mapping applied unchanged. |
| `:::{.callout-note title="Quick Check N"}` + collapse ×6 | `<Callout variant="tip">` + `<Dropdown>` | ✅ direct | |
| `:::{.callout-warning}` "Misconception Check" ×1 | `<Callout variant="misconception">` + `<Intervention>` | ✅ semantic remap | "The Big Bang was an explosion into space." (Profile said 2; the source has 1.) |
| `:::{.callout-tip title="Observe → Model → Infer"}` (CMB) | `<OMIFlow>` | ✅ remap (Anna's call) | A **clean single-observable strict-3 arc** (CMB radiation → hot cooling universe → relic light + structure seeds) → OMIFlow, per the M3-L10 precedent. Non-OMI chapter framing. |
| `:::{.callout-note title="What We Mean by Spacetime"}` | `<Callout variant="info">` | ✅ direct | Introduces Spacetime + Scale factor (both canonical here). |
| `## Practice Problems` (9, with ⭐) | `practice.mdx` sibling | ✅ split | Source ⭐ ratings preserved. |
| `## Glossary` (13 prose definitions) | `<GlossaryTerm>` + `<Aside>` + `<ChapterGlossary>` | ✅ glossary exception | 13 terms migrated 1:1. |

## Pedagogy structure map

### OMI

Non-OMI framing (no `framing:"OMI"`) **+ 1 `<OMIFlow>`** — the Part 5 CMB box, a clean
strict-3 arc, rendered with Observable/Model/Inference slots (verified 1/1/1 at the
gate). This is the only Module 4 reading whose O/M/I box was clean enough for OMIFlow;
L1 and L2's boxes were multi-observable and stayed key-insight Callouts.

### Glossary canonical (ADR 0086)

**13 terms defined here = 11 canonical + 2 non-canonical.** Canonical (new, no
collisions): Big Bang nucleosynthesis, Cosmic microwave background, Cosmological
redshift, Distance ladder, Hubble constant, Hubble's law, Lookback time, Recombination,
Scale factor, Spacetime, Standard candle. **Non-canonical** (referenced; M4-L2 owns them
canonical): Cosmic web, Galaxy cluster — each gets a local definition Aside (no
`canonical` flag) so L3's ChapterGlossary stays complete and faithful to the source,
while L2 remains the representative. The build guard's one-canonical-per-slug rule is
satisfied (verified: build 0 errors).

### Equation registry

**Two new entities**: `hubble-law` ($v = H_0 d$) and `cosmological-redshift`
($1+z = \lambda_{\rm obs}/\lambda_{\rm emit} = a_0/a_{\rm emit}$), one per source
include, cross-linked to `doppler-shift` and to each other.

## Pedagogical decisions log

- **2 new equation entities (hubble-law, cosmological-redshift)** — confirmed (one per include).
- **CMB box → OMIFlow** — confirmed at the gate (clean strict-3 arc, M3-L10 precedent).
- **13 glossary terms = 11 canonical + 2 non-canonical** (Cosmic web, Galaxy cluster reference M4-L2) — confirmed at the gate.
- **2 shared figures reused by name** (`cmb-map`, `periodic-table-origins`) — exact-key grep caught both; re-adding would be a hard duplicate-key build failure.
- **Video → link Callout; .quiz → tip + Dropdown (locked); 1 Misconception → Intervention; 9-problem practice.mdx.**

## Time spent per phase

| Phase | Rough time |
|---|---|
| Read-first + inventory (13 figures incl. 2 shared, 2 includes, glossary collisions) | ~25% |
| Gate decisions (CMB OMIFlow, glossary scope) | ~5% |
| Scaffold (2 entities, 11 assets, figures.ts, unit JSON, conversion) | ~40% |
| Verify (biome / astro check / build / Playwright render + axe) | ~25% |
| Report + TOC | ~5% |

## Surprises

**1. Two shared figures, caught by the exact-key grep.** `cmb-map` and
`periodic-table-origins` were already registered (the CMB Planck map and the
nucleosynthesis-origin periodic table are reused across the course). Referencing them by
name (and skipping the asset copy + registry entry) avoided the duplicate-key build
failure that re-adding would have caused — the third-plus time this dedup grep has paid
off in the migration.

**2. The cleanest O/M/I box of Module 4.** Unlike L1/L2's multi-observable boxes, L3's
CMB box is a genuine single-observable strict-3 arc, so it earns an OMIFlow — and it
feeds the Observables/Models/Inferences Library rooms with a cosmology entry.

**3. The course's final reading migration.** With L3, Modules 1–4 are fully migrated.

## Platform issues to file

1. **No new gaps.** The `.quiz` and video-link remaps remain the only non-1:1 mappings;
   both preserve epistemic role.
2. **Tracked residual #198** — no occurrence: no stacked-`\frac` summary tables, so
   desktop axe is clean in light + dark.

## Success criteria

- ✅ Full reading migrated truthfully (Concept Throughline, Spacetime + video callouts,
  Parts 1–7, Summary, Final Exit Ticket, six Quick Checks, one Misconception, the CMB
  OMIFlow). Practice Problems → `practice.mdx`.
- ✅ Registries scaffolded: unit JSON (order 3); 11 new `figures.ts` entries + assets
  (2 shared reused by name); **2 new equation entities**.
- ✅ `biome` clean; `astro check` 0/0/0; `pnpm build` 0 errors (Pedagogy audit: 0 errors,
  1 pre-existing warning [equilibrium-temperature D5], 74 infos); practice-unrouted
  warning (#189) expected.
- ✅ Rendered-page gate: console = favicon 404 only (0 React #418); 13 figures, 0 broken
  (incl. the 2 reused); 61 KaTeX; 2 KeyEquation cards; **OMIFlow 1/1/1**; 1 Intervention;
  **13 definition Asides (= planned)**; 0 iframes + 1 YouTube link; no leaked MDX; the
  sidebar reads Galaxies as Ecosystems → The Dynamical Universe → The Universe as an
  Evolving Spacetime; axe **0 violations desktop, light + dark**.
- ✅ ADR 0086: 11 canonical + 2 non-canonical (Cosmic web, Galaxy cluster reference M4-L2);
  build guard satisfied.
- ✅ **Module 4 complete (L1–L3); Modules 1–4 reading migration COMPLETE.** Zero edits to
  `/Users/anna/Teaching/astr201-sp26/`.
