# act() Warnings — Hydration-Settle Test Helper (ITEM 4b / audit P4.2) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development). Also use superpowers:systematic-debugging (instrument before fixing) and superpowers:condition-based-waiting (wait on state signals, never timeouts). Single PR.

**Goal:** Eliminate the ~50 contention-only "An update to X was not wrapped in act(...)" warnings by settling `useInteractive` async hydration inside `act()` via one shared, condition-based test helper, plus targeted fixes for the two non-`useInteractive` outliers.

**Architecture:** ~96% of the warnings (Solution 30 + Hint 15 + DropdownBase + ReviewedRow) share one root cause — `useInteractive` flips `status: "loading" → "ready"` when its async IndexedDB hydration resolves, a setState that lands after the synchronous test body and (under full-`turbo` CPU contention) during teardown. Fix it structurally with a `settleHydration()` helper that waits on the real ready signal (`aria-busy="false"` + `data-sophie-write-pending="false"`) and flushes trailing updates inside `act()`. `ParameterSlider` + `BlackbodyExplorer` (no `useInteractive`) get targeted fixes.

**Tech Stack:** Vitest, `@testing-library/react` (`act`, `waitFor`), the `useInteractive`/`useHydrated` runtime hooks, the components test-setup (`packages/components/test-setup.ts`).

**Resolved decision (Anna, 2026-05-28):** Approach **A** — shared condition-based settle helper for the `useInteractive` class + targeted outlier fixes; **instrument first** (confirm the exact trailing setState) before applying.

**Key facts:**
- Sources: `Solution`, `Hint`, `Dropdown`, `SpacedReview` (share `useInteractive`); `interactive/ParameterSlider`, `figures/BlackbodyExplorer` (do not).
- Ready signal: `useInteractive` sets `aria-busy={status!=="ready"}` + `data-sophie-write-pending={writesPending>0}` (`useInteractive.ts:288-292`).
- Warnings reproduce ONLY under full `pnpm turbo run test:unit` (cross-package CPU contention), NOT when `@sophie/components` runs alone — so **every verification is a full-`turbo` run**.
- Some tests (e.g. `Solution.test.tsx`) ALREADY use `waitFor`/`findBy` yet still warn → the residual is a *trailing* update after the last awaited assertion.

---

## Phase 0: Re-measure + worktree

### Task 0.1: Confirm the current count on main
ITEM 1's `maxWorkers:"50%"` caps may have changed the count. Run:
```bash
git checkout main && git pull
pnpm exec turbo run test:unit --force 2>&1 | tee /tmp/4b-baseline.log | grep -c "not wrapped in act"
grep -oE "An update to [A-Za-z]+" /tmp/4b-baseline.log | sort | uniq -c | sort -rn
```
Record the baseline count + per-source breakdown. If it's already ~0, STOP and report (the caps may have fixed it). Otherwise continue.

### Task 0.2: Worktree
`git worktree add .worktrees/feat-act-warnings -b feat/act-warnings` (superpowers:using-git-worktrees); `pnpm install --frozen-lockfile`.

---

## Phase 1: Instrument to confirm the exact trailing update (systematic-debugging)

### Task 1.1: Pinpoint the unwrapped setState
The warning names the component but not the line. Temporarily patch React's console.error or add a stack trace to one reproduction:
```bash
# Run ONLY the components suite but force contention by also running a sibling
# package concurrently, OR run the full turbo and isolate Solution output.
```
Inspect the stack to confirm whether the trailing update is (a) the hydration `setStatus("ready")` / `setLocalValue` from the IDB read, (b) the `writesPending` counter decrement after a write-back, or (c) a BroadcastChannel echo. **Write the finding into the PR description.** This determines whether the helper needs a write-pending flush in addition to the hydration wait. Do NOT guess — observe.

---

## Phase 2: The shared settle helper

### Task 2.1: `settleHydration()`
**Files:**
- Create: `packages/components/src/test-utils/settle-hydration.ts`
- Test: `packages/components/src/test-utils/settle-hydration.test.tsx`

**Candidate implementation** (refine per the Phase 1 finding):
```ts
import { act, waitFor } from "@testing-library/react";

/**
 * Settle `useInteractive` async hydration + write-back inside act() so
 * trailing setState calls don't escape into test teardown — the
 * contention-only "not wrapped in act(...)" warning class (ITEM 4b /
 * audit P4.2). Condition-based: waits on the real ready signal
 * (`aria-busy="false"` + no `data-sophie-write-pending`), then flushes
 * any trailing microtask/effect tick inside act(). Call after render()
 * (and after the last interaction) in useInteractive-backed tests.
 */
export async function settleHydration(root: ParentNode = document): Promise<void> {
  await waitFor(() => {
    const busy = root.querySelector('[aria-busy="true"]');
    const writing = root.querySelector('[data-sophie-write-pending="true"]');
    if (busy || writing) throw new Error("still hydrating / write pending");
  });
  // Flush trailing updates (e.g. post-hydration effect tick) inside act.
  await act(async () => {});
}
```
**Step 1 — failing test:** render a `useInteractive`-backed fixture; assert that WITHOUT `settleHydration` a trailing update is pending, and WITH it the component is settled (no pending). (If a deterministic warning-trigger is hard to assert in isolation, assert the ready signal is reached + no act warning is emitted via a `console.error` spy.)
**Step 2-4:** implement, pass.
**Step 5:** commit `test(components): settleHydration helper for useInteractive tests`.

> The helper lives in `test-utils/` (new dir); exclude it from coverage + R11 (it's test infra, not a component) — confirm `lint:axe-render` + coverage still pass (its exclusions list `_helpers/**`/`__mocks__/**`; add `test-utils/**` if needed, with rationale).

---

## Phase 3: Adopt the helper in the 4 `useInteractive` tests

One task each — `Solution`, `Hint`, `Dropdown`, `SpacedReview` (`ReviewedRow`):
- Add `await settleHydration()` after render (and after the final interaction) in the tests that render the hydrating component.
- **Verify per component via the FULL turbo run** (warnings only reproduce under contention):
  ```bash
  pnpm exec turbo run test:unit --force 2>&1 | grep -c "An update to <Component>"
  ```
  Expected: that component's count → 0.
- Commit per component: `test(components): settle <X> hydration (act-warning fix)`.

---

## Phase 4: Targeted outlier fixes

### Task 4.1: `ParameterSlider`
Instrument (Phase 1 technique) to find its async update (no `useInteractive`; likely a `useEffect`/store subscription). Fix by awaiting its settled state condition-based; verify via full turbo run. Commit.

### Task 4.2: `BlackbodyExplorer`
Same — its `useEffect` (Observable Plot mount / parameter store) fires a trailing update. Wrap/await the settle; verify; commit.

---

## Phase 5: Verify zero + gate + PR

### Task 5.1: Full-suite zero
```bash
pnpm exec turbo run test:unit --force 2>&1 | grep -c "not wrapped in act"   # expect 0
```
### Task 5.2: Full gate
biome 0-warn · typecheck 11/11 · `turbo run test:unit` green + 0 RolldownError + **0 act warnings** · `pnpm lint:axe-render` · `pnpm lint:loc` · MyST 0 ⚠ (no docs touched, but run if any). Open PR; explicit merge confirmation.

---

## Success criteria
- `pnpm turbo run test:unit` emits **0** "not wrapped in act" warnings (down from the Phase 0 baseline), verified under contention.
- One shared `settleHydration()` helper covers the `useInteractive` class (Solution/Hint/Dropdown/SpacedReview); the 2 outliers fixed targeted.
- No timeouts introduced (condition-based only); all suites still green; 0 RolldownError.
- Phase 1 root-cause finding recorded in the PR description.

## Non-goals
- Changing `useInteractive`/`useHydrated` production behavior (the async hydration is deliberate — ADRs 0029/0038/0083/0084).
- A global `afterEach` flush (rejected: blunt, masks real async bugs).
- Touching the runtime-dynamic figure rendering itself.

## Conventions
pnpm + turbo; verify under FULL turbo contention (warnings are contention-only); biome 0-warn; condition-based waiting (no timeouts); never `rm -rf` for any scratch fixture; ADR 0055 branch+PR+squash; explicit per-merge confirmation; read AGENTS.md first.

## Sequencing note
Independent of ITEM 2/5 (touches test files + a new test-utils helper, not component source or schemas). Can run any time, but if run alongside ITEM 2's `@sophie/components` refactor, rebase to avoid touching the same test files concurrently.
