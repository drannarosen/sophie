# Post-hardening audit — Phase 1 sprint closeout

**Date**: 2026-05-10
**Trigger**: Phase 1 hardening sprint closed (PRs #17–#23 merged); Anna asked for a refreshed grade.
**Methodology**: Re-ran the metric commands from the baseline audit, verified every P1 fix is present via `file:line`-precise grep checks, then re-scored the five rubric categories with evidence.
**Verdict**: **B+ (84/100)** — up from B− (73/100) at the [baseline audit](2026-05-10-phase-1-hardening-audit.md). Eleven-point lift driven primarily by accessibility (+4) and architecture (+3); design system (+3) and test coverage (+1) also improved.

---

## What changed since the baseline

Seven PRs landed between the audit (PR #16) and now:

| PR | Item | Effect |
|---|---|---|
| #17 | P1-2 + P1-3 + P1-4 CSS bundle | New `--sophie-shadow-card` token, 5 broken token refs fixed (audit found 4; PR caught a 5th), `:focus-visible` on 5 control types, new e2e keyboard-focus spec |
| #18 | P1-1 InteractiveCallout title fix | DOM divergence from static Callout closed; 2 new unit tests |
| #19 | P1-6 Predict disabled pattern | Spread-then-override fragility eliminated; explicit `aria-busy` + `disabled` |
| #20 | P1-8 Chapter-components doc | New `docs/website/reference/chapter-components.md`; static-vs-interactive boundary documented |
| #21 | P1-7 Focus management after RevealGate | Click moves focus into revealed content (WCAG 2.4.3); `userTriggeredRef` distinguishes click from IDB hydration restore; 1 new unit test |
| #22 | ADR 0029 proposal | Last-write-wins design documented + reviewed |
| #23 | P1-5 BroadcastChannel LWW implementation | `StoredValue<T> = { value, ts }` cascaded through `ResponseStore` / `BroadcastMessage` / `useInteractive`; `DB_VERSION = 2` clean-break upgrade; ADR 0029 accepted; 1 new unit test |

All 7 PRs landed CI-green on first push (6 required checks each).

---

## Test metrics (fresh runs, post-merge)

| Layer | Baseline | Now | Δ |
|---|---|---|---|
| `@sophie/components` unit | 102 | 106 | +4 |
| `@sophie/astro` unit | 6 | 6 | — |
| `@sophie/core` unit | 15 | 15 | — |
| **Total unit + integration** | **123** | **127** | **+4** |
| `examples/smoke` e2e specs | 24 (in 7 files) | 26 (in 8 files) | +2 (+1 file: `keyboard-focus.spec.ts`) |
| Storybook test-runner stories | 45 axe-clean | 45 axe-clean | — |
| ADRs | 29 | 30 | +1 (ADR 0029) |
| Component dirs | 12 | 12 | — |

**E2E coverage by component family**, post-sprint:

| Spec | Tests | Notes |
|---|---|---|
| `collapsible-card.spec.ts` | 3 | Updated IDB assertion to `{ value, ts }` shape |
| `key-equation.spec.ts` | 4 | Unchanged |
| `keyboard-focus.spec.ts` | **2** | **New** — CSS-bundle assertion + Tab traversal |
| `learning-objectives.spec.ts` | 3 | Updated IDB assertion |
| `mini-glossary.spec.ts` | 5 | Unchanged |
| `predict.spec.ts` | 3 | Updated IDB assertion |
| `proving-chapter.spec.ts` | 3 | Updated IDB assertion + table count was 9→8 in Trio 3 |
| `self-assessment.spec.ts` | 3 | Updated IDB assertion |

E2E gaps that persist from the baseline: no dedicated isolated specs for static Callout, InteractiveCallout, Figure, InteractiveCheckbox, ConfidenceCheck, ComprehensionGate, EffortLog, Reflection. Most are covered indirectly via `self-assessment.spec.ts` or `proving-chapter.spec.ts`, but isolated specs would surface keyboard / focus regressions earlier.

---

## Quality grades (re-scored)

| Category | Baseline | Now | Δ | Evidence |
|---|---|---|---|---|
| Test coverage | 15/20 | **16/20** | +1 | +4 unit, +2 e2e (`keyboard-focus.spec.ts`), 5 e2e specs gained `.ts > 0` invariant assertions as free LWW checks. Gaps that persist: no edge-case tests, no genuine dual-tab Playwright, no composition tests, no error-state tests. |
| Design system | 14/20 | **17/20** | +3 | Zero hardcoded `#0f1115` (was 2); zero broken token refs (was 4 — actually 5; PR #17 caught a 5th); new `--sophie-shadow-card` token is scheme-aware. 5 hex fallbacks in nested `var()` chains remain (P2-4); `sa-` namespace still shared across 4 self-assessment components (P2-8). |
| Domain correctness | 18/20 | **18/20** | — | No domain-correctness work in this sprint. No regression. |
| Accessibility | 12/20 | **16/20** | +4 | `:focus-visible` on 5 control types (P1-4) closes WCAG 2.4.7. Focus management on Predict's RevealGate (P1-7) closes WCAG 2.4.3 with `userTriggeredRef` gate that avoids yanking focus on hydration restore. E2E `keyboard-focus.spec.ts` hardens against regression. Persisting gaps: live-region announcements for hydration completion (P2-2, WCAG 4.1.3), Escape-to-close on CollapsibleCard (P2-3, ARIA APG), `prefers-contrast` support (P3-5), arrow-key nav on radio groups (P3-4), status announcements for async writes (P2-5). |
| Architecture | 14/20 | **17/20** | +3 | BroadcastChannel race closed (P1-5 + ADR 0029) — silent data-loss path eliminated; `useInteractive` tracks `tsRef` and gates incoming writes; pre-launch no-back-compat directive applied as `DB_VERSION = 2` clean-break. Predict's fragile spread-then-override pattern eliminated (P1-6). InteractiveCallout DOM divergence from static Callout fixed (P1-1). Sophie's ADR discipline strengthened: 0029 went through proposal + accept + implement. Persisting gaps: `audit()` still stubbed in all 12 contracts (P2-1), `ProfileProvider` context still unreachable from MDX islands (P2-6), naming inconsistency (P2-7). |
| **Total** | **73/100** | **84/100** | **+11** | **B− → B+** |

Grade band cutoffs: 85–89 = A−, 80–84 = B+, 75–79 = B. 84/100 is **just inside B+**, one point shy of A−. Closing the remaining accessibility P2s (live regions + Escape-to-close) plus implementing the `audit()` invariants would likely push past 85 → A−.

---

## What's working (regression-prevention checklist)

Spot-verified by grep against `file:line` to confirm the P1 sprint didn't leave gaps:

| Fix | Verification |
|---|---|
| InteractiveCallout title guard | `Callout.tsx:50` shows `{title !== undefined && <p ...>}` |
| `#0f1115` removed from box-shadows | `grep -c "0f1115" packages/components/src/components/*/*.module.css` = 0 across all files |
| Broken token refs removed | `grep` for `--color-text-muted`, `--color-accent`, `--color-surface-alt`, `--color-text-strong` returns 0 matches in `.module.css` files |
| `:focus-visible` on 5 control types | Present in ComprehensionGate, ConfidenceCheck, EffortLog, InteractiveCheckbox, LearningObjectives `.module.css` |
| `BroadcastMessage.ts` field | Present in `BroadcastChannel.ts:14` |
| Predict reveal button spread eliminated | `Predict.tsx:184–187` shows explicit `aria-busy={controlProps["aria-busy"]}` + `disabled={gatedDisabled}` with no spread (the textarea PromptRow still spreads, correctly) |
| Predict focus-management refs | 9 occurrences of `userTriggeredRef`/`contentRef` in `Predict.tsx` |
| Chapter-components doc exists | `docs/website/reference/chapter-components.md` present, linked from `myst.yml` Reference TOC and CLAUDE.md "where things live" |
| ADR 0029 accepted | Frontmatter `status: accepted` |

Every P1 finding from the baseline audit is closed, and the regression surfaces (e2e keyboard-focus assertions, LWW unit test, `.ts > 0` e2e assertions) are in place.

---

## P2 / P3 backlog (carried forward from baseline, unchanged unless noted)

### P2 — important; next sprint or fold into Trio 4 component work

- **P2-1**: Implement `audit()` for the 12 contracts that have non-trivial invariants (Callout's no-nested-Callouts; LearningObjectives' unique objective ids; Predict's unique prompt ids; ConfidenceCheck's `scale ∈ {5, 7}`; MiniGlossary's slug-collision warning). All 12 still return `[]`.
- **P2-2**: Live-region announcements for hydration completion (WCAG 4.1.3). Zero `role="status"` or `aria-live` in any component.
- **P2-3**: Escape-to-close on CollapsibleCard (ARIA APG disclosure pattern). Radix doesn't bind it; zero `onKeyDown` in `CollapsibleCard.tsx`.
- **P2-4**: 5 remaining hex fallbacks in nested `var()` chains (ComprehensionGate, ConfidenceCheck, EffortLog, Predict, Reflection). 6 → 5 since PR #17's broken-token-ref fix removed LearningObjectives' fallback as a side effect.
- **P2-5**: `useInteractive.status` UI exposure ("Saving…" / "Saved" affordance). Hook returns it; no component renders it.
- **P2-6**: `ProfileProvider` context unreachable from MDX islands. Currently silently falls back to `"student"`; works for Phase 0 but breaks Phase 5's profile-toggle plans.
- **P2-7**: Naming inconsistency — `title` vs `heading` vs `prompt` across the schema layer.
- **P2-8**: `sa-` token namespace shared across 4 self-assessment components (ComprehensionGate, ConfidenceCheck, EffortLog, Reflection). Overriding one would affect all four.
- **P2-9**: Edge-case unit tests (long input, 50 items, special characters in ids, schema rejection paths).

### P3 — polish

- **P3-1**: `:target` pulse on CollapsibleCard + Figure (KeyEquation + MiniGlossary already have it).
- **P3-2**: Flatten three-level `var()` fallbacks once P1-3 + P2-4 land.
- **P3-3**: Register `jest-axe` custom matcher (`toHaveNoViolations`).
- **P3-4**: Arrow-key nav on radio groups (ComprehensionGate, ConfidenceCheck, EffortLog).
- **P3-5**: `prefers-contrast: more` support — zero components opt in.
- **P3-6**: Second chapter in smoke for per-chapter isolation + cross-chapter navigation testing.

### New observations (not in baseline)

- **N-1**: The LWW unit test exercises the receiver path with a same-process BroadcastChannel post. A genuine **two-browser-context Playwright test** belongs in P2, called out in ADR 0029's "Triggers" section.
- **N-2**: The new `keyboard-focus.spec.ts` validates CSS-bundle presence + Tab traversal. A future regression to add **per-component focus-style stories in Storybook** (one story per state showing the rendered focus ring) would add visual confirmation without depending on visual regression infrastructure (deferred per ADR 0028).

---

## Trajectory

Phase 1 → Phase 1-hardened in seven PRs over one session. The hardening sprint operated under three governing principles, all visible in the resulting code:

1. **One PR per substantive item, mirroring the Trio cadence.** Eight P1 items collapsed to seven PRs (CSS bundle merged P1-2/3/4 because they're mechanically similar). Each PR independently revertible.
2. **TDD discipline strict.** Each behavior-changing PR included a failing test verified RED before the fix. The Predict focus PR's `expected false to be true` failure was the exact witness that focus stayed on the button — the test described the bug before the fix.
3. **Anna's pre-launch no-back-compat directive** (saved as memory mid-flight) shortened the BroadcastChannel implementation by removing the legacy-unwrap migration code. The `DB_VERSION = 1 → 2` upgrade is three lines.

Closing the remaining accessibility P2s and implementing `audit()` would push the grade past 85 → A−. The architecture and design-system axes are already in the A range individually.

---

## References

- [Baseline audit](2026-05-10-phase-1-hardening-audit.md) — pre-sprint state (B−).
- [ADR 0029](../website/decisions/0029-broadcast-channel-last-write-wins.md) — accepted in PR #23.
- PRs #17 / #18 / #19 / #20 / #21 / #22 / #23 — the sprint sequence on the `main` branch.
- [Chapter components reference](../website/reference/chapter-components.md) — new authoring guide (P1-8).
- Project memory: [feedback_no_backcompat_prelaunch.md](../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md) — directive saved mid-sprint (path is out-of-tree; lives in `~/.claude/`).
