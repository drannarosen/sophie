# Hardening Sprint #2 Closeout — 2026-05-30

**Trigger:** Anna asked to continue the A+ arc by shipping the two
*deliberately-deferred* items from the
[A+ sprint closeout](2026-05-30-a-plus-sprint-closeout.md) (A+, 95) —
collaboratively (HITL) and time-boxed, with shipping ASTR 201 still the
binding constraint. Scope locked in-thread to **H3 (coverage ratchet) +
a GO'd H5a**; the expensive tail (H5b color-contrast token pass,
H3-full astro/lib direct tests, P4 schema depth) was explicitly left for
later. Two PRs landed (#234, #235); the grade moves to **A+ (98)**.

---

## 1. What changed

| Unit | Change | PR |
|---|---|---|
| **H3** | Propagated the self-enforcing `coverage.thresholds` floor (the gate `cli` already carried) to `core` / `components` / `theme` / `astro`, set ~1pt below measured. No CI YAML change — `vitest run --coverage` in the existing `unit` job exits non-zero below floor, so the threshold block *is* the ratchet. Convention documented in AGENTS.md (floors bump up, never down). `theme` omits the `functions` floor by design (token-data pkg, 1 function). | #234 |
| **H5a** | Removed the `list`/`listitem` axe-rule suppression from the shared smoke e2e helper. The suppression guarded a `<ul><astro-slot><li>` shape that **no longer exists** — commit `4737e03` / ADR 0027 made `<LearningObjectives>` render its list from props (data crosses the MDX boundary as props, not slotted children). Both rules now run live across ~30 chapter + course a11y specs. Pattern doc synced same-PR. | #235 |

## 2. Test & gate metrics (fresh, post-merge `c261732`)

| Metric | Value | vs. 05-30 (A+, 95) |
|---|---|---|
| Unit tests | **2,866** passed (theme 29 · core 586 · cli 33 · components 945 · astro 1,273), **0 fail**, 11/11 tasks | unchanged (config/helper only) |
| **Coverage gates** | **5/5 packages** gated (was 1/5 — `cli` only) | **+4 packages** (H3) |
| core floor / measured | 95/91/89/95 · 96.34/92.85/90.62/96.95 | NEW |
| components floor / measured | 82/76/73/83 · 83.13/77.67/74.45/84.70 | NEW |
| astro floor / measured | 89/79/92/91 · 90.01/80.68/93.79/92.22 | NEW |
| theme floor / measured | 87/99/–/91 · 88.88/100/–/92.30 (`functions` omitted) | NEW |
| Gate-bites check | core@99 statements → run fails as designed; reverted | verified |
| e2e | **184 passed / 2 skipped** with `list`/`listitem` **live** | rules un-suppressed (H5a) |
| Active axe disables | **1** (`color-contrast`, issue #152) | **2 → 1** (H5a) |
| biome / typecheck / lint:* | clean (incl. R11/R13/R14) | unchanged |

## 3. Quality grade

| Category | Score | Δ | Evidence |
|---|---|---|---|
| Test coverage | **19/20** | **+2** | The −2 "no CI coverage ratchet" closed: all 5 packages now carry self-enforcing `thresholds`; gate-bites verified. −1 remains: ~21 astro/lib utilities tested only transitively (**H3-full deferred**). |
| Schema/contract | 20/20 | — | (held) Zod single source; epistemic-role enforced + audit-consumed. |
| Accessibility | **19/20** | **+1** | One of two tracked axe disables removed — `list`/`listitem` now run live across all chapter + course specs (CI `e2e` green confirms zero violations). −1 remains: `color-contrast` disable (issue #152, **H5b deferred** as a design session). |
| Architecture | 20/20 | — | (held) innerHTML→1 chokepoint+R14; LOC warnings 0. |
| Build/distribution | 20/20 | — | (held) prerender doctrine doc; ADR 0091 defenses. |

**Overall: 98/100 → A+.** (+3 vs. 05-30.) Test **19** · Schema 20 · A11y
**19** · Architecture 20 · Build 20.

## 4. Backlog (deferred, and why)

**P1 is unchanged across seven audits: ship ASTR 201.** The items
below are the last ~2 grade-points and are *pure polish on already-A+
work*. None outranks shipping.

| P | Item | Rubric | Note |
|---|---|---|---|
| **P4** | **H3-full — direct astro/lib tests** | Test 19 → 20 | Write direct unit tests for the ~21 transitively-covered astro/lib utilities (notably `src/preferences/{disclosures,right-sidebar,sidebar}.ts` at 0%, `chapter-opener.ts` at 25%), then ratchet the astro floor up. Pure engineering — can land any time. |
| **P5** | **H5b — color-contrast token pass** | A11y 19 → 20 | The remaining axe disable. **LOW priority per Anna (2026-05-30): revisit only inside a future frontend-design hardening session, bundled with visual-polish — not standalone** (the tokens will change in that pass anyway, so doing it cold is wasted churn). Issue #152: 59 violations clustered by component family (systemic token violations). A 1–2 day *design* session (aesthetic is unlocked pre-launch). |
| **P5** | **P4 — schema depth** | Schema (depth) | Extract standalone role components into the index (RC1 per-chapter) + `uncertainty` authoring primitive. Already-20/20 Schema; pure depth. |

Closing H5b + H3-full would take 98 → ~100. Not this sprint.

## 5. Process note — VR Video-embed flake

PR #234's `visual-regression` check failed once on
`Components/Video › YouTube`/`Vimeo › smoke-test` (15s timeout on the
external embed; axe itself clean; the story ran 45.9s vs ~5s for the
rest). A config-only PR cannot change rendered output, so this was a
network-dependent flake, not a regression. Re-run passed clean; #234
merged. #235's VR passed first try. A standing pre-existing flake worth a
tracking issue if it recurs; not introduced by either PR.

## 6. What this audit examined

Fresh runs on merged `main` (`c261732`): full unit suite
(`turbo run test:unit --force`, 11/11, all thresholds clear); gate-bites
verification (core@99 → fail → revert); smoke e2e 184/2 with
`list`/`listitem` live; per-PR CI all 9 required checks green. This doc +
its README row land directly on `main` (dated review, per branch-scope
convention).

## Bottom line

The two deliberately-deferred items shipped clean: every package's test
suite now has a self-enforcing erosion gate (the ratchet — the one item
with value *independent of the grade*), and a stale axe suppression that
was silently weakening WCAG 1.3.1 coverage across ~30 specs is gone.
Engineering reaches **A+ (98)**. The last ~2 points (H5b color-contrast,
H3-full) are documented and **yield to shipping ASTR 201**, unchanged as
the binding tenure-case constraint.
