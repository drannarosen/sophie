# Epistemic-Role Enforcement (ADR 0058 optional → enforced-for-new) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task. Single PR. **HITL: bring the component classification split (Phase 2) to Anna for sign-off; the ambiguous role-assignments are a deliberate later pass, not rushed here.**

**Goal:** Graduate the ADR 0058 eight-role epistemic contract from optional/additive to **enforced for new pedagogy components** via a repo-level lint gate, and annotate the self-evident existing components now — making "Reasoning OS" structurally true rather than conventional.

**Architecture:** A CI lint gate (`scripts/lint-epistemic-role.ts`, mirroring `lint-axe-render.ts`) scans `packages/components/src/components/**`; a component is compliant if it declares an `epistemicRole` (one of the 8), binds role per-slot (OMI composites), or is on a documented `CHROME`/`GRANDFATHERED` allowlist. Non-exempt missing-role → CI ERROR. The B2 pass annotates the obvious components now; ambiguous ones are grandfathered pending a domain pass.

**Tech Stack:** TypeScript + tsx (the existing lint-script pattern), Zod schemas (ADR 0003), the pedagogy component contract (ADR 0004/0058), CI `lint` job.

**Resolved decisions (Anna, 2026-05-28):**
- Locus = **repo-level lint gate** (A), not a build-time audit invariant.
- Exemption = **central `CHROME` + shrinking `GRANDFATHERED` allowlists** in the script, per-entry rationale (A1, loc-budget style).
- Scope = **gate + annotate the self-evident roles now**; `GRANDFATHER` the ambiguous for a later pass Anna adjudicates (B2).
- Severity = ERROR for non-exempt missing-role; `GRANDFATHERED` tracked-not-blocking; `CHROME` exempt-silent.

**Non-goals:** type-level required field (C); factory-membership discriminant (A3); rushing ambiguous role-assignments (B3); a content-level audit invariant (possible future complement, not now).

---

## Phase 1 — The lint gate

### Task 1.1: `lint-epistemic-role.ts` (mirror `lint-axe-render.ts`)

**Files:**
- Create: `scripts/lint-epistemic-role.ts`
- Reference: `scripts/lint-axe-render.ts` (structure: `SCOPE`, list-files, `isExcluded`, predicate, `main` with `process.exit`) and `scripts/loc-budget.ts` (allowlist + per-entry rationale + comment-stripping in `isBarrel`).

**Behavior:**
- `SCOPE = "packages/components/src/components"`. Enumerate immediate child dirs = the component set. Skip `_shared`, `_formative`, `internal` (infra; documented).
- A component dir is **compliant** if ANY of:
  1. a non-test file in the dir contains an `epistemicRole` *assignment* to one of the 8 enum values (`observable|model|inference|assumption|approximation|uncertainty|numerical|misconception`) — **after stripping comments** (avoid the `CommonMisuse` docstring false-positive that *mentions* `epistemicRole: "misconception"` in prose);
  2. the dir is in `ROLE_VIA_SLOT` (OMI composites that bind role per-slot per ADR 0058 §4, e.g. `OMIFlow`);
  3. the dir is in `CHROME` (role-less by design);
  4. the dir is in `GRANDFATHERED` (ambiguous, pending domain pass — reported, not blocking).
- Non-compliant → collect; print; `process.exit(1)`. Clean → `exit(0)`. `GRANDFATHERED` entries print as a tracked-not-blocking list.

**Comment-stripping detection** (the robustness crux):
```ts
function declaresRole(dir: string): boolean {
  const files = listNonTestSourceFiles(dir); // *.ts/*.tsx, exclude *.test.*, *.stories.*
  const ROLES = "observable|model|inference|assumption|approximation|uncertainty|numerical|misconception";
  const re = new RegExp(`epistemicRole:\\s*(z\\.literal\\(\\s*)?["'](${ROLES})["']`);
  for (const f of files) {
    const src = stripComments(readFileSync(f, "utf8")); // remove // and /* */ first
    if (re.test(src)) return true;
  }
  return false;
}
```
(`stripComments`: reuse the line-classification approach from `loc-budget.ts:isBarrel`, or a small block/line-comment stripper.)

**Allowlists (per-entry rationale, like loc-budget):**
```ts
// Role-less by design — structural / layout / navigation / course-info chrome.
const CHROME: ReadonlyArray<readonly [string, string]> = [
  ["Grid", "layout primitive; no epistemic content"],
  ["Tabs", "disclosure container; chrome"],
  // …Card, Dropdown, Reading, Week, Due, PrereqsList, ContactCard,
  //   GradingTable, OfficeHoursChrome, OfficeHoursTable, Points, Video,
  //   AccessibilitySection, CourseLanding, SectionLanding,
  //   ObjectivesSection, LearningObjectives, Objective, EffortLog,
  //   Figure, FigureRef, EquationRef, ChapterRef, GlossaryTerm, Search,
  //   SkillReview, Units, InteractiveCheckbox, Reflection, …
];
// Pedagogy components whose role is genuinely ambiguous — pending the
// domain pass with Anna. SHRINK over time. Tracked, not blocking.
const GRANDFATHERED: ReadonlyArray<readonly [string, string]> = [
  // e.g. DerivationStep, Predict, KeyEquation, the formative family
  //   (MCQ/MultiSelect/FillBlank/NumericQuestion/QuickCheck/
  //   PracticeProblem/Solution/Hint), Rep* — adjudicate later.
];
const ROLE_VIA_SLOT: ReadonlyArray<readonly [string, string]> = [
  ["OMIFlow", "binds observable/model/inference per slot (ADR 0058 §4)"],
];
```

**Verification (script, not vitest):** run `pnpm tsx scripts/lint-epistemic-role.ts` → exit 0 once Phase 2 seeds the allowlists. Add an enforcement-proof in Task 4.3.
**Commit:** `feat(scripts): lint-epistemic-role gate (ADR 0058 enforcement)`

---

## Phase 2 — Classify, seed allowlists, annotate the obvious  *(HITL sign-off)*

### Task 2.1: Enumerate + classify every component dir
Produce a table: each `components/*` dir → one of {already-declares, obvious-annotate, role-via-slot, chrome, ambiguous-grandfather}. Seed the inventory from:
```bash
ls -d packages/components/src/components/*/ | sed 's|.*/components/||;s|/$||'
grep -rl 'epistemicRole:\s*["'\'']' packages/components/src/components --include=*.ts --include=*.tsx | grep -v test
```
**Bring the proposed split to Anna for sign-off before annotating** (the chrome-vs-pedagogy line + the obvious-vs-ambiguous line are the epistemics the whole contract is about; miscategorizing undermines the thesis).

### Task 2.2: Annotate the self-evident components
For each "obvious-annotate" component lacking a declaration, add `epistemicRole: "<role>"` to its `.schema.ts` (mirror `Observable.schema.ts`'s declaration shape; ADR 0058 §2 explicit-const pattern). TDD: the component's existing schema test asserts the new field parses; if absent, add a one-line assertion. Commit per small batch: `feat(components): declare epistemicRole on <X> (ADR 0058)`.

### Task 2.3: Seed `CHROME` / `GRANDFATHERED` / `ROLE_VIA_SLOT`
Fill the allowlists from the signed-off classification, each with a one-line rationale. Run the gate → exit 0. Commit: `chore(scripts): seed epistemic-role allowlists from classification`.

---

## Phase 3 — Wire into CI + scripts

### Task 3.1: package.json + ci.yml
- `package.json` scripts: add `"lint:epistemic-role": "tsx scripts/lint-epistemic-role.ts"` (next to the other `lint:*`).
- `.github/workflows/ci.yml` `lint` job: add a step `run: pnpm lint:epistemic-role` (after `lint:axe-render`), with a comment block like the R11 step.
**Commit:** `ci: enforce epistemic-role gate in the lint job`

---

## Phase 4 — ADR 0058 amendment + R13 + verification

### Task 4.1: Amend ADR 0058
Add an `## Amendments` entry: graduate `epistemicRole` from optional → **enforced-for-new** via `lint-epistemic-role`; the `CHROME`/`GRANDFATHERED`/`ROLE_VIA_SLOT` allowlists; the B2 annotation of self-evident components; the deferred ambiguous domain pass. **Touches the `validation:` block → regen `validation.md`** (`pnpm tsx scripts/regenerate-validation-index.mts`, build `@sophie/core` first). I3 catches drift.

### Task 4.2: Add standing review rule R13 (AGENTS.md)
Under "Standing PR-review rules (R6–R12)" add **R13 — epistemic-role declaration**: new `components/**` pedagogy components declare `epistemicRole` (or bind per-slot) or are added to `CHROME`/`GRANDFATHERED` with a rationale; enforced by `scripts/lint-epistemic-role.ts` (`pnpm lint:epistemic-role`, CI `lint` job). Note origin (ITEM 5 / ADR 0058 graduation). *(AGENTS.md is project instructions, not the MyST site — edits land with this PR.)*

### Task 4.3: Enforcement proof + full gate
- **Proof:** temporarily scaffold a role-less `components/__ProofPedagogy__/` (not allowlisted) → `pnpm lint:epistemic-role` exits 1 naming it → delete the fixture (use `rm <file>`, never `rm -rf`). This proves the gate actually blocks (W4 evidence; don't ship the fixture).
- **Full gate:** biome 0-warn · `turbo run typecheck` 11/11 · `turbo run test:unit` green + 0 RolldownError · `pnpm lint:epistemic-role` exit 0 · `pnpm lint:axe-render` · `pnpm lint:loc` · MyST `build --html` 0 ⚠.
**Commit:** `docs(adr): ADR 0058 Amendment — epistemic-role enforced for new components` + `docs(agents): R13 epistemic-role review rule`.

---

## Success criteria (Definition of Done)
- `pnpm lint:epistemic-role` green; `CHROME`/`GRANDFATHERED`/`ROLE_VIA_SLOT` documented with rationale; a non-exempt role-less pedagogy component **fails CI** (proven via the temp fixture).
- Self-evident pedagogy components carry `epistemicRole`; ambiguous ones grandfathered (tracked) with a follow-up domain-pass note.
- ADR 0058 amended; R13 added to AGENTS.md; `validation.md` regenerated.
- All gates green; CI `lint` job runs the new gate.

## Conventions
pnpm + turbo; biome 0-warn (grep full output); MyST `grep -c "⚠"`; validation.md regen on the ADR change; ADR 0055 branch+PR+squash; never `rm -rf` for the proof fixture; explicit per-merge confirmation; HITL sign-off on the Phase 2 classification.

## Deferred follow-up (tracked)
The **ambiguous role-assignment domain pass**: bring Anna the `GRANDFATHERED` candidates (formative family, Rep*, DerivationStep, Predict, KeyEquation, …) with proposed roles (or "genuinely chrome") for adjudication; shrink `GRANDFATHERED` toward empty. Its own small PR.
