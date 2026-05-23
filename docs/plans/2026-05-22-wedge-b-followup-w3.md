# Wedge B-followup Implementation Plan (W3 — per-callsite `chapter:` → `unit:` rename)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Default batch size = 3 tasks; report after each batch and wait for Anna's confirmation per the HITL mandate in `/Users/anna/Teaching/sophie/CLAUDE.md`.

**Goal:** Rename the per-callsite parent-ref field `chapter` → `unit` across the entire Sophie codebase — 15 entry schemas, 14 extractor emitters, accumulator state + methods, ~40 audit invariant reads + Finding location field, `AuditExtras.draftChapterSlugs` → `draftUnitIds`, 4 `useInteractive*` hook signatures, ResponseStore interface + 3 implementations, IndexedDB key dimension + BroadcastChannel helper, 5 parent-ref React component props, and ~138 inline test-fixture literals. Keep `chapter` everywhere it binds to a reading-artifact slug per D7's vocabulary lock: `UnitEntry.chapter`, `<ChapterRef chapter>`, and the seven chrome `Chapter*` roll-ups. Internal types use `unit:` everywhere; CLI/audit output keeps the `chapter:` prefix word (educator vocabulary).

**Architecture:** No new files in `@sophie/core` or `@sophie/components`. W3 is a uniform rename through three layers (schema → extractor + accumulator → audit) plus a parallel rename through the persistence layer (hooks → ResponseStore → IDB key shape). Schema normalization bundled: 15 fields uniformly become `unit: Slug` (was a mix of `NonEmptyString` + `Slug` pre-W3). No backwards-compat shims per `feedback_no_backcompat_prelaunch`. See [design doc](2026-05-22-wedge-b-followup-w3-design.md) for D1–D6 + touchpoint inventory.

**Tech Stack:** TypeScript, Zod, Astro 6 + MDX, React 19, pnpm, Turborepo, Biome, Vitest, Playwright, IndexedDB via the persistence layer per [ADR 0007](../decisions/0007-persistence.md).

---

## Batch 1 — Worktree + design + plan (this PR's metadocs)

### Task 1 — Create worktree + feature branch

**Status:** DONE before plan file landed (see master plan at `~/.claude/plans/sophie-wedge-b-followup-w3-immutable-fern.md`).

```bash
git fetch origin
git worktree add .worktrees/wedge-b-followup-w3 -b feat/wedge-b-followup-w3 origin/main
cd .worktrees/wedge-b-followup-w3
pnpm install
```

Verify clean: `git status` → clean; `pnpm exec biome check 2>&1 | grep -E "error|warning"` → empty.

### Task 2 — Write W3 design doc

**File:** `docs/plans/2026-05-22-wedge-b-followup-w3-design.md` (this Batch).

Mirrors W1/W2 design-doc shape: §1 Goal & context, §2 Locked design decisions (D1 split-by-role, D2 internal/external vocabulary, D3 Slug normalization, D4 method renames, D5 SSR payload stable, D6 pilot Shape α), §3 implementation summary, §4 critical files, §5 verification, §6 out of scope, §7 references.

### Task 3 — Write this plan doc

**File:** `docs/plans/2026-05-22-wedge-b-followup-w3.md` (this file).

---

## Batch 2 — Schema layer (`@sophie/core`)

### Task 4 — Bulk rename `chapter:` → `unit: Slug` across 15 parent-ref schemas

**Files (15):**
- `packages/core/src/schema/pedagogy-index-entries/chapter-meta.ts:38` (ObjectiveEntry)
- `packages/core/src/schema/pedagogy-index-entries/inline-ref.ts:44`
- `packages/core/src/schema/pedagogy-index-entries/inline-content.ts:32,47,64,109` (Definition/KeyInsight/Misconception/DeepDive)
- `packages/core/src/schema/pedagogy-index-entries/equation.ts:51`
- `packages/core/src/schema/pedagogy-index-entries/figure.ts:49`
- `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts:33`
- `packages/core/src/schema/pedagogy-index-entries/retrieval.ts:29,46,73` (Retrieval/Spaced/Skill)
- `packages/core/src/schema/multirep.ts:112`
- `packages/core/src/schema/intervention.ts:94`
- **NOT TOUCHED:** `packages/core/src/schema/pedagogy-index-entries/unit.ts:48` (D7 lock — `UnitEntry.chapter` = reading-artifact binding)

**Strategy:** Manual edits — small file count (~10 files). Per file, replace:
- `chapter: NonEmptyString,` → `unit: Slug,`
- `chapter: Slug,` → `unit: Slug,`

Update each schema's JSDoc/comment to reference "parent unit id" instead of "parent chapter slug."

**Step 1 (Red):** Update the corresponding `*.test.ts` first — change fixture literals `chapter: "..."` → `unit: "..."`. Watch tests fail because schema still uses `chapter`.

**Step 2 (Green):** Edit schema files; tests pass.

**Step 3 (biome):** `pnpm biome format --write packages/core/src/schema/`.

### Task 5 — Rename `Finding.location.chapter` → `Finding.location.unit`

**File:** `packages/core/src/schema/audit.ts:43`

Change `chapter: z.string().optional(),` → `unit: z.string().optional(),` inside `AuditFindingSchema.location`.

Update any audit-schema test fixtures.

### Task 6 — Migrate `@sophie/core` test fixtures

**Files (~30 fixtures):**
- `packages/core/src/schema/pedagogy-index-entries/retrieval.test.ts` (12 occurrences)
- `packages/core/src/schema/pedagogy-index-entries/unit.test.ts` (skip — UnitEntry.chapter stays; verify no parent-ref hits)
- Any schema test that builds entry literals

**Python regex (W2 R2 pattern):**

```bash
cd packages/core
python3 -c "
import re, pathlib
for p in pathlib.Path('src/schema').rglob('*.test.ts'):
    txt = p.read_text()
    # Match chapter: '...' inside object literals (per-callsite parent-refs)
    new = re.sub(r'\\bchapter:(\\s*)(\"[^\"]+\")', r'unit:\\1\\2', txt)
    if new != txt:
        p.write_text(new)
        print(f'modified: {p}')
"
```

**Caveat:** Don't run the regex on `unit.test.ts` (UnitEntry.chapter fixtures need to stay). Either exclude in the script, or run + spot-check via `git diff` and `git restore` the unit.test.ts hunk.

### Task 7 — Verify `@sophie/core` green + commit

```bash
pnpm turbo run test --filter=@sophie/core
pnpm exec biome check packages/core 2>&1 | grep -E "(error|warning)" | head
```

Both clean. Commit:

```
refactor(core/schema): rename per-callsite chapter → unit (W3 batch 2)

- 15 parent-ref entry schemas: chapter: NonEmptyString|Slug → unit: Slug
- Finding.location.chapter → location.unit
- UnitEntry.chapter preserved (D7 reading-artifact binding lock)
- 30 test fixtures migrated via python regex
```

---

## Batch 3 — Extractors + accumulator (`@sophie/astro`)

### Task 8 — Rename `chapter: chapterSlug` → `unit: unitId` across 14 extractor files

**Files:**
```
packages/astro/src/lib/pedagogy-index/extractors/{definitions,equation-citations,figures,inline-refs,interventions,key-insights,misconceptions,multireps,objectives,spaced-review,skill-review,retrieval-prompt,deep-dives,omi-flow}.ts
```

Per file:
- Rename local var `chapterSlug` → `unitId`
- Change emit `chapter: chapterSlug,` → `unit: unitId,`
- Update any local types defining what the extractor consumes

**Step 1 (Red):** Update extractor `*.test.ts` files to assert `unit:` on emitted entries.

**Step 2 (Green):** Edit extractors.

### Task 9 — Rename accumulator state + methods

**File:** `packages/astro/src/lib/pedagogy-index/accumulator.ts`

- Method rename: `clearChapter(chapterSlug)` → `clearUnit(unitId)`; `clearChapterCitations(chapterSlug)` → `clearUnitCitations(unitId)`.
- Internal Map keys + filter calls: `${entry.chapter}#${entry.anchor}` → `${entry.unit}#${entry.anchor}` everywhere (~28 sites).
- Local param names + variable names `chapterSlug` → `unitId`.

**Step 1 (Red):** Update accumulator `*.test.ts` to call renamed methods + assert renamed fields.

**Step 2 (Green):** Edit accumulator.

### Task 10 — Update orchestrator + helper callers

**Files to check:**
- `packages/astro/src/lib/pedagogy-index/orchestrator.ts` — does it call `accumulator.clearChapter`? Rename.
- `packages/astro/src/lib/get-student-chapters.ts` — DELETED in W2 (confirm not present).
- Any tsconfig path aliases pointing at renamed methods.

### Task 11 — Verify `@sophie/astro` (extractor + accumulator surfaces) green + commit

```bash
pnpm turbo run test --filter=@sophie/astro -- --run pedagogy-index
pnpm exec biome check packages/astro/src/lib/pedagogy-index 2>&1 | grep -E "(error|warning)" | head
```

Commit:

```
refactor(astro/pedagogy-index): rename chapter → unit in extractors + accumulator (W3 batch 3)
```

---

## Batch 4 — Audit invariants + types

### Task 12 — Rename `AuditExtras.draftChapterSlugs` → `draftUnitIds`

**Files:**
- `packages/astro/src/lib/pedagogy-audit/types.ts:35` — interface field rename
- `packages/astro/src/lib/pedagogy-audit/invariants/chapter-status.ts:12,15,26` — loop variable + W3-debt comment REMOVED
- Any TextbookLayout/orchestrator code populating extras

**Step 1 (Red):** Update `runner.test.ts` + `chapter-status.test.ts` assertions.
**Step 2 (Green):** Edit type + invariant.

### Task 13 — Migrate ~40 invariant reads `entry.chapter` → `entry.unit`

**Files (~10):**
```
packages/astro/src/lib/pedagogy-audit/invariants/{key-insights,objectives,omi-flow,inline-refs,retrieval-family,misconception-graph,multirep,interventions,misconception-pairing,chapter-status}.ts
```

Per file: every read of `entry.chapter` or `usage.chapter` or `m.chapter` → `.unit`.

**Critical D2 discipline:** Error-message prose strings keep "chapter" word. Only field READS rename, not message TEXT. Example diff for misconception-graph.ts:
```diff
- `Misconception ${m.anchor} in chapter ${m.chapter} is missing…`
+ `Misconception ${m.anchor} in chapter ${m.unit} is missing…`
```
(The word "chapter" stays; only the field accessor changes.)

### Task 14 — Update Sink + Finding emissions

**Files:**
- `packages/astro/src/lib/pedagogy-audit/types.ts` — Sink + Finding type fields
- Every `location: { chapter: …, anchor: … }` emission across all invariant files → `location: { unit: …, anchor: … }`

### Task 15 — `context.ts` audit

**File:** `packages/astro/src/lib/pedagogy-audit/context.ts`

W1 introduced unit-aware context. Confirm no stale `chapter`-keyed maps; if any, rename to `unit`-keyed.

### Task 16 — Bulk-migrate audit invariant test fixtures via python regex

**Files (~12):**
```
packages/astro/src/lib/pedagogy-audit/invariants/*.test.ts
```

Python regex pattern (W2 R2):

```bash
cd packages/astro
python3 -c "
import re, pathlib
for p in pathlib.Path('src/lib/pedagogy-audit').rglob('*.test.ts'):
    txt = p.read_text()
    # Field literal: chapter: '…' → unit: '…' (in object literals)
    new = re.sub(r'\\bchapter:(\\s*)(\"[^\"]+\")', r'unit:\\1\\2', txt)
    # Finding location assertions: .location?.chapter → .location?.unit
    new = re.sub(r'\\.location\\?\\.chapter\\b', '.location?.unit', new)
    new = re.sub(r'\\.location\\.chapter\\b', '.location.unit', new)
    if new != txt:
        p.write_text(new)
        print(f'modified: {p}')
"
pnpm biome format --write packages/astro/src/lib/pedagogy-audit/
```

### Task 17 — Audit runner test (~107 occurrences in runner.test.ts)

Run the same python regex pass on `packages/astro/src/lib/pedagogy-audit/runner.test.ts`. Manual spot-check the diff because `runner.test.ts` may embed both parent-ref chapter literals AND inline error-message strings (the prose ones stay).

```bash
git diff packages/astro/src/lib/pedagogy-audit/runner.test.ts | rg '^-.*chapter' | head -20
```

If any error-message assertions had their `chapter` word touched, manually restore — those are author-facing prose per D2.

### Task 18 — Verify `@sophie/astro` audit + commit

```bash
pnpm turbo run test --filter=@sophie/astro -- --run pedagogy-audit
pnpm exec biome check packages/astro/src/lib/pedagogy-audit 2>&1 | grep -E "(error|warning)" | head
```

Commit:

```
refactor(astro/audit): rename chapter → unit in invariants + Finding location (W3 batch 4)

- ~40 invariant entry.chapter reads → entry.unit
- Finding.location.chapter → location.unit
- AuditExtras.draftChapterSlugs → draftUnitIds (W3-debt clearance)
- Error-message prose preserved (D2 vocabulary split)
```

---

## Batch 5 — Runtime hooks + ResponseStore + IDB + BroadcastChannel

### Task 19 — `useInteractive*` parameter rename

**Files:**
- `packages/components/src/runtime/useInteractive.ts:143` — param `chapter: string` → `unit: string`
- `packages/components/src/runtime/useInteractiveRange.ts` — same
- `packages/components/src/runtime/useInteractiveRangeMulti.ts:51` — `chapters: ReadonlyArray<string>` → `units: ReadonlyArray<string>`
- `packages/components/src/runtime/useSelfAssessment.ts:27` — same

Update JSDoc on each hook. Update return types if any field names embed `chapter`.

### Task 20 — `ResponseStore` interface + 3 implementations

**Files:**
- `packages/components/src/runtime/ResponseStore.ts` — interface methods `get(profile, chapter, …)` etc. param renames; method `clearChapter` → `clearUnit`; method `getAllMulti(profile, chapters, …)` → `(profile, units, …)`
- `packages/components/src/runtime/IndexedDBResponseStore.ts`
- `packages/components/src/runtime/FallbackResponseStore.ts`
- `packages/components/src/runtime/MemoryResponseStore.ts`

### Task 21 — IDB key shape

**File:** `packages/components/src/runtime/ResponseStore.ts`

- `compositeKey(profile, chapter, key)` → `compositeKey(profile, unit, key)`
- `chapterKeyRange(profile, chapter)` → `unitKeyRange(profile, unit)`

IDB key dimension internally is the same string (we're not changing key SHAPE — same `${profile}#${chapter}#${key}` template now `${profile}#${unit}#${key}`). Pre-launch: no data migration needed (dev seeds re-populate; production has zero users).

### Task 22 — BroadcastChannel helper

**File:** `packages/components/src/runtime/BroadcastChannel.ts:78`

`chapterChannelName(course, chapter)` → `unitChannelName(course, unit)`. Update all callers in `useInteractive*` hooks.

### Task 23 — Migrate component runtime tests

```bash
cd packages/components
python3 -c "
import re, pathlib
for p in pathlib.Path('src/runtime').rglob('*.test.ts*'):
    txt = p.read_text()
    new = re.sub(r'\\bchapter:(\\s*)(\"[^\"]+\")', r'unit:\\1\\2', txt)
    if new != txt:
        p.write_text(new)
        print(f'modified: {p}')
"
pnpm biome format --write packages/components/src/runtime/
```

Manual spot-check tests that exercise IDB key shape — assertions on serialized keys may need updating from `profile#chapter#key` → `profile#unit#key` format.

### Task 24 — Verify `@sophie/components` runtime + commit

```bash
pnpm turbo run test --filter=@sophie/components -- --run runtime
pnpm exec biome check packages/components/src/runtime 2>&1 | grep -E "(error|warning)" | head
```

Commit:

```
refactor(components/runtime): rename chapter → unit in hooks + ResponseStore + IDB + Broadcast (W3 batch 5)

- useInteractive(course, chapter, key) → useInteractive(course, unit, key)
- useInteractiveRangeMulti(chapters) → (units)
- ResponseStore: clearChapter → clearUnit; compositeKey/keyRange param rename
- BroadcastChannel.chapterChannelName → unitChannelName
- IDB key dimension renamed; no data migration (pre-launch)
```

---

## Batch 6 — Parent-ref component props + smoke MDX

### Task 25 — Rename 5 parent-ref component props `chapter` → `unit`

**Files (per component, ~3 files each):**
- `packages/components/src/components/Reflection/Reflection.tsx` + `.schema.ts` + `.test.tsx`
- `packages/components/src/components/LearningObjectives/LearningObjectives.tsx` + schema + test
- `packages/components/src/components/RetrievalPrompt/RetrievalPrompt.tsx` + schema + test
- `packages/components/src/components/SpacedReview/SpacedReview.tsx` + schema + test
- `packages/components/src/components/SkillReview/SkillReview.tsx` + schema + test

Per component:
- Rename prop key `chapter` → `unit` in Zod schema, TS Props interface, JSX usage, hook calls.
- Update prop comment/JSDoc.

### Task 26 — Sanity-check artifact-ref components NOT renamed

```bash
rg -n "'chapter':|chapter:\\s*z\\." packages/components/src/components/ChapterRef/ packages/components/src/components/ChapterGlossary/ packages/components/src/components/ChapterEquations/ packages/components/src/components/ChapterFigures/ packages/components/src/components/ChapterKeyInsights/ packages/components/src/components/ChapterMisconceptions/ packages/components/src/components/ChapterMultiReps/ packages/components/src/components/ChapterTDRs/
```

Expected: prop key `chapter` still present in all 8 component schemas (per D1). Implementation should already read renamed `entry.unit` field internally (mechanical follow-on from Batch 2's schema rename + TypeScript compiler enforces).

Spot-check ChapterGlossary's implementation:
```ts
// pre-W3: definitions.filter(d => d.chapter === props.chapter)
// post-W3: definitions.filter(d => d.unit === props.chapter)
```

Verify all 8 chrome roll-ups + ChapterRef have queries updated to read `.unit` from index entries while keeping `props.chapter` as the prop name.

### Task 27 — Migrate smoke MDX callsites for parent-ref components

**Files:**
- `examples/smoke/src/content/sections/**/units/**/reading.mdx`

```bash
cd examples/smoke
python3 -c "
import re, pathlib
PATTERNS = [
    (r'<(Reflection|LearningObjectives|RetrievalPrompt|SpacedReview|SkillReview)([^>]*?)\\bchapter=([\"\\'])', r'<\\1\\2unit=\\3'),
]
for p in pathlib.Path('src/content/sections').rglob('reading.mdx'):
    txt = p.read_text()
    new = txt
    for pat, repl in PATTERNS:
        new = re.sub(pat, repl, new)
    if new != txt:
        p.write_text(new)
        print(f'modified: {p}')
"
```

Verify no `<ChapterRef chapter=` or `<ChapterGlossary chapter=` etc. were touched (regex restricted to 5 parent-ref tags only).

### Task 28 — Migrate component test files via python regex

```bash
cd packages/components
python3 -c "
import re, pathlib
TARGETS = ['Reflection', 'LearningObjectives', 'RetrievalPrompt', 'SpacedReview', 'SkillReview']
for name in TARGETS:
    for p in pathlib.Path(f'src/components/{name}').rglob('*.test.tsx'):
        txt = p.read_text()
        new = re.sub(r'(<' + name + r'[^>]*?)\\bchapter=', r'\\1unit=', txt)
        # JSON literal style props
        new = re.sub(r'\\bchapter:(\\s*)(\"[^\"]+\")', r'unit:\\1\\2', new)
        if new != txt:
            p.write_text(new)
            print(f'modified: {p}')
"
pnpm biome format --write packages/components/src/components/{Reflection,LearningObjectives,RetrievalPrompt,SpacedReview,SkillReview}/
```

### Task 29 — Verify `@sophie/components` + smoke MDX + commit

```bash
pnpm turbo run test --filter=@sophie/components
pnpm turbo run build --filter=examples/smoke --force
pnpm exec biome check packages/components examples/smoke 2>&1 | grep -E "(error|warning)" | head
```

Verify smoke build still produces 12 pages / 125 pedagogy entries.

Commit:

```
refactor(components,smoke): rename chapter → unit prop on 5 parent-ref components (W3 batch 6)

- Reflection, LearningObjectives, RetrievalPrompt, SpacedReview, SkillReview
- Smoke MDX callsites migrated (5 components only — Chapter* artifact-refs KEEP)
- ChapterRef + 7 chrome Chapter* roll-ups untouched (D1 artifact-ref family)
```

---

## Batch 7 — Docs + ADR refs + payload comments + pilot report

### Task 30 — Update `chapter-components.md` reference

**File:** `docs/website/reference/chapter-components.md`

- Update parent-ref tables: `<RetrievalPrompt chapter>` → `<RetrievalPrompt unit>` etc.
- Document the D1 split explicitly: artifact-ref vs parent-ref prop families.
- Keep `<ChapterRef chapter>` + 7 `Chapter*` roll-ups table intact.

### Task 31 — ADR 0067 revision note

**File:** `docs/website/decisions/0067-section-level-artifacts.md`

Add a "Revision history" line: `2026-05-22 (W3): Per-callsite parent-ref field rename chapter → unit. UnitEntry.chapter binding preserved per D7. See [W3 design doc](../plans/2026-05-22-wedge-b-followup-w3-design.md).`

### Task 32 — Regenerate `validation.md`

Per `feedback_validation_dashboard_regen`: any ADR `validation:` block touched triggers regen.

```bash
pnpm turbo run docs:regen-validation || pnpm exec node scripts/regen-validation-dashboard.ts
```

Confirm `validation.md` diff is reasonable.

### Task 33 — `audit-baseline.md` (only if smoke audit shifts)

**File:** `docs/website/reference/audit-baseline.md`

W3 is naming-only — counts should be stable (0 errors / 14 warnings / 7 infos). If `pnpm turbo run audit --filter=examples/smoke` shows different counts, investigate as a regression BEFORE updating the baseline.

### Task 34 — `TextbookLayout.astro` payload comments

**File:** `packages/astro/src/components/TextbookLayout.astro`

Any inline comment mentioning `entry.chapter` reads → `entry.unit`. SSR payload script-tag IDs (`sophie-pedagogy-…`) stay (D5).

### Task 35 — Pilot report Shape α

**File:** `docs/website/pilots/wedge-b-followup-w3-callsite-rename.md`

Mirror W2's pilot report structure:
- §Pilot context (platform self-migration framing)
- §Shortcode → component dictionary (N/A — no Quarto)
- §Pedagogy structure map (inherited from W2)
- §Pedagogical decisions log (W3-specific)
- §Time spent per phase (captured during execution)
- §Surprises (any deviations from the ~260–270 site estimate, the python-regex precision, etc.)
- §Recommendations + ADR backlog
- §Platform issues to file (expected: zero gaps; W3 is mechanical)
- §Success criteria (the verification table from the design doc)

### Task 36 — Verify docs + commit

```bash
pnpm exec biome check docs/ 2>&1 | grep -E "(error|warning)" | head
```

Commit:

```
docs(W3): chapter-components, ADR 0067 revision, validation regen, pilot report (W3 batch 7)
```

---

## Batch 8 — Pre-PR gates + code review + PR

### Task 37 — Pre-PR lockfile check

```bash
pnpm install --frozen-lockfile
```

Must succeed cleanly per `feedback_pre_pr_lockfile_check`.

### Task 38 — Port 4321 clean (per `project_local_dev_pagefind_e2e_pitfall`)

```bash
lsof -nP -iTCP:4321 -sTCP:LISTEN || echo "(port 4321 clean)"
```

If anything's listening, kill it before e2e.

### Task 39 — Biome (grep-verified)

```bash
pnpm exec biome check 2>&1 | tee /tmp/w3-biome.log
grep -E "(error|warning)" /tmp/w3-biome.log
```

Expected: zero matches.

### Task 40 — Full build (`--force` per W2 R5)

```bash
pnpm turbo run build --force
```

Smoke build should report: 12 pages, 125 pedagogy entries.

### Task 41 — Full unit-test suite

```bash
pnpm turbo run test
```

All 3 packages green (~2,005 tests).

### Task 42 — E2e

```bash
pnpm turbo run e2e --filter=examples/smoke
```

Expected: 157 passing + 5 skipped.

### Task 43 — Audit baseline check

```bash
pnpm turbo run audit --filter=examples/smoke
```

Expected: 0 errors / 14 warnings / 7 infos.

### Task 44 — `superpowers:requesting-code-review`

Invoke the code-review subagent against the W3 branch diff. Address every Critical + Important finding inside the W3 branch BEFORE PR open (W2 lesson: review caught 2 production C1 bugs that unit tests missed).

### Task 45 — Open PR (Anna text-confirm required)

**STOP and ask Anna for explicit text-confirm per `feedback_no_questions_mode_scope`** before running:

```bash
gh pr create --title "feat(W3): per-callsite chapter → unit rename + Slug normalization" --body @docs/plans/2026-05-22-wedge-b-followup-w3-pr-body.md
```

Squash-merge per ADR 0055.

---

## Final residue check (run before Batch 8)

```bash
# Should return ONLY: UnitEntry.chapter, ChapterRef + 7 chrome roll-ups, comments mentioning "chapter" as educator vocabulary, and CLI prefix-word strings
rg -n '\bchapter:\s' packages/ examples/smoke/src/
```

Any other hit is a missed rename — investigate before pre-PR gates.

---

## Risks + mitigations

See master plan (`~/.claude/plans/sophie-wedge-b-followup-w3-immutable-fern.md` §Risks). Key risks: missed grep hit (residue check), python-regex over-applies on `unit.test.ts` (exclude or restore-by-hand), error-message prose accidentally renamed (D2 discipline — runner.test.ts assertions lock it).
