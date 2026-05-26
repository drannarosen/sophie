---
title: 'Pilot report: ASTR 201 Module 1 Lecture 4 — Light as Information'
short_title: 'Pilot: M1-L4 Light as Information'
description: 'Seventh ADR 0064 chapter migration and the Module 1 capstone — the largest source yet (1,251 lines, 18 figures, 9 equation includes). Reuses three L1-seeded entities, authors six new ones (including the Planck function), and uses OMIFlow as a Part-9 capstone without declaring chapter framing.'
authors:
  - name: Anna Rosen
date: 2026-05-26
---

## Pilot context

The **seventh** chapter migration under
[ADR 0064](../decisions/0064-chapter-migration-playbook.md), and the **Module 1
capstone**. It converts **ASTR 201 Module 1 Lecture 4 — "Light as Information"**
from Quarto `.qmd` into a Sophie MDX reading at
`src/content/sections/foundations/units/lecture-04-light-as-information/`,
completing the Foundations module (L1 Spoiler Alerts → L2 Tools of the Trade →
L3 Gravity & Orbits → **L4 Light as Information**).

**Structural profile.** The largest and most equation-rich source so far (1,251
lines, 18 figures, 9 equation includes, Parts 1–9). It is a physics-development
chapter — light, scattering, blackbody radiation, atoms, telescopes — ending in
an explicit Observable→Model→Inference synthesis.

Source `astr201-sp26/` was read-only. Scope: full reading (Parts 1–9 + Reference
Tables + Proportional Reasoning Practice), a sibling `practice.mdx` (14
problems), **6 new** equation entities + **3 reused**, 18 figures (15 new + 3
shared with M2-L2), 3 `<WorkedExample>`, 2 `<OMIFlow>`, 1 misconception +
intervention, ~14 GlossaryTerms. **No PR opened** — built + verified locally,
awaiting HITL sign-off.

## Equation registry: the L1 payoff

This chapter is where the entities seeded in L1 "Spoiler Alerts" get formally
developed:

| Entity | Status | Notes |
|---|---|---|
| `wave-relation`, `photon-energy` | reused (authored in L1) | L1 previewed them; L4 develops and cites them via `<KeyEquation>` |
| `wien-displacement` | reused (existing) | also cited by M2-L2 |
| `planck-function` | **new** | the chapter centerpiece; biography includes Rayleigh-Jeans + Wien-tail `<DerivationStep>`s |
| `bohr-energy` | **new** | hydrogen levels $E_n = -13.6\,\mathrm{eV}/n^2$ |
| `doppler-shift` | **new** | $\Delta\lambda/\lambda_0 = v_r/c$ |
| `rayleigh-scattering` | **new** | proportionality $\sigma \propto \lambda^{-4}$ — a non-equality tex, validated cleanly |
| `collecting-area`, `telescope-resolution` | **new** | telescope scalings |

`planck-function` was authored as a new entity (Anna's call) even though the
source has no `{{< include >}}` for it — it is the chapter's headline equation
and Module 2 builds on it. Stefan-Boltzmann is only *named* here (deferred to
Module 2), so it stays prose.

## Pedagogical decisions log

- **OMIFlow as a Part-9 capstone, not the chapter spine.** Two clean strict-3
  flows — color→Wien→temperature and line-pattern→Kirchhoff/atoms→composition —
  render as `<OMIFlow>`, alongside the source's 5-row summary table. **No
  `framing:"OMI"`** declared (the bulk of the chapter is physics development),
  which is allowed since OF-2 only requires OMIFlow *when* framing is declared.
- **Cross-chapter ownership respected up front.** A pre-conversion collision scan
  showed *Doppler effect*, *Photon*, *Spectroscopy* (L1) and *Wien's law*,
  *Effective temperature* (M2-L2) are already owned — so L4 references them as
  plain text and defines only its own ~14 terms (blackbody, spectral radiance,
  opacity, albedo, Rayleigh scattering, Bohr model, Kirchhoff's laws, the three
  spectrum types, collecting area, angular resolution, seeing, nanometer).
- **The many "Quick Check + Answers" and "Pause & Predict" blocks** became
  `<Callout variant="tip">` + collapsible `<Dropdown>` (math-bearing) and
  `<Predict>` with adjacent folded answers; conceptual recalls became
  `<RetrievalPrompt>`.
- **Practice → `practice.mdx`** (14 problems); glossary terms added per the
  standing instruction.

## Surprises

1. **The author-trap lint flags raw `<` even inside inline math.** `$<0.01$` (an
   EM-band table cell) and `$v_r<0$` both tripped it — despite the runbook citing
   `$<3{,}700$` as a "wrap in math" fix. The robust rule: avoid raw `<` before a
   digit *everywhere*, math or not — use words or `&lt;`. (`\ll`/`\gg` are fine.)
2. **Three figures were already owned by M2-L2** (`blackbody-stellar-spectra`,
   `betelgeuse-size`, `altair-spectrum-annotated`) — M1-L4 and M2-L2 share the
   blackbody/spectra figure set. Re-registering them produced a `figures.ts`
   duplicate-key error (biome `noDuplicateObjectKeys` + `ts(1117)`); fixed by
   deleting the L4 copies and referencing the shared entries by name. (A pre-add
   sharing check is worth running with exact-key grep, not a fuzzy one.)
3. **Clean desktop axe — no #198 this time.** Unlike L3's wide Key-Equations
   table, L4's reference tables use compact inline notation and fit the content
   column, so `scrollable-region-focusable` did not fire (0 violations, light +
   dark).
4. **Sidebar wired correctly on the first try** — having learned from L3, the
   `lecture-04-light-as-information.json` unit manifest was authored in the
   scaffold step, so L4 appeared in the foundations nav (order 4) immediately.

## Verification

- `pnpm exec biome check src/content` → clean.
- `pnpm typecheck` (astro check) → **0 / 0 / 0**.
- `pnpm build` → **0 errors, 0 warnings** (29 benign infos).
- Browser (desktop 1280px): console = favicon 404 only; 18/18 figures load (0 broken);
  **341 KaTeX**; 2 `<OMIFlow>` (2/2/2 slots); 3 `<WorkedExample>` (numerical + dim-check);
  no leaked MDX; no hydration errors. Sidebar lists all 7 lectures; foundations order L1→L2→L3→L4.
- axe-core desktop light **+** dark: **0 violations**.

## Platform issues to file

**None new.** (#198 wide-table residual did not reproduce here.)

## Success criteria

- ✅ Full reading migrated truthfully (Parts 1–9 + Reference Tables); Module 1 complete.
- ✅ 6 new equation entities (incl. `planck-function` with derivation-step limits and the `rayleigh-scattering` proportionality); 3 reused from L1/M2-L2; all cited.
- ✅ 18 figures rendering (0 broken); 3 shared with M2-L2, referenced not duplicated.
- ✅ 3 `<WorkedExample>` (DimCheck clean); 2 `<OMIFlow>` capstone (no framing); 3 `<RetrievalPrompt>`; 4 `<Predict>`; 1 misconception + intervention; ~14 GlossaryTerms (D4/D5 clean; 5 referenced cross-chapter).
- ✅ Sidebar: unit JSON manifest authored in scaffold step; foundations nav L1→L2→L3→L4.
- ✅ `pnpm build` 0/0; `astro check` 0/0/0; Biome clean; author-trap lint clean.
- ✅ axe desktop light + dark: **0 violations**.
- ⚠️ `practice.mdx` authored; emits the expected #189 unrouted-warning.
- ⬚ Not committed/PR'd — awaiting HITL sign-off.
