---
title: 'Pilot report: ASTR 201 Module 1 Lecture 3 — Gravity and Orbits'
short_title: 'Pilot: M1-L3 Gravity & Orbits'
description: 'Sixth ADR 0064 chapter migration — equation-dense Kepler-to-Newton derivation profile. First migration to author new equation entities for derived results (orbital/escape velocity), and the one that surfaced the cross-chapter definition-uniqueness rule and the units-collection sidebar dependency.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

The **sixth** chapter migration under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md). It converts **ASTR
201 Module 1 Lecture 3 — "Gravity and Orbits"** from Quarto `.qmd` into a Sophie
MDX reading at
`src/content/sections/foundations/units/lecture-03-gravity-and-orbits/`,
completing the Module 1 inference chain (L1 Spoiler Alerts → L2 Tools of the
Trade → **L3 Gravity & Orbits**).

**Structural profile.** Equation/derivation-dense — the opposite of L1's
narrative reel:

| Pilot | Dominant profile |
| --- | --- |
| m1-l1 Spoiler Alerts | narrative trailer; OMI-as-spine (8 `<OMIFlow>`) |
| m3-l2 Hydrostatic Equilibrium | equation / derivation / worked-example density |
| **m1-l3 Gravity & Orbits** | **Kepler→Newton derivation chain; 6 KeyEquations (2 new), 10 figures, 7 Predict prompts** |

Source `astr201-sp26/` was read-only. Scope: full reading (Parts 1–6 + Synthesis
+ Quick Practice), a sibling `practice.mdx` (11 problems), **2 new** equation
registry entities, 10 figures, 2 `<WorkedExample>`, 7 `<Predict>`, 2
misconceptions + interventions, ~18 GlossaryTerms. **No PR opened** — built +
verified locally, awaiting HITL sign-off.

## Shortcode → component dictionary

| Quarto shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| `learning-objectives:` | `<LearningObjectives>` + `<Objective>` | ✅ | 6 objectives. |
| `{{< fig >}}` | `<Figure name>` | ✅ | 10 cococubed SVGs (Kepler I/II, ball-on-string, gravity law, center-of-mass, escape velocity, energy/angular-momentum conservation, orbit types, curved space). |
| inline equations (no `{{< include >}}`) | `<KeyEquation refId>` + inline `$$` | ✅ | **2 new entities** (`orbital-velocity`, `escape-velocity`) cited via KeyEquation; **4 reused** (`newtonian-gravitation`, `kepler-third-law`, `virial-theorem`, `schwarzschild-radius`). Intermediate steps ($F=ma$, $a_c$, $U=-GMm/r$, $L$, $dA/dt$, $E=-GMm/2a$) stay inline display math. |
| `### Worked Example` ×2 | `<WorkedExample>` | ✅ | Earth orbital velocity; Earth escape velocity. `.Problem`/`.Step`/`.DimCheck`/`.Result`; unit-check `\cancel{}` chains simplified to plain DimCheck prose (KaTeX-safe). |
| `🧠 Pause & Predict` ×7 | `<Predict>` + adjacent `<Dropdown>` | ✅ | Each prompt's consolidated end-of-reading answer folded into a collapsible `<Dropdown>` beside its `<Predict>` (decision 0001 §4). |
| `✅ Quick Check` (energy sign) | `<RetrievalPrompt>` | ✅ | satisfies RET-1. |
| `⚠️ Common Notation Trap (P²=a³)`, `⚠️ Centripetal vs. Centrifugal` | `<Callout variant="misconception">` + `<Intervention>` | ✅ | 2 distinctly-titled misconceptions. |
| `⚠️ Common Pitfall (virial)` | `<Callout variant="warning">` | ✅ | a caution about applicability, not a misconception → no intervention. |
| `🔧 Unit Analysis`, `📐 Calculus Notation`, `🧭 Vectors`, `🗺️ Concept Map`, `💡 Why PE Negative` | `<Callout variant="tip"/"info"/"deep-dive">` | ✅ | emoji `##` section-headers → callouts. |
| `<details> Going Deeper` (cross product) | `<Callout variant="deep-dive">` | ✅ | |
| `{{< term >}}` / `{{< glossary >}}` | `<GlossaryTerm>` + `<Aside kind="definition">` / `<ChapterGlossary>` | ✅ | ~18 paired terms (3 referenced cross-chapter — see below). |
| 11 Practice Problems | `practice.mdx` | ✅ | decision 0001 §6. |

## Pedagogical decisions log

- **Authored 2 new equation entities for derived results.** `orbital-velocity`
  ($v_{orb}=\sqrt{GM/r}$) and `escape-velocity` ($v_{esc}=\sqrt{2GM/r}$) — the
  chapter's headline results, anchoring its two worked examples and forward-linked
  ($v_{esc}\to$ Schwarzschild, $v_{orb}\to$ rotation curves/dark matter). Both
  carry full biographies and are cited via `<KeyEquation>` (Anna's call).
- **Registry reuse matched physical *meaning*, not just symbols.** `kepler-third-law`
  is the $M$-only form, so Newton's $(M+m)$ generalization is shown inline; the
  registry's `gravitational-potential-energy` is the stellar self-binding form
  $\sim -GM^2/R$, *not* the two-body $U=-GMm/r$, so the latter stays inline.
- **Not `framing:"OMI"`** — a derivation/mechanism narrative, not an OMI spine.
- **Practice → `practice.mdx`**; the separate `-solutions.qmd` is an assessment
  concern and was not migrated.

## Surprises

1. **Cross-chapter definition uniqueness is a hard compile error.** "Schwarzschild
   radius" and "Event horizon" are already defined in `lecture-02-foundations`, and
   "Virial theorem" in `lecture-02-hydrostatic-equilibrium`. Re-defining them in L3
   produced an `@mdx-js/rollup` build failure ("Definition … defined in multiple
   chapters"). Definitions live in a **global registry** keyed by slug — a term is
   *defined* once and *referenced* anywhere. Fix: drop L3's duplicate Asides and
   unwrap those three `<GlossaryTerm>`s to plain text (the owning chapters keep the
   definitions).
2. **D4 is per-chapter, even for terms that have equation entities.** `orbital-velocity`
   and `escape-velocity` have equation-registry biographies, but D4 still required a
   same-chapter `<Aside kind="definition">` for each `<GlossaryTerm>` — the equation
   entity and the glossary definition are different systems. Added both.
3. **The sidebar is driven by the `units` collection, not the glob-discovered
   readings.** The reading renders fine without a unit JSON, but `ModuleNav` reads
   `src/content/units/*.json` — so L3 (and, it turned out, L1 Spoiler Alerts) were
   missing from the foundations sidebar. Fix: authored `lecture-01-spoiler-alerts.json`
   and `lecture-03-gravity-and-orbits.json`, and bumped `lecture-02-foundations.json`
   `order` 1→2 so the foundations nav reads L1→L2→L3. **Recommendation:** add "author
   the unit JSON manifest" as an explicit step-4 item in the migration runbook — it's
   easy to miss because the page builds without it.
4. **`scrollable-region-focusable` (#198) now reproduces at *desktop* on a wide
   table.** The Key Equations Summary table is wide enough (with display-math cells)
   to trip the theme's responsive-table `overflow-x:auto` wrapper, which lacks
   `tabindex`. nuclear-fusion's narrower tables stay clean. This is the tracked
   platform residual ([#198](https://github.com/drannarosen/sophie/issues/198)),
   not a chapter defect — content compacting did not clear it (platform CSS), so the
   faithful `\dfrac` table was kept.

## Verification

- `pnpm exec biome check src/content` → clean.
- `pnpm typecheck` (astro check) → **0 errors / 0 warnings / 0 hints**.
- `pnpm build` → **0 errors, 0 warnings** (22 benign infos); 7 pages.
- Browser (desktop 1280px): console = favicon 404 only; 10/10 figures load (0 broken);
  **394 KaTeX**; 2 `<WorkedExample>` (numerical + dim-check); no leaked MDX; no
  hydration errors. Sidebar lists all 6 lectures, foundations order L1→L2→L3.
- axe-core desktop light **+** dark: **1 node**, `scrollable-region-focusable` on the
  Key Equations Summary table — the tracked **#198** wide-table residual (platform
  table wrapper lacks `tabindex`), not a chapter defect.

## Platform issues to file

**None new.** #198 (`scrollable-region-focusable` on wide tables / KeyEquation math)
already tracked — this migration adds the data point that it reproduces at *desktop*
on sufficiently wide equation tables, strengthening the case for adding
`tabindex="0"` + `role="region"` + `aria-label` to the theme's responsive-table
wrapper.

## Success criteria

- ✅ Full reading migrated truthfully (Parts 1–6 + Synthesis + Quick Practice); Module 1 chain complete.
- ✅ 2 new equation entities (`orbital-velocity`, `escape-velocity`) with biographies, both cited; 4 reused matched by physical meaning.
- ✅ 10 figures registered + rendering (0 broken).
- ✅ 2 `<WorkedExample>` (with DimCheck — WE invariants clean); 7 `<Predict>`; 1 `<RetrievalPrompt>` (RET-1); 2 misconceptions + interventions; ~18 GlossaryTerms (D4/D5 clean; 3 referenced cross-chapter).
- ✅ Sidebar fixed: unit JSON manifests authored for L1 + L3, foundations order corrected (L1→L2→L3).
- ✅ `pnpm build` 0 errors / 0 warnings; `astro check` 0/0/0; Biome clean.
- ⚠️ axe desktop light + dark: 1 node, the tracked #198 wide-table residual — not a chapter defect.
- ⚠️ `practice.mdx` authored; emits the expected #189 unrouted-warning.
- ⬚ Not committed/PR'd — awaiting HITL sign-off.
