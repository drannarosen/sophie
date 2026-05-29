# Post-ITEM-5 Quality Audit — 2026-05-29

**Trigger:** `/reviewing-project-quality` after PR #225 (ADR 0058 graduation — epistemic-role enforcement) merged to `main` (`d114e2b`).

**Relationship to the prior audit:** This is the delta-refresh of [`2026-05-28-post-item2-audit-and-leverage.md`](2026-05-28-post-item2-audit-and-leverage.md) (A−, 86). ITEM 5 is purely additive (a lint gate + docs), so that audit's deep architecture/test/strategic analysis still holds — this one refreshes the hard metrics and folds in the ITEM-5 delta. All numbers from fresh runs on `d114e2b`.

---

## 1. What changed since 2026-05-28

| Change | Detail | ADR |
|---|---|---|
| Epistemic-role enforcement | `scripts/lint-epistemic-role.ts` CI gate — new pedagogy components must declare `epistemicRole` (canonical const), bind per-slot, or be allowlisted with a rationale | 0058 (R-graduation) |
| Classification seeded | 5 auto-detected declarers · 1 role-via-slot (OMIFlow) · 39 chrome · 14 grandfathered (tracked, designed to shrink) | — |
| Standing rule | R13 added to AGENTS.md; CI `lint` job runs the gate after `lint:axe-render` | — |

**Effect:** the Reasoning-OS contract is now **structurally enforced**, not merely conventional — the single gap the prior audit's Architecture/contract score implicitly carried. The lint-gate suite is now **5 scripts** (axe-render, docs-drift, epistemic-role, shims, status).

## 2. Test & gate metrics (fresh, `d114e2b`)

| Metric | Value |
|---|---|
| Unit tests | **2,818** passed (theme 29 · core 573 · cli 33 · components 937 · astro 1246), 289 files, **0 fail / 0 RolldownError** |
| e2e specs | smoke 41 · packed-smoke 4 (CI authoritative; all green on #225) |
| Source LOC | core 4,536 · components 14,501 · astro 22,228 · theme 480 · cli 586 |
| ADRs | 90 |
| `lint:epistemic-role` | **exit 0 — 59/59** (5 declare · 1 slot · 39 chrome · 14 grandfathered · 4 infra skipped) |
| `lint:axe-render` | 64/64 ✓ |
| `lint:loc` | 0 err · 4 warn · 36 info · 8 exempt |
| biome (`packages/ scripts/ docs/`) | 0 errors / 0 warnings |
| typecheck | 11/11 |
| MyST content (`grep -c ⚠`) | 0 |
| Tech-debt | 1 TODO (issue-linked) · 5 `test.skip` (documented, unit-covered) · 41 `biome-ignore` (all justified) · ~2 axe `disableRules` (tracked: color-contrast, list/listitem) · **0** `@ts-ignore`/`as any` |

## 3. Quality grade

| Category | Score | Δ | Evidence |
|---|---|---|---|
| Test coverage | 17/20 | — | 4-layer, condition-based, zero anti-patterns, axe mandatory (R11). Still: no CI coverage ratchet; 21 astro/lib utilities tested transitively. |
| Schema/contract correctness | **19/20** | **+1** | Zod single source; **epistemic-role now machine-enforced for new components** (ITEM 5) on top of the production audit invariants; 0 `ts-ignore`/`as any`. The eight-role vocabulary is now a CI gate, not a convention. |
| Accessibility | 18/20 | — | axe 64/64; `label` strict (ITEM 2); SRE speech across build-time math. −2: 2 tracked `disableRules` still open. |
| Architecture | 17/20 | — | Acyclic, framework-pure; paid-for factories; 41 justified `biome-ignore`. −2: `dangerouslySetInnerHTML` saturation; −1: `compound-expand.ts` (638) splittable. |
| Build/distribution | 16/20 | — | Essential complexity, deeply documented; `packed-smoke` the structural defense. −4: manual tsup-entry map (recurring bug source; dynamic-discovery backlog). |

**Overall: 87/100 → A−.** (+1 vs the 05-28 audit, from the contract now being enforced.) Engineering is strong and stable.

## 4. Backlog (P1–P5)

| P | Item | Repo | Effort | Why |
|---|---|---|---|---|
| **P1** | **Ship ASTR 201**: retrofit 21 `<Dropdown>` → formative components + GitHub Pages deploy → live student-facing site | `astr201` (consumer) | Medium | Unchanged top tenure-leverage move; teaching-effectiveness evidence needs students *using* it. Needs Anna's pedagogical calls. |
| **P2** | **Epistemic domain pass**: adjudicate the 14 grandfathered (formative family, Rep*, KeyEquation, CommonMisuse) → role or confirmed-chrome; shrink `GRANDFATHERED` toward empty | platform | Low–Med | The natural ITEM-5 follow-up; each resolution is a 1-line allowlist deletion + a declaration. Anna-adjudicated. |
| **P2** | Dynamic tsup-entry discovery for `.astro`→`lib` imports | platform | 2–4h | Eliminates the recurring "missing dist entry" bug class (bit 3× in ITEM 2 / course-info). |
| **P3** | Split `compound-expand.ts` → 3 path files | platform | 2–3h | Clears 1 of 4 LOC warnings; ADR 0061 Rule 1. |
| **P3** | Resolve the 3 `await-children` e2e skips via a hydration-complete signal | platform | medium | Stops "Astro slot boundary ⇒ skip e2e" becoming a pattern. |
| **P4** | Build-time HTML prerender sink; astro/lib coverage threshold; close the 2 tracked axe disables; doc the Astro/Vite globalThis pattern | platform | exploratory | Future-proofing signals, not defects. |

## 5. Files changed (ITEM 5 / #225)

`scripts/lint-epistemic-role.ts` (new gate) · `package.json` (+`lint:epistemic-role`) · `.github/workflows/ci.yml` (+lint step) · `docs/website/decisions/0058-epistemic-component-contract.md` (R-graduation revision) · `AGENTS.md` (R13) · `docs/website/status/validation.md` (regen). This audit adds itself + a README row directly on `main` (dated review, per branch-scope convention).

## Bottom line

Engineering held A− and ticked up to 87 as ITEM 5 made the Reasoning-OS contract enforceable. **The binding constraint is unchanged from the 05-28 audit: shipping.** The highest-leverage move remains getting ASTR 201 live (consumer-repo work + your pedagogical calls); the epistemic domain pass is the cheap, thesis-central platform follow-up. No engineering regressions; no new blockers.
