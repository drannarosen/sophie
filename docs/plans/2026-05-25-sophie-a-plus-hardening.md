# Sophie A+ Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Each task block follows TDD: write the failing test → verify it fails → implement → verify it passes → commit. Use @superpowers:test-driven-development on every task. Use @superpowers:verification-before-completion before marking any task complete.

**Goal:** Take Sophie from A− / 87 of 100 to A+ / 95+ of 100 by closing the audit's must-fix + should-fix items across 5 phases. Each phase is one squash-merge PR (ADR 0055).

**Architecture:** Five phases, ordered by dependency. Phase A (documentation hygiene) unblocks Phase C (structural gate hardening, which cites the new ADRs). Phase B (SoTA test-pattern backfill) is independent and pays the largest grade dividend. Phase D (design hot-spot) and Phase E (tech-debt pay-down) are independent and lowest-priority. The plan assumes the engineer has zero context — every file path, command, and expected output is spelled out.

**Tech Stack:** TypeScript 6.0, pnpm 11, Turborepo 2.9, Astro 6, MDX, React 19, Zod, Vitest, Playwright 1.56, Biome 2.4, axe-core, MyST.

**Source audit:** [`docs/reviews/2026-05-25-sophie-sota-audit.md`](../reviews/2026-05-25-sophie-sota-audit.md). Read it before starting any task — every claim in this plan is anchored there.

---

## Phase 0 — Setup (one-time, 5 min)

### Task 0.1: Create worktree + working branch for Phase A

**Files:**
- Create branch: `feat/a-plus-phase-a-adr-hygiene`
- Worktree location: `../sophie-a-plus-phase-a/` (sibling to the main repo)

**Step 1: Verify clean main**

Run: `git status && git log -1 --oneline`
Expected: `nothing to commit, working tree clean` on `main` at `02f287a docs(reviews): add post-#177 SoTA audit (A− / 87)`.

**Step 2: Create the worktree**

Use @superpowers:using-git-worktrees.

Run: `git worktree add ../sophie-a-plus-phase-a -b feat/a-plus-phase-a-adr-hygiene`
Expected: `Preparing worktree (new branch 'feat/a-plus-phase-a-adr-hygiene') HEAD is now at 02f287a docs(reviews): ...`

**Step 3: cd into the worktree**

Run: `cd ../sophie-a-plus-phase-a && pnpm install --frozen-lockfile`
Expected: `Lockfile is up to date, resolution step is skipped` then dependencies installed in ~30s.

**No test, no commit — setup only. Subsequent tasks happen inside the worktree.**

---

## Phase A — ADR & documentation hygiene (5 must-fix + 2 nice-to-have)

**PR target:** `feat(docs): close ADR drift surface — CL1 + packed-smoke + _template ADRs + evidence backfill`. **Estimated tasks:** 8. **Estimated effort:** half a day. **Risk:** low (docs-only).

### Task A.1: Fix stale comment in scripts/loc-budget.ts

**Files:**
- Modify: `scripts/loc-budget.ts:80-82` (the comment about `accumulator.ts` LOC tier)

**Step 1: Read the current comment**

Run: `grep -n "between WARNING" scripts/loc-budget.ts`
Expected: one match around line 80-82 saying `accumulator.ts itself sits between WARNING (500) and ERROR (800).`

**Step 2: Verify accumulator.ts is now above ERROR**

Run: `wc -l packages/astro/src/lib/pedagogy-index/accumulator.ts`
Expected: `907 packages/astro/src/lib/pedagogy-index/accumulator.ts` (or similar; >800 = above ERROR).

**Step 3: Update the comment**

Use Edit:
- old_string: `// accumulator.ts itself sits between WARNING (500) and ERROR (800).`
- new_string: `// accumulator.ts itself is currently above ERROR (>800 LOC).`

Plus the next two lines as needed to keep the sentence coherent — read the surrounding 5 lines first.

**Step 4: Verify the script still runs**

Run: `pnpm lint:loc`
Expected: same output as before the edit (the change is a comment only).

**Step 5: Commit**

```bash
git add scripts/loc-budget.ts
git commit -m "docs(loc-budget): correct stale comment on accumulator.ts LOC tier"
```

### Task A.2: Update ADR 0038 evidence path

**Files:**
- Modify: `docs/website/decisions/0038-pedagogy-index-pattern.md` (evidence block)

**Step 1: Locate the stale path**

Run: `grep -n "pedagogy-index-extractor" docs/website/decisions/0038-pedagogy-index-pattern.md`
Expected: one or more matches naming the old single-file path.

**Step 2: Verify the new structure**

Run: `ls packages/astro/src/lib/pedagogy-index/`
Expected: directory listing showing `accumulator.ts`, `extractors/`, etc.

**Step 3: Update the path**

Use Edit to replace `packages/astro/src/lib/pedagogy-index-extractor.ts` with `packages/astro/src/lib/pedagogy-index/` (directory reference). Read the surrounding context so the prose still reads naturally.

**Step 4: Build the MyST docs to verify no broken anchors**

Run: `cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"`
Expected: `0` (zero MyST content warnings per AGENTS.md "MyST build verification" rule).

**Step 5: Commit**

```bash
git add docs/website/decisions/0038-pedagogy-index-pattern.md
git commit -m "docs(adr-0038): refresh evidence path post pedagogy-index/ directory refactor"
```

### Task A.3: Write ADR 0083 — CL1 client:* directive invariant

**Files:**
- Create: `docs/website/decisions/0083-cl1-client-directive-invariant.md`
- Reference: existing ADR `docs/website/decisions/0038-pedagogy-index-pattern.md` (parent)
- Reference: `packages/astro/src/lib/pedagogy-audit/invariants/inline-refs.ts` (the CL1 source)
- Reference: PR #174

**Step 1: Read sibling ADR for structure**

Read [`docs/website/decisions/0082-chapter-layout-extraction.md`](../website/decisions/0082-chapter-layout-extraction.md) end-to-end. That's the most-recent ADR; it sets the current ADR shape (frontmatter, status block, evidence block, decision body, consequences).

**Step 2: Write the new ADR**

Use Write. Frontmatter must include:
- `title: CL1 client:* directive invariant for store-backed components`
- `status: validated` (the invariant ships in PR #174)
- `lifecycle: shipped`
- `validation:` block with `kind: audit, kind: test`

Body sections required (mirror 0082's outline):
- Context — the React #418 hydration mismatch class; ADR 0038 Amendment 2's `useHydrated`-gate convention
- Decision — every store-backed component must carry a `client:*` directive; CL1 enforces this at build time
- Consequences — false negatives if extractor misses a wrapper component; mitigation
- Evidence — file:line citation to `inline-refs.ts:CL1`; reference to PR #174 squash commit
- See also — [[ADR 0038]], [[ADR 0082]], [[ADR 0061]] (cross-link via MyST anchor syntax per AGENTS.md R6)

**Step 3: Regenerate the validation dashboard**

Run: `pnpm tsx scripts/regenerate-validation-index.mts`
Expected: `docs/website/status/validation.md` regenerated with ADR 0083 row.

**Step 4: Verify MyST build**

Run: `cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"`
Expected: `0`.

**Step 5: Commit**

```bash
git add docs/website/decisions/0083-cl1-client-directive-invariant.md docs/website/status/validation.md
git commit -m "docs(adr-0083): promote CL1 client:* invariant to its own ADR"
```

### Task A.4: Write ADR 0084 — packed-smoke CI gate

**Files:**
- Create: `docs/website/decisions/0084-packed-smoke-ci-gate.md`
- Reference: `.github/workflows/ci.yml:315-370` (the packed-smoke job)
- Reference: `examples/packed-smoke/scripts/sync-packed.sh`
- Reference: PR #176 (PR-D1)

**Step 1: Read the workflow job**

Read [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) lines 315–370. Note the rationale comment at line 319–326 — that prose is the seed for the ADR's context section.

**Step 2: Write the ADR**

Frontmatter: `status: validated`, `lifecycle: shipped`, `validation:` with `kind: deployment, kind: test`.

Body sections:
- Context — workspace-vs-packed regression class; React #418 hydration mismatches that workspace-resolution masks
- Decision — `examples/packed-smoke/` lives outside the pnpm workspace; consumes `@sophie/*` via `pnpm pack` + tarball install; one Playwright spec asserts 0 × #418 across all 5 store-backed components with `client:load`
- Consequences — CI runtime cost (~3 min); maintenance burden of the sync script; what classes of bug this catches that the regular `e2e` job does not
- Evidence — file:line to `examples/packed-smoke/scripts/sync-packed.sh`; reference to PR #176
- See also — [[ADR 0038]], [[ADR 0082]], [[ADR 0083]]

**Step 3: Regen validation dashboard**

Run: `pnpm tsx scripts/regenerate-validation-index.mts`

**Step 4: Verify MyST build**

Run: `cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"` → expect `0`.

**Step 5: Commit**

```bash
git add docs/website/decisions/0084-packed-smoke-ci-gate.md docs/website/status/validation.md
git commit -m "docs(adr-0084): document packed-smoke CI gate (PR-D1)"
```

### Task A.5: Write ADR 0085 — \_template/ skeleton convention

**Files:**
- Create: `docs/website/decisions/0085-component-template-skeleton.md`
- Reference: `packages/components/src/_template/README.md`
- Reference: `packages/components/src/_template/Template.tsx`
- Reference: `packages/components/src/_template/Template.test.tsx`
- Reference: PR #177

**Step 1: Read the template README**

Read [`packages/components/src/_template/README.md`](../../packages/components/src/_template/README.md) end-to-end. That's the prose seed; the ADR formalizes the README's conventions as a structural decision.

**Step 2: Write the ADR**

Frontmatter: `status: validated`, `lifecycle: shipped`, `validation:` with `kind: manual, kind: test`.

Body:
- Context — store-backed components need the `useHydrated`-gate convention per ADR 0038 Amendment 2; remembering the convention from scratch is an authoring tax
- Decision — `packages/components/src/_template/` is the canonical skeleton; copy-then-customize is the prescribed authoring workflow; two gate tests in `Template.test.tsx` are the floor
- Consequences — `_template/` excluded from `tsup` dist via explicit entry map; vitest meta-test runs on every PR; the template's own tests must stay green or new component copies inherit drift
- Evidence — file paths to `_template/README.md`, `Template.tsx`, `Template.test.tsx`; reference to PR #177
- See also — [[ADR 0038]], [[ADR 0083]], [[ADR 0084]], [[ADR 0061]]

**Step 3: Regen + verify MyST + commit**

Same shape as A.3 + A.4.

```bash
git add docs/website/decisions/0085-component-template-skeleton.md docs/website/status/validation.md
git commit -m "docs(adr-0085): formalize _template/ skeleton convention"
```

### Task A.6: Add "ADR 0038 family" cross-reference block

**Files:**
- Modify: `docs/website/decisions/0038-pedagogy-index-pattern.md` (append cross-ref block)

**Step 1: Locate the See-also section**

Run: `grep -n "## See also\|## See Also" docs/website/decisions/0038-pedagogy-index-pattern.md`
Expected: one or more matches.

**Step 2: Add the family block**

Use Edit. Above or below the existing "See also" section, add:

```markdown
## ADR 0038 family — hydration-class defenses

Four ADRs collectively close the React #418 hydration regression class
for store-backed components in packed consumers:

- ADR 0038 Amendment 2 — `useHydrated`-gate at the top of render
- [ADR 0083](0083-cl1-client-directive-invariant.md) — CL1 audit invariant
- [ADR 0084](0084-packed-smoke-ci-gate.md) — packed-smoke CI gate
- [ADR 0085](0085-component-template-skeleton.md) — `_template/` skeleton

Each is a structural class-of-issue defense; together they cover the
SSR-snapshot, build-time-static-analysis, CI-runtime, and authoring-
affordance layers.
```

**Step 3: Verify MyST build**

Same expected output as before.

**Step 4: Commit**

```bash
git add docs/website/decisions/0038-pedagogy-index-pattern.md
git commit -m "docs(adr-0038): add hydration-class family cross-reference block"
```

### Task A.7: Backfill validation evidence for keystone ADRs (0023, 0030, 0061)

**Files:**
- Modify: `docs/website/decisions/0023-vertical-slice-build-order.md`
- Modify: `docs/website/decisions/0030-audience-and-ai-author-model.md`
- Modify: `docs/website/decisions/0061-ai-optimized-codebase-design.md`

**Step 1: Read each ADR's current validation block**

Run: `grep -A 5 "validation:" docs/website/decisions/0023-vertical-slice-build-order.md docs/website/decisions/0030-audience-and-ai-author-model.md docs/website/decisions/0061-ai-optimized-codebase-design.md`
Expected: blocks showing `status: unvalidated`, `last_validated: —`, `evidence: []`.

**Step 2: For each ADR, identify concrete in-codebase evidence**

For ADR 0023 (vertical-slice): the PR history showing lean Phase 0 → outward refactor (e.g., PR #168 chrome primitives shipped after Phase 0 demand; ADR 0082 chapter-layout extraction shipped after consumers surfaced the need). Evidence: `kind: review` pointing at the audit's Section 2 + the PR history.

For ADR 0030 (AI author model): the commit history showing AI-written commits + the four AI roles described in the doc. Evidence: `kind: manual` pointing at the commit-message convention + `kind: review` pointing at the 2026-05-25-state-of-sophie review (which graded design system 18/20 partially on AI-authored output quality).

For ADR 0061 (AI-optimized codebase): the live enforcement of Rule 3 via `scripts/loc-budget.ts` + the `_template/` skeleton (Rule 1 + Rule 6) shipped in PR #177. Evidence: `kind: deployment` (CI lint job runs `lint:loc`) + `kind: audit` pointing at this hardening plan + `kind: test` pointing at `Template.test.tsx`.

**Step 3: Update each validation block**

For each ADR, change:
- `status:` from `unvalidated` → `validated`
- `last_validated:` to `2026-05-25`
- `evidence:` to a list of `{kind: …, ref: …}` entries
- `notes:` to a one-paragraph justification of why the ADR is now validated

**Step 4: Regen dashboard**

Run: `pnpm tsx scripts/regenerate-validation-index.mts`
Expected: validation summary count moves from 15 → 18.

**Step 5: Verify the integration test catches no drift**

Run: `pnpm --filter @sophie/astro test:unit -- --run validation`
Expected: all validation-block I-tests pass (I3 specifically would fail if the dashboard wasn't regenerated).

**Step 6: Verify MyST**

Run: `cd docs/website && npx mystmd build --html 2>&1 | grep -c "⚠"` → expect `0`.

**Step 7: Commit**

```bash
git add docs/website/decisions/0023-*.md docs/website/decisions/0030-*.md docs/website/decisions/0061-*.md docs/website/status/validation.md
git commit -m "docs(validation): promote keystones 0023/0030/0061 to validated"
```

### Task A.8: Open Phase A PR

Use @superpowers:finishing-a-development-branch.

**Step 1: Verify all gates clean**

Run: `pnpm exec biome check . && pnpm lint:loc && pnpm exec turbo run typecheck && pnpm exec turbo run test:unit`
Expected: all four commands exit 0; biome reports `Checked N files in Xs. No fixes applied.`

**Step 2: Push the branch**

Run: `git push -u origin feat/a-plus-phase-a-adr-hygiene`

**Step 3: Open PR**

```bash
gh pr create --title "feat(docs): close ADR drift surface (A-plus Phase A)" --body "$(cat <<'EOF'
## Summary

Phase A of the A+ hardening plan ([docs/plans/2026-05-25-sophie-a-plus-hardening.md](docs/plans/2026-05-25-sophie-a-plus-hardening.md)).

Closes the ADR drift surface and backfills keystone validation evidence per the 2026-05-25 SoTA audit:

- Three new ADRs formalize the hydration-class family: ADR 0083 (CL1 invariant), ADR 0084 (packed-smoke gate), ADR 0085 (`_template/` skeleton).
- Two one-line drift fixes: ADR 0038 evidence path; `scripts/loc-budget.ts` stale comment.
- ADR 0038 gains a hydration-family cross-reference block.
- ADRs 0023, 0030, 0061 promoted from `unvalidated` → `validated` with concrete evidence.
- Validation dashboard regenerated (15 → 18 validated).

## Test plan

- [x] `pnpm exec biome check .` — 0 errors / 0 warnings
- [x] `pnpm lint:loc` — exit 0
- [x] `pnpm exec turbo run typecheck` — clean
- [x] `pnpm exec turbo run test:unit` — all pass (validation I-tests catch dashboard drift)
- [x] `npx mystmd build --html` in `docs/website/` — 0 ⚠ warnings
- [x] `git log --oneline` shows 7 atomic commits per the plan

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 4: Wait for CI**

Use @superpowers:condition-based-waiting. Poll the PR status until all 8 jobs report green.

**Step 5: HITL handoff**

Halt and wait for Anna's review + merge. Do not auto-merge — per `feedback_no_questions_mode_scope.md`, merge is a side-effect requiring explicit confirmation.

---

## Phase B — SoTA test-pattern backfill (the worst gap)

**PR target:** `feat(test): close test-timing regression class — condition-based waits + expect.poll + 100% axe`. **Estimated tasks:** 12. **Estimated effort:** 2 days. **Risk:** low (test-only churn; no production code touched).

### Task B.1: Setup Phase B worktree

**Step 1: Verify Phase A merged**

Run: `cd /Users/anna/Teaching/sophie && git checkout main && git pull origin main && git log -1 --oneline`
Expected: HEAD is the squash-merge of Phase A.

**Step 2: Create Phase B worktree**

Run: `git worktree add ../sophie-a-plus-phase-b -b feat/a-plus-phase-b-sota-test-patterns && cd ../sophie-a-plus-phase-b && pnpm install --frozen-lockfile`

### Task B.2: Codify the canonical patterns under examples/smoke/e2e/\_patterns/

**Files:**
- Create: `examples/smoke/e2e/_patterns/README.md` (index)
- Create: `examples/smoke/e2e/_patterns/condition-based-waits.md`
- Create: `examples/smoke/e2e/_patterns/expect-poll-count.md`
- Create: `examples/smoke/e2e/_patterns/axe-core.md`

**Step 1: Write the index**

Use Write. Body lists the three patterns + their canonical-example file:line + when to use each.

**Step 2: Write condition-based-waits.md**

Content: explain `aria-busy`, `data-state="open"`, `aria-expanded="true"` patterns. Canonical example: [`examples/smoke/e2e/learning-objectives.spec.ts:63`](../../examples/smoke/e2e/learning-objectives.spec.ts#L63). When to use: any e2e wait where the page emits a discriminable attribute. Counter-example: bare `{ timeout: 5000 }` is anti-SoTA per AGENTS.md.

**Step 3: Write expect-poll-count.md**

Content: explain `expect.poll(() => page.locator(sel).count()).toBeGreaterThan(N)` as the parallel-hydration-race-safe wait. When to use: tests asserting "after hydration of N components, the DOM contains M elements." Canonical example: TBD — this task ships the FIRST canonical adoption in B.5 below; cross-link to that spec when it lands.

**Step 4: Write axe-core.md**

Content: explain the shared helper `expectChapterA11y(page)` that runs `AxeBuilder` with Sophie's standard tags + landmark checks (per ADR 0004 + R10). When to use: every e2e spec touching rendered chapter HTML. Canonical example: cross-link to the helper (B.4 below).

**Step 5: Commit**

```bash
git add examples/smoke/e2e/_patterns/
git commit -m "docs(test-patterns): seed canonical SoTA pattern docs"
```

### Task B.3: Write the failing test for expectChapterA11y helper

**Files:**
- Create: `examples/smoke/e2e/_helpers/expectChapterA11y.test.ts` (unit test for the helper itself)

**Step 1: Write the failing test**

Use Write. The test imports `expectChapterA11y` from `../_helpers/axe.ts` (which doesn't exist yet), invokes it against a stub `page` mock, and asserts:
- it calls `new AxeBuilder({ page })`
- it tags `wcag2aa`, `wcag21aa`, plus the landmark checks (`landmark-unique`, `landmark-one-main`) per R10
- it throws if violations are non-empty

```ts
import { describe, expect, it, vi } from "vitest";
import { expectChapterA11y } from "../_helpers/axe";

describe("expectChapterA11y", () => {
  it("runs AxeBuilder with WCAG 2.1 AA + R10 landmark tags", async () => {
    const analyze = vi.fn(async () => ({ violations: [] }));
    const withTags = vi.fn(() => ({ analyze }));
    const include = vi.fn(() => ({ withTags }));
    const ctor = vi.fn(() => ({ include }));
    vi.doMock("@axe-core/playwright", () => ({ default: ctor }));
    const pageStub = {} as never;
    await expectChapterA11y(pageStub);
    expect(withTags).toHaveBeenCalledWith(
      expect.arrayContaining(["wcag2aa", "wcag21aa", "landmark-unique", "landmark-one-main"])
    );
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `cd examples/smoke && pnpm exec vitest run e2e/_helpers/expectChapterA11y.test.ts`
Expected: FAIL with `Cannot find module '../_helpers/axe'` or similar.

### Task B.4: Implement the expectChapterA11y helper

**Files:**
- Create: `examples/smoke/e2e/_helpers/axe.ts`

**Step 1: Write the minimal implementation**

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectChapterA11y(page: Page): Promise<void> {
  const builder = new AxeBuilder({ page })
    .include("main, [role='main'], article")
    .withTags(["wcag2aa", "wcag21aa", "landmark-unique", "landmark-one-main"]);
  const results = await builder.analyze();
  expect(results.violations, "axe violations").toEqual([]);
}
```

**Step 2: Run the test to verify it passes**

Run: `cd examples/smoke && pnpm exec vitest run e2e/_helpers/expectChapterA11y.test.ts`
Expected: PASS.

**Step 3: Run biome on the new files**

Run: `pnpm exec biome check examples/smoke/e2e/_helpers/`
Expected: clean.

**Step 4: Commit**

```bash
git add examples/smoke/e2e/_helpers/
git commit -m "feat(test): add expectChapterA11y helper enforcing WCAG 2.1 AA + R10 landmarks"
```

### Task B.5: Adopt expect.poll(count) in the first spec (canonical example)

**Files:**
- Modify: `examples/packed-smoke/tests/hydration.spec.ts` (or whichever spec was created for PR #176; locate via `find examples/packed-smoke -name "*.spec.ts"`)

**Step 1: Locate the packed-smoke spec**

Run: `find examples/packed-smoke -name "*.spec.ts" -not -path "*/node_modules/*"`
Expected: one or more spec files.

**Step 2: Read the spec**

Identify any place where the spec waits on "N components hydrated" via timeout-style code. If the spec already uses condition-based wait, this task becomes the *first adoption of expect.poll(count)* by adding a parallel-hydration assertion. If no such site exists, skip to B.6.

**Step 3: Write the failing test**

Add the assertion:
```ts
await expect.poll(
  async () => page.locator("[data-sophie-hydrated='true']").count(),
  { timeout: 10_000, message: "wait for ≥5 hydrated store-backed islands" }
).toBeGreaterThan(4);
```

(The `data-sophie-hydrated='true'` attribute is emitted by the `useHydrated` gate after mount; verify the attribute name by reading [`packages/components/src/runtime/useHydrated.ts`](../../packages/components/src/runtime/useHydrated.ts) first.)

**Step 4: Run the test to verify it passes**

Run: `cd examples/packed-smoke && pnpm exec playwright test`
Expected: PASS (the assertion is descriptive of existing behavior, not enforcing new behavior).

**Step 5: Backfill expect-poll-count.md canonical link**

Use Edit on `examples/smoke/e2e/_patterns/expect-poll-count.md` to add the file:line of this spec as the canonical example.

**Step 6: Commit**

```bash
git add examples/packed-smoke/tests/hydration.spec.ts examples/smoke/e2e/_patterns/expect-poll-count.md
git commit -m "feat(test): adopt expect.poll(count) canonical pattern in packed-smoke spec"
```

### Tasks B.6 – B.17: Replace 19 bare timeouts across 12 specs

**Pattern:** one task per spec file. For each, the cycle is:

1. Identify the bare timeout(s) — grep within the file
2. Identify the discriminable attribute the page actually emits at that state (read the component source)
3. Replace timeout with `expect(locator).toHaveAttribute("name", "value")` or `expect.poll`
4. Run the spec; verify it passes
5. Commit

**Affected specs** (12 files; bare timeouts per Section 4 of the audit):

| Task | Spec file | Sites |
|---|---|---|
| B.6 | `examples/smoke/e2e/deep-dive-callout.spec.ts` | 1 |
| B.7 | `examples/smoke/e2e/predict.spec.ts` | 3 |
| B.8 | `examples/smoke/e2e/equation-ref.spec.ts` | 1 |
| B.9 | `examples/smoke/e2e/figure-ref.spec.ts` | ≥1 |
| B.10 | `examples/smoke/e2e/proving-chapter.spec.ts` | 1 |
| B.11 | `examples/smoke/e2e/keyboard-focus.spec.ts` | ≥1 |
| B.12 | `examples/smoke/e2e/glossary-term-prose-integrity.spec.ts` | 2 |
| B.13 | `examples/smoke/e2e/self-assessment.spec.ts` | 3 |
| B.14 | `examples/smoke/e2e/key-equation.spec.ts` | 2 |
| B.15 | `examples/smoke/e2e/glossary-term.spec.ts` | ≥1 |
| B.16 | `examples/smoke/e2e/chapter-ref.spec.ts` | ≥1 |
| B.17 | `examples/smoke/e2e/textbook-layout.spec.ts` | ≥1 |

**Per-task TDD shape (using B.6 as the worked example):**

**Step 1: Identify the bare timeout**

Run: `grep -n "timeout: [0-9]" examples/smoke/e2e/deep-dive-callout.spec.ts`
Expected: one match around line 70 (`.waitFor({ timeout: 5000 })`).

**Step 2: Read the component source to find the discriminable attribute**

Read [`packages/components/src/components/DeepDiveCallout/DeepDiveCallout.tsx`](../../packages/components/src/components/DeepDiveCallout/DeepDiveCallout.tsx). Find what data-attribute or aria-state flips when the callout opens (e.g., `data-state="open"` from Radix Collapsible).

**Step 3: Write the failing replacement**

Use Edit. Replace:
```ts
await expect(callout).toBeVisible({ timeout: 5000 });
```
with:
```ts
await expect(callout).toHaveAttribute("data-state", "open");
```

(Adjust attribute name/value per what the component actually emits.)

**Step 4: Run the spec**

Run: `cd examples/smoke && pnpm exec playwright test e2e/deep-dive-callout.spec.ts --reporter=line`
Expected: PASS.

**Step 5: Commit**

```bash
git add examples/smoke/e2e/deep-dive-callout.spec.ts
git commit -m "refactor(test): replace bare timeout with data-state wait in deep-dive-callout"
```

Repeat for B.7 – B.17.

**At the end of B.17:**

Run: `grep -rE "timeout: [0-9]" --include="*.spec.ts" examples/`
Expected: `0` matches (zero bare timeouts remain).

### Task B.18: Migrate 36 specs to expectChapterA11y helper

**Files:**
- Modify: all `examples/smoke/e2e/*.spec.ts` that touch chapter HTML (currently 22 of 35 use axe inline; 13 don't use axe at all)

**Step 1: Catalogue current state**

Run: `grep -lE "AxeBuilder|axe-core" examples/smoke/e2e/*.spec.ts | wc -l && grep -L "AxeBuilder\|axe-core" examples/smoke/e2e/*.spec.ts | wc -l`
Expected: `22` with axe, `13` without.

**Step 2: Per spec without axe — write the failing test**

For each of the 13 specs lacking axe:
- Add at top: `import { expectChapterA11y } from "./_helpers/axe";`
- Add at end of the main `test(…)` block: `await expectChapterA11y(page);`

**Step 3: Run the specs**

Run: `cd examples/smoke && pnpm exec playwright test --reporter=line`
Expected: PASS (if any spec was rendering non-compliant HTML, axe surfaces the violation now — that becomes a separate fix task and the helper has done its job).

**Step 4: If any spec FAILS with an axe violation**

Halt and fix the underlying component a11y issue with @superpowers:systematic-debugging. This is the test catching a real bug. Add a sub-task.

**Step 5: For the 22 specs already using axe inline, refactor to the helper**

Use Edit to replace each inline `new AxeBuilder(...).analyze()` block with `await expectChapterA11y(page);`. DRY consolidation.

**Step 6: Verify coverage at 100%**

Run: `grep -L "expectChapterA11y\|AxeBuilder" examples/smoke/e2e/*.spec.ts | wc -l`
Expected: `0` (every spec uses the helper).

**Step 7: Commit (per spec or batched 5 at a time)**

```bash
git add examples/smoke/e2e/<spec>.spec.ts
git commit -m "refactor(test): adopt expectChapterA11y helper in <spec>"
```

### Task B.19: Open Phase B PR

Use @superpowers:finishing-a-development-branch.

**Step 1: Final gate sweep**

Run all 8 CI-equivalent commands locally:
```bash
pnpm exec biome check .
pnpm lint:loc
pnpm lint:links
pnpm lint:status
pnpm exec turbo run typecheck
pnpm exec turbo run test:unit
pnpm exec turbo run build --filter=smoke
pnpm test:e2e
```
Expected: all exit 0.

**Step 2: Push + PR**

Same shape as A.8. Title: `feat(test): close test-timing regression class (A-plus Phase B)`.

**Step 3: HITL handoff**

Halt; wait for Anna's review + merge.

---

## Phase C — Structural CI gate hardening

**PR target:** `feat(ci): promote three advisory gates to fail-loud (A-plus Phase C)`. **Estimated tasks:** 6. **Estimated effort:** half a day. **Risk:** medium (the back-compat shim grep can surface false positives; need a precondition audit).

### Task C.1: Setup Phase C worktree

Same shape as B.1, but only after Phase B merges.

### Task C.2: Pre-flight back-compat shim audit

**Step 1: Grep for shim candidates**

Run: `grep -rnE "@deprecated|// COMPAT|// SHIM|// LEGACY|// BACKCOMPAT|backwards-compat" packages/ examples/ --include="*.ts" --include="*.tsx"`
Expected: list (or empty). If empty, proceed directly to C.3 — the gate enforces what's already true.

**Step 2: If non-empty, classify each match**

For each, decide: is this a real shim (to be removed) or a benign comment mention (legitimately documenting why no shim is needed)? Refactor real shims out (separate sub-tasks per shim).

**Step 3: Re-run grep after refactor**

Expected: empty.

### Task C.3: Write the failing test for back-compat shim gate

**Files:**
- Create: `scripts/lint-shims.ts`
- Create: `scripts/lint-shims.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

describe("lint-shims", () => {
  it("exits 0 when no shim markers are present", () => {
    expect(() => execSync("pnpm tsx scripts/lint-shims.ts", { stdio: "pipe" })).not.toThrow();
  });

  it("exits 1 when a shim marker is added", () => {
    // Temp-create a file with a shim marker, run, expect throw
    // Then delete the file.
    // (Detailed mocking — use tmp dir.)
  });
});
```

**Step 2: Run and verify fail**

Run: `pnpm exec vitest run scripts/lint-shims.test.ts`
Expected: FAIL (`scripts/lint-shims.ts` not found).

### Task C.4: Implement lint-shims script

**Step 1: Write the script**

```ts
#!/usr/bin/env -S npx tsx
import { execSync } from "node:child_process";

const PATTERN = "@deprecated|// COMPAT|// SHIM|// LEGACY|// BACKCOMPAT";
const PATHS = ["packages", "examples"];

try {
  const result = execSync(
    `grep -rnE "${PATTERN}" ${PATHS.join(" ")} --include="*.ts" --include="*.tsx" --include="*.mts" || true`,
    { encoding: "utf8" }
  );
  if (result.trim().length > 0) {
    console.error("Back-compat shim markers found (pre-launch invariant: zero shims):");
    console.error(result);
    process.exit(1);
  }
  console.log("✓ no back-compat shim markers");
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(2);
}
```

**Step 2: Run the test**

Run: `pnpm exec vitest run scripts/lint-shims.test.ts`
Expected: PASS.

**Step 3: Add to package.json**

Use Edit on `package.json:30` (the lint-related scripts area):
- Add: `"lint:shims": "tsx scripts/lint-shims.ts",`

**Step 4: Commit**

```bash
git add scripts/lint-shims.ts scripts/lint-shims.test.ts package.json
git commit -m "feat(ci): add lint:shims gate enforcing pre-launch zero-shim invariant"
```

### Task C.5: Promote lint:status validation-block to fail-loud

**Files:**
- Modify: `scripts/lint-status.ts` (the validation-block-without-status currently informational case)

**Step 1: Locate the informational branch**

Read `scripts/lint-status.ts` and find the validation-block-without-status reporting code. Per CI.yml comment lines 54-55 it's "informational only."

**Step 2: Write the failing test (or update existing test)**

Find `scripts/lint-status.test.ts` (if it exists). Add a test asserting exit code 1 when a validation block is missing `status:`. Run; expect FAIL.

**Step 3: Implement**

Change the informational `console.warn` to a `process.exit(1)` after printing.

**Step 4: Run the test**

Expected: PASS.

**Step 5: Run the whole gate locally**

Run: `pnpm lint:status`
Expected: exit 0 (if no validation blocks are stale) OR exit 1 with the specific stale entries listed (in which case fix them in a sub-task before proceeding).

**Step 6: Commit**

```bash
git add scripts/lint-status.ts scripts/lint-status.test.ts
git commit -m "feat(ci): promote validation-block freshness to fail-loud (was informational)"
```

### Task C.6: Add lint:shims + tightened lint:status to CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml` (the `lint` job)

**Step 1: Read the lint job**

Read `.github/workflows/ci.yml:13-56`. Note the existing sub-step structure.

**Step 2: Add the new sub-step**

After the `Page-status check` step, add:

```yaml
      - name: Back-compat shim detection (A-plus Phase C / C.4)
        # Pre-launch invariant: zero @deprecated, // COMPAT, // SHIM,
        # // LEGACY, // BACKCOMPAT markers in packages/* or examples/*.
        # Per AGENTS.md "pre-launch, no back-compat." Fails CI on
        # any match.
        run: pnpm lint:shims
```

**Step 3: Verify CI shape**

Run a syntax check: `cat .github/workflows/ci.yml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)" && echo OK`
Expected: `OK`.

**Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): wire lint:shims gate into CI lint job"
```

### Task C.7: Open Phase C PR

Same shape as A.8 / B.19.

---

## Phase D — Design hot-spot cleanup (BlackbodyExplorer)

**PR target:** `refactor(components): extract BlackbodyExplorer physics-utils (A-plus Phase D)`. **Estimated tasks:** 4. **Estimated effort:** 2 hours. **Risk:** low (physics math is pure; the component is well-tested).

### Task D.1: Setup Phase D worktree

Same shape as B.1.

### Task D.2: Write the failing test for the physics-utils module

**Files:**
- Create: `packages/components/src/_physics/blackbody.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { planckFlux, wienPeak, kelvinToColorCSS } from "./blackbody";

describe("blackbody physics utils", () => {
  it("planckFlux at 5778 K + 500 nm matches solar peak within 1%", () => {
    const flux = planckFlux(5778, 500e-9);
    expect(flux).toBeCloseTo(2.6e13, -12); // erg/s/cm²/sr/cm (CGS)
  });

  it("wienPeak at 5778 K is ~501 nm", () => {
    expect(wienPeak(5778) * 1e9).toBeCloseTo(501, 0);
  });

  it("kelvinToColorCSS returns a valid CSS color string", () => {
    expect(kelvinToColorCSS(5778)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
```

**Step 2: Run and verify fail**

Run: `cd packages/components && pnpm exec vitest run src/_physics/blackbody.test.ts`
Expected: FAIL (module not found).

### Task D.3: Extract the implementation from BlackbodyExplorer

**Files:**
- Create: `packages/components/src/_physics/blackbody.ts`
- Modify: `packages/components/src/figures/BlackbodyExplorer/BlackbodyExplorer.tsx`

**Step 1: Identify the extractable functions**

Read [`packages/components/src/figures/BlackbodyExplorer/BlackbodyExplorer.tsx`](../../packages/components/src/figures/BlackbodyExplorer/BlackbodyExplorer.tsx). Per the audit, top-of-file (lines ~38–100) contains `buildCurveData`, `formatScientificTex`, `humanizeTermSlug`, `spectralLabel`, plus the underlying `planck`/`wien` math.

**Step 2: Write the new module**

Move the pure math functions into `_physics/blackbody.ts`:
- `planckFlux(T, lambda)` — Planck spectral radiance, CGS units per AGENTS.md
- `wienPeak(T)` — Wien displacement, returns meters
- `kelvinToColorCSS(T)` — temperature to hex color (existing logic)

Keep formatting/UI helpers (`formatScientificTex`, `humanizeTermSlug`, `spectralLabel`) inside `BlackbodyExplorer.tsx` — those are presentation, not physics.

**Step 3: Update BlackbodyExplorer.tsx imports**

Replace the inline math with: `import { planckFlux, wienPeak, kelvinToColorCSS } from "../../_physics/blackbody";`

**Step 4: Run the new tests**

Run: `cd packages/components && pnpm exec vitest run src/_physics/blackbody.test.ts`
Expected: PASS.

**Step 5: Run the existing BlackbodyExplorer tests**

Run: `cd packages/components && pnpm exec vitest run src/figures/BlackbodyExplorer/`
Expected: PASS (no regression).

**Step 6: Run LOC budget**

Run: `pnpm lint:loc`
Expected: `BlackbodyExplorer.tsx` drops below warn-tier (was 556 LOC; should be <500 after extraction).

**Step 7: Commit**

```bash
git add packages/components/src/_physics/ packages/components/src/figures/BlackbodyExplorer/
git commit -m "refactor(components): extract blackbody physics utils → _physics/"
```

### Task D.4: Open Phase D PR

Same shape as A.8.

---

## Phase E — Megafile splits (tech-debt pay-down)

**PR target:** `refactor(astro): split pedagogy-audit/runner.test.ts + accumulator.test.ts (A-plus Phase E)`. **Estimated tasks:** 6. **Estimated effort:** 1 day. **Risk:** medium (large test surface; mitigated by running old+new in parallel for one PR commit).

### Task E.1: Setup Phase E worktree

### Task E.2: Plan the runner.test.ts split

**Files:**
- Read: `packages/astro/src/lib/pedagogy-audit/runner.test.ts` (1,763 LOC)

**Step 1: Catalogue the describe blocks**

Run: `grep -n "describe(" packages/astro/src/lib/pedagogy-audit/runner.test.ts`
Expected: a list of describe titles + line numbers.

**Step 2: Map each describe to an invariant**

For each describe, identify which audit invariant it tests (cross-reference against `packages/astro/src/lib/pedagogy-audit/invariants/*.ts`).

**Step 3: Write the split-plan note** (paper-only)

In your scratchpad, list which describes go into which new file. Target shape: one test file per invariant, mirroring the `invariants/` directory.

### Task E.3: Execute the runner.test.ts split

**Step 1: Create the new files**

Use Write to create one test file per invariant. Each file imports the relevant fixtures from a shared `_fixtures.ts` (which you also create).

**Step 2: Move describe blocks**

Use Edit on the original `runner.test.ts` to remove the moved blocks. Or, simpler: Write fresh contents to each new file, then truncate the original to only the runner-orchestration tests (the non-invariant-specific ones).

**Step 3: Run the full test suite**

Run: `cd packages/astro && pnpm exec vitest run src/lib/pedagogy-audit/`
Expected: same total test count as before the split + same pass rate.

**Step 4: Verify LOC budget**

Run: `pnpm lint:loc`
Expected: `runner.test.ts` drops below 800 LOC; new per-invariant files all under 500.

**Step 5: Remove from GRANDFATHERED allowlist**

Use Edit on `scripts/loc-budget.ts` to delete `"packages/astro/src/lib/pedagogy-audit/runner.test.ts"` from the GRANDFATHERED list.

**Step 6: Verify gate still passes**

Run: `pnpm lint:loc`
Expected: exit 0.

**Step 7: Commit**

```bash
git add packages/astro/src/lib/pedagogy-audit/ scripts/loc-budget.ts
git commit -m "refactor(astro): split runner.test.ts into per-invariant suites"
```

### Task E.4: Plan the accumulator.test.ts split

Same shape as E.2.

### Task E.5: Execute the accumulator.test.ts split

Same shape as E.3, but split by extractor type (`addDefinitions`, `addEquations`, etc.).

### Task E.6: Open Phase E PR

---

## Final verification — Regrade against the rubric

After all 5 phases merge to main:

**Step 1: Re-run the audit metrics**

Run:
```bash
grep -rE "timeout: [0-9]" --include="*.spec.ts" examples/ | wc -l                          # expect 0
grep -rl "expect\.poll" --include="*.spec.ts" | wc -l                                       # expect >5
grep -L "expectChapterA11y\|AxeBuilder" examples/smoke/e2e/*.spec.ts | wc -l                # expect 0
pnpm lint:loc                                                                                # expect exit 0, fewer grandfathered
ls docs/website/decisions/008[3-5]-*.md                                                      # expect 3 new ADRs
grep "validated" docs/website/status/validation.md | wc -l                                   # expect ≥ 18 (was 15)
```

**Step 2: Apply the rubric**

| Category | Pre-plan | Target | How achieved |
|---|---|---|---|
| Test coverage | 17/20 | **19/20** | 0 bare timeouts; expect.poll adopted; megafile splits |
| Design system | 19/20 | **19/20** | already near max |
| Scientific correctness | 16/20 | **17/20** | +1 from CL1 ADR + extractor evidence backfill |
| Accessibility | 17/20 | **19/20** | 100% e2e axe via helper |
| Architecture | 18/20 | **20/20** | 3 new ADRs close drift; 1 new CI gate (lint:shims); validation backfill |

**Target total: 94–95 → A / A+.**

If grade falls short, the gap is in chapter-scale validation (2nd ASTR 201 pilot is required to push correctness past 17/20). That's a separate sprint — the spec-driven authoring layer per [`docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`](2026-05-25-course-spec-and-spec-driven-authoring-design.md).

**Step 3: Write the closure review**

Create `docs/reviews/2026-MM-DD-a-plus-closure.md` summarizing the rubric move + linking each phase's PR. Use @superpowers:reviewing-project-quality.

**Step 4: Update MEMORY.md**

Only if new class-of-issue patterns surfaced during execution. The audit doc already captures the patterns; memory updates are for *behavioral* lessons that future sessions need.

---

## Worktree cleanup

After all 5 phases merge:

```bash
cd /Users/anna/Teaching/sophie
git worktree remove ../sophie-a-plus-phase-a
git worktree remove ../sophie-a-plus-phase-b
git worktree remove ../sophie-a-plus-phase-c
git worktree remove ../sophie-a-plus-phase-d
git worktree remove ../sophie-a-plus-phase-e
git branch -d feat/a-plus-phase-a-adr-hygiene feat/a-plus-phase-b-sota-test-patterns feat/a-plus-phase-c-ci-gate-hardening feat/a-plus-phase-d-blackbody-extract feat/a-plus-phase-e-megafile-splits
```

---

## Cross-cutting reminders

- **HITL**: every `gh pr create` and `gh pr merge` waits for Anna's explicit confirmation. The plan executor never auto-merges.
- **Biome zero-warnings**: exit code, not tail-grep. Use `pnpm exec biome check . && echo PASS` to make pass/fail unambiguous.
- **MyST builds**: `npx mystmd build --html 2>&1 | grep -c "⚠"` must be `0`. Do not grep for `error`/`warning` words — Node deprecation noise on stderr false-positives.
- **Squash-merge only** (ADR 0055). The squash-merge-guard workflow blocks the other strategies.
- **Validation dashboard regen**: any ADR status change → `pnpm tsx scripts/regenerate-validation-index.mts` in the same PR. I3 integration test catches misses.
- **Frozen lockfile pre-PR**: `pnpm install --frozen-lockfile` locally before opening a PR with dep touches (none expected in this plan, but the habit per `feedback_pre_pr_lockfile_check.md` is cheap).
- **Per-task verification**: use @superpowers:verification-before-completion before marking any task complete. "I think it works" is not verification.
- **Receiving review feedback**: use @superpowers:receiving-code-review — verify each comment technically before implementing; no performative agreement.

---

## What's deferred to a later sprint

- A10 `<UncertaintyLens>` ship (Reasoning OS C-tier; requires A11 linked-representation primitive first)
- 2nd ASTR 201 pilot chapter (required to push scientific-correctness 17 → 19+; per ADR 0064 structural-density-rotation rule, must differ from m2-l3)
- Course Spec consumption layer per `docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`
- Doc-drift CI gate (Refactor 4's third prong) — defer until the EqRef/glossary extractors are wired into a callable check; today they emit findings as part of the pedagogy-index pipeline, but no standalone gate exists. Add in a separate small PR after Phase C lands.
- High-reuse ADR validation backfill (0019/0021/0026) — nice-to-have polish; defer to a future "evidence backfill" sweep PR.
- Unit-level axe coverage audit on `@sophie/components` (verify the asserted 100%) — defer; if every component test uses the axe helper this is trivially true, but worth a sweep PR to confirm.

These items are listed in the audit's "should-fix" / "nice-to-have" rows; they're real but lower-leverage than the 5 phases above. Pick them up when the A+ grade is locked.
