# A+ Hardening Sprint Closeout — 2026-05-30

**Trigger:** Anna asked to push engineering from **A (90)** to **A+ (95+)** with a
deliberate, time-boxed, collaboratively-scoped hardening sprint. Executed as
**Path B** (substance-to-95) of the
[A+ sprint plan](../plans/2026-05-29-a-plus-hardening-sprint.md): fix the two
*real* debts (the un-centralized innerHTML trust surface + the undocumented
prerender doctrine) and graduate the epistemic contract, rather than chase
cheaper grade-points.

**Relationship to prior audits:** Closes the
[post-domain-pass hardening audit](2026-05-29-post-domain-pass-hardening-audit.md)
(A, 90). Four units landed (B1 + PRs #231/#232/#233); the grade moves to
**A+ (95)**, driven by Architecture closing to 20 (both its standing caps
cleared) plus Schema and Build each closing to 20. All numbers from fresh runs
on `392cc6e`.

---

## 1. What changed (the sprint)

| Unit | Change | ADR / PR |
|---|---|---|
| **B1** | Prerender/globalThis runtime doctrine consolidated into one citable reference doc (the recurring "green-locally, broken-at-consumer-build" packaging-bug-class lesson); validation block + cross-links | reference doc / direct-to-`main` (`5460a55`, `2878e01`) |
| **H4** | The 4 `lint:loc`-warning files split into focused modules (`compound-expand` + `sophie-auto-imports` + `TextbookLayout.astro` serialization), pure behaviour-preserving moves | ADR 0061 / #231 |
| **S1** | Epistemic-role-**coverage** audit invariant (RC1/RC2): the build-time audit now *consumes* the declared role registry (`COMPONENT_EPISTEMIC_ROLES` + `ROLE_VIA_SLOT_ROLES`), joining chapter-keyed collections → roles | ADR 0058 R-audit-consumes-role / #232 |
| **H2** | All **28** `dangerouslySetInnerHTML` sites → one `BuildTimeHtml` chokepoint with a required, typed `trust` discriminator; **R14** lint forbids raw use elsewhere | ADR 0093 / #233 |

## 2. Test & gate metrics (fresh, `392cc6e`)

| Metric | Value | vs. 05-29 (A, 90) |
|---|---|---|
| Unit tests | **2,866** passed (theme 29 · core 586 · cli 33 · components 945 · astro 1,273), **0 fail** | +19 |
| e2e | **2** `test.skip` (intentional no-fixture: T46, ChapterMisconceptions T42) | unchanged |
| `lint:loc` | 0 err · **0 warn** · 42 info · 8 exempt | **4 → 0 warn** (H4) |
| `lint:epistemic-role` | 6 declare · 2 role-via-slot · 51 chrome · 0 grandfathered (59/59) | unchanged |
| `lint:axe-render` | 64/64 ✓ | +0 (BuildTimeHtml axe-tested, runtime-excluded) |
| **`lint:no-raw-inner-html` (R14)** | ✓ **1 sanctioned chokepoint** | **NEW gate** |
| biome (`packages/ scripts/`) | 945 files · 0 err / 0 warn | unchanged |
| typecheck | 11/11 | unchanged |
| `dangerouslySetInnerHTML` usages (prod) | **1** (`BuildTimeHtml.tsx`) | **28 → 1** (H2) |
| `as any` / `@ts-ignore` (prod) | **0** | unchanged (the one boundary cast is `as unknown as`, not `as any`) |
| `biome-ignore` (prod) | **9** | ~41 → 9 (H2 deleted ~27 per-site innerHTML ignores) |
| TODO | 1 (issue-linked) | unchanged |
| ADRs | **93** (0001–0093; 0050 reserved) | +1 (0093) |
| Smoke / packed-smoke e2e | 184 passed (H2 local verify); CI required-check green | — |

## 3. Quality grade

| Category | Score | Δ | Evidence |
|---|---|---|---|
| Test coverage | 17/20 | — | 2,866 unit, 4-layer, condition-based, axe-mandatory (R11 64/64). −2: still no CI coverage ratchet (**H3 deferred**); −1: ~21 astro/lib utilities tested only transitively. |
| Schema/contract correctness | **20/20** | **+1** | Zod single source; epistemic-role machine-enforced (R13), adjudicated (grandfathered → 0), **and now consumed by the audit** — RC1 (per-chapter evidenced roles) + RC2 (scope note) via the declared registry (ADR 0058 R-audit-consumes-role). 0 `as any`/`ts-ignore`. |
| Accessibility | 18/20 | — | axe 64/64 on render; BuildTimeHtml axe-clean for every `trust`. −2: 2 tracked axe disables (`color-contrast` in the Storybook runner; Grid list/listitem) — **H5 deferred**. |
| Architecture | **20/20** | **+3** | **Both standing caps cleared.** −2 innerHTML closed: 28 sites → 1 documented chokepoint + R14 structural enforcement (ADR 0093). −1 LOC closed: 0 `lint:loc` warnings (H4). Acyclic, framework-pure, paid-for factories; 9 justified `biome-ignore` (down from ~41). |
| Build/distribution | **20/20** | **+1** | The −1 (undocumented essential complexity) closed: the externalized-prerender `import.meta.env` + globalThis-singleton + virtual-module doctrine is now one citable reference doc (B1), cross-linked from ADRs 0022/0092 + coding-standards. ADR 0091 build-fragility defenses intact. |

**Overall: 95/100 → A+.** (+5 vs. 05-29.) Test 17 · Schema **20** · A11y 18 ·
Architecture **20** · Build **20**. The jump is Architecture closing fully
(innerHTML + LOC), plus Schema and Build each reaching 20. The two remaining
caps — Test (no ratchet) and A11y (2 axe disables) — are exactly the two items
**deliberately deferred** (H3, H5) to respect the time-box.

## 4. Backlog (what's deferred, and why)

**P1 is unchanged across six audits: ship ASTR 201.** The binding constraint for
the tenure case is the consumer repo + Anna's pedagogical calls, not engineering.
A+ is polish on already-A work; no item below outranks shipping.

| P | Item | Rubric | Note |
|---|---|---|---|
| **P3** | **H3 — CI coverage ratchet** + close the ~21 astro/lib transitive-coverage gap | Test 17 → 19–20 | Deferred from Path B. The 2,866-test investment has no erosion gate; `cli` already has `thresholds` as the seed to propagate. |
| **P3** | **H5 — close the 2 axe disables** (color-contrast + list/listitem) | A11y 18 → 20 | Deferred: design-iteration (token-contrast pass) is its own aesthetic session, the rabbit-hole the time-box guarded against. |
| **P4** | **S1 stretch — extract standalone role components** | Schema (depth) | RC2 logs that standalone `<Observable>`/`<Assumption>`/`<BreaksWhen>`/`<DerivationStep>` register per-chapter only inside extracted containers, and `uncertainty` has no authoring primitive. Closing either is the "full index-threaded" option (extractor change), explicitly out of this sprint. |

Doing H3 + H5 later would take 95 → ~99. Not this sprint.

## 5. What this audit examined

Fresh runs on `392cc6e`: full unit suite (`turbo run test:unit --force`);
`lint:loc` / `lint:epistemic-role` / `lint:axe-render` / **`lint:no-raw-inner-html`**;
`biome check`; `turbo run typecheck`; grep-based tech-debt counts
(`dangerouslySetInnerHTML`, `as any`/`ts-ignore`, `biome-ignore`, TODO, e2e
`test.skip`, axe disables); ADR count; H2 smoke/packed-smoke e2e (184 passed).
This doc + its README row land directly on `main` (dated review, per branch-scope
convention).

## Bottom line

Engineering reached **A+ (95)** — the deliberate, time-boxed, HITL-scoped sprint
closed both Architecture caps (innerHTML trust surface → one enforced chokepoint;
LOC warnings → 0), graduated the Reasoning-OS contract from declared-and-lint-gated
to **read-by-the-audit**, and consolidated the recurring packaging-bug-class
doctrine. Every unit shipped through the per-PR review + auto-merge model with all
9 required checks green; no regressions. **The binding constraint remains shipping
(ASTR 201), not engineering.** The two deferred items (H3 coverage ratchet, H5 a11y
contrast) are the documented path from 95 → ~99 when a future hardening session is
warranted.
