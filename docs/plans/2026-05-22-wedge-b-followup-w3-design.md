---
date: 2026-05-22T00:00:00.000Z
tags:
  - design
  - wedge-b-followup
  - w3
  - pedagogy-index
  - per-callsite-rename
  - migration
status: accepted-design
related:
  - "[Wedge B-followup W1 Design](2026-05-22-wedge-b-followup-design.md)"
  - "[Wedge B-followup W2 Design](2026-05-22-wedge-b-followup-w2-design.md)"
  - "[ADR 0067 — Section / Subsection / Unit / Artifact](../decisions/0067-section-level-artifacts.md)"
  - "[ADR 0064 — Chapter-Migration Playbook](../decisions/0064-chapter-migration-playbook.md)"
  - "[ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md)"
  - "[ADR 0007 — Persistence](../decisions/0007-persistence.md)"
---

# Wedge B-followup W3 — Design (per-callsite `chapter:` → `unit:` rename)

## 1. Goal & context

**Goal.** Rename the per-callsite parent-ref field `chapter` →
`unit` across every pedagogy-index entry schema, extractor emitter,
accumulator method, audit invariant + Finding location field,
`useInteractive*` hook signature, IndexedDB key dimension,
BroadcastChannel helper, and the five parent-ref React component
props (`<Reflection>`, `<LearningObjectives>`, `<RetrievalPrompt>`,
`<SpacedReview>`, `<SkillReview>`). Keep `chapter` everywhere it
binds to a reading-artifact slug (the D7 vocabulary lock):
`UnitEntry.chapter`, `<ChapterRef chapter>`, and the seven chrome
`Chapter*` roll-ups (`<ChapterGlossary>`, `<ChapterEquations>`,
`<ChapterFigures>`, `<ChapterKeyInsights>`,
`<ChapterMisconceptions>`, `<ChapterMultiReps>`, `<ChapterTDRs>`).

**Trigger.** W1 ([PR #157](https://github.com/drannarosen/sophie/pull/157),
`7f9b25f`) surfaced `Section`/`Unit` in `PedagogyIndex` and graduated
PRA-1 + SR-1. W2 ([PR #159](https://github.com/drannarosen/sophie/pull/159),
`d5dbcf7`) moved chapter MDX into ADR 0067's file layout, surfaced
`ArtifactEntry`, and deleted `ChapterEntrySchema` + `ModuleEntrySchema`.
Both wedges preserved the literal `chapter:` field NAME on ~15
per-callsite entry schemas with the W2/D4 1:1 convention making the
unit id equal to the chapter slug. W3 is the locked-in third wedge of
the four-wedge migration sequence (W1 → W2 → **W3** → W4).

**Pre-launch posture.** Per `feedback_no_backcompat_prelaunch`: zero
production students; every consumer of the renamed field migrates
inside W3's single PR. No dual-shape bridges past this wedge.

**Why now.** W2 made the 1:1 convention an architecturally
transitional shape. Holding `entry.chapter` as a parent-ref past W3
creates a vocabulary mismatch: `unit.chapter` (reading-artifact
binding, D7-locked) versus `entry.chapter` (parent-unit id). Every
future AI extraction + author + reviewer must disambiguate the two
meanings. W3 collapses the ambiguity inside one wedge.

## 2. Locked design decisions (settled in 2026-05-22 brainstorm)

### D1 — Split component-prop renaming by semantic role

Component props in Sophie's runtime fall into two semantic roles:

- **Parent-ref props** (the IDB key dimension at the JSX surface):
  the value names the Unit this callsite lives in. RENAMES
  `chapter` → `unit`.
- **Artifact-ref props** (a reading-artifact identifier): the value
  names a reading.mdx slug (== `UnitEntry.chapter`, D7-locked).
  KEEPS `chapter`.

| Component | Role | W3 action |
|---|---|---|
| `<Reflection course chapter id prompt>` | parent-ref | RENAME → `unit` |
| `<LearningObjectives chapter>` | parent-ref | RENAME → `unit` |
| `<RetrievalPrompt chapter target …>` | parent-ref | RENAME → `unit` |
| `<SpacedReview chapter target=…>` | parent-ref | RENAME → `unit` |
| `<SkillReview chapter target=…>` | parent-ref | RENAME → `unit` |
| `<ChapterRef chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterGlossary chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterEquations chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterFigures chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterKeyInsights chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterMisconceptions chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterMultiReps chapter='X'>` | artifact-ref | KEEP `chapter` |
| `<ChapterTDRs chapter='X'>` | artifact-ref | KEEP `chapter` |

Implementation queries on artifact-ref components read the renamed
internal field: `definitions.filter(d => d.unit === props.chapter)`.
Under W2/D4 1:1 the strings still match; long-term (multi-reading-
per-unit) the artifact-ref prop becomes the reading-artifact id and
diverges cleanly from the unit-id parent-ref.

**Rationale.** D7's vocabulary lock means "chapter" in author surface
= reading-artifact (textbook chapter). Parent-refs are persistence
keys, conceptually distinct from artifact references. W2 collapsed
both under `chapter` because the 1:1 convention made the strings
equal; W3 separates them at the type/prop layer so the semantic split
is legible.

### D2 — Internal types rename; CLI/audit output keeps "chapter:" prefix

- Internal: `Finding.location.chapter?: string` →
  `Finding.location.unit?: string`. Every audit invariant emits
  `location: { unit: u.id, anchor: e.anchor }` post-W3.
- Author-facing CLI: `chapter:<unit-id>:<line>` prefix word
  preserved. The CLI formats `finding.location.unit` as
  `chapter:<id>:<line>` because the educator's mental model uses
  "chapter" vocabulary per D7. Same for prose error messages
  ("Chapter X is missing an objective" stays).

**Rationale.** Decouples internal consistency from D7's educator
vocabulary lock. Preserves the future option of multi-reading-per-unit
without a second user-facing migration. The CLI's prefix word is
presentation; the field name is data shape — they can carry
different vocabularies without contradiction.

### D3 — Normalize all 15 renamed fields to `Slug`

Pre-W3, the 15 parent-ref `chapter:` fields mix two types:

- 5 use `chapter: NonEmptyString` (in `chapter-meta.ts`,
  `inline-ref.ts`, `intervention.ts`, `multirep.ts`, `unit.ts`)
- 10 use `chapter: Slug` (in `inline-content.ts`, `equation.ts`,
  `figure.ts`, `omi-flow.ts`, `retrieval.ts`)

Post-W3, all 15 become `unit: Slug`. `Slug` is a refinement of
`NonEmptyString` (adds a regex pattern); every existing value
already passes the tighter type. Mechanical, bundled in the schema
batch.

**Rationale.** The current split is historical accident, not
design intent. Normalizing now (zero blast radius — same value
space) avoids a second hygiene PR later.

### D4 — Method names + key-shape rename follow the field rename

- `Accumulator.clearChapter(slug)` → `clearUnit(id)`;
  `clearChapterCitations(slug)` → `clearUnitCitations(id)`.
- `ResponseStore.clearChapter(profile, chapter)` →
  `clearUnit(profile, unit)`; `getAllMulti(profile, chapters, …)`
  → `getAllMulti(profile, units, …)`; all 3 implementations
  (IndexedDB/Fallback/Memory) follow.
- `compositeKey(profile, chapter, key)` →
  `compositeKey(profile, unit, key)`; `chapterKeyRange` →
  `unitKeyRange`.
- `BroadcastChannel.chapterChannelName(course, chapter)` →
  `unitChannelName(course, unit)`.
- `AuditExtras.draftChapterSlugs` → `draftUnitIds` (explicit W3
  debt comment at `chapter-status.ts:15` documented this rename).
- IDB key dimension `(profile, chapter, key)` →
  `(profile, unit, key)`. Pre-launch — no data migration; the
  rename is API-surface only and dev databases re-seed cleanly.

**Rationale.** Method names + parameter names + variable names
should match the field they operate on. Leaving `clearChapter`
operating on `unit:` data creates the same vocabulary mismatch the
field rename was meant to fix.

### D5 — SSR payload script-tag ids stay; bodies carry renamed field

`<script id='sophie-pedagogy-definitions'>` etc. — the payload IDs
are collection names not field names; no rename needed. Payload
BODIES carry entries with the renamed `unit:` field (mechanical
follow-on of the schema rename). `TextbookLayout.astro` comments
mentioning `entry.chapter` reads update to `entry.unit`.

### D6 — Pilot report Shape α (platform self-migration)

File: `docs/website/pilots/wedge-b-followup-w3-callsite-rename.md`
(not a real consumer chapter slug). Adapts the locked ADR 0064 TDR
template with the *platform self-migration* framing established by
W2's pilot. ADR 0064 §4's structural-density-diversity criterion
applies to the NEXT real consumer migration (astr201-sp26 will pick
up the W3-renamed shape automatically when its first re-migration
runs), not to this synthetic-fixture rename.

**W2 Recommendation R1 applied.** Phase 1 consumer-touch-point
enumeration counted ~260–270 sites + ~138 inline test-fixture
literals. Pilot report calibrates surprise budget against that
estimate.

## 3. Implementation summary (8 batches, ~24 numbered tasks)

Plan executed end-to-end on `feat/wedge-b-followup-w3`. Plan agent
NOT launched in Phase 2 — Phase 1 enumeration was exhaustive and the
design is mechanical; the cost of the Plan agent would not have
changed the outcome.

| Batch | Tasks | Scope |
|---|---|---|
| 1 | T1–T3 — worktree + design doc + plan doc | This file lands in Batch 1 |
| 2 | T4–T7 — schema layer (`@sophie/core`) | 15 entry schemas + `audit.ts` Finding |
| 3 | T8–T11 — extractors + accumulator | 14 extractors + accumulator state + methods |
| 4 | T12–T18 — audit invariants + types | ~40 invariant reads + Finding type + `draftChapterSlugs` rename |
| 5 | T19–T24 — runtime hooks + ResponseStore + IDB + Broadcast | ~25 sites |
| 6 | T25–T29 — parent-ref component props + smoke MDX callsites | 5 components + ~10 MDX callsites |
| 7 | T30–T36 — docs + ADR refs + payload comments + pilot report | `chapter-components.md`, `audit-baseline.md`, `validation.md`, ADR 0067 revision, pilot |
| 8 | T37–T45 — pre-PR gates + code review + PR open | Anna text-confirm required for PR open |

## 4. Critical files modified

### Schema (`@sophie/core`)

- `packages/core/src/schema/pedagogy-index-entries/chapter-meta.ts` (ObjectiveEntry — RENAME)
- `packages/core/src/schema/pedagogy-index-entries/inline-ref.ts` (RENAME)
- `packages/core/src/schema/pedagogy-index-entries/inline-content.ts` (4 entry types — RENAME)
- `packages/core/src/schema/pedagogy-index-entries/equation.ts` (RENAME)
- `packages/core/src/schema/pedagogy-index-entries/figure.ts` (RENAME)
- `packages/core/src/schema/pedagogy-index-entries/omi-flow.ts` (RENAME)
- `packages/core/src/schema/pedagogy-index-entries/retrieval.ts` (3 entry types — RENAME)
- `packages/core/src/schema/multirep.ts` (RENAME)
- `packages/core/src/schema/intervention.ts` (RENAME)
- `packages/core/src/schema/audit.ts` (Finding.location — RENAME)
- **NOT touched:** `packages/core/src/schema/pedagogy-index-entries/unit.ts:48` (D7 lock — UnitEntry.chapter is the reading-artifact binding)

### Accumulator + audit (`@sophie/astro`)

- `packages/astro/src/lib/pedagogy-index/accumulator.ts` (state map keys + method names)
- `packages/astro/src/lib/pedagogy-index/extractors/*.ts` (14 files — field-emit rename)
- `packages/astro/src/lib/pedagogy-audit/types.ts` (Sink + Finding types + AuditExtras.draftChapterSlugs → draftUnitIds)
- `packages/astro/src/lib/pedagogy-audit/context.ts`
- `packages/astro/src/lib/pedagogy-audit/invariants/*.ts` (~10 files — ~40 entry.chapter reads)
- `packages/astro/src/lib/pedagogy-audit/invariants/chapter-status.ts` (W3-debt comment removed)

### Runtime (`@sophie/components`)

- `packages/components/src/runtime/useInteractive.ts`
- `packages/components/src/runtime/useInteractiveRange.ts`
- `packages/components/src/runtime/useInteractiveRangeMulti.ts`
- `packages/components/src/runtime/useSelfAssessment.ts`
- `packages/components/src/runtime/ResponseStore.ts` (interface + compositeKey + chapterKeyRange)
- `packages/components/src/runtime/IndexedDBResponseStore.ts`
- `packages/components/src/runtime/FallbackResponseStore.ts`
- `packages/components/src/runtime/MemoryResponseStore.ts`
- `packages/components/src/runtime/BroadcastChannel.ts` (chapterChannelName → unitChannelName)

### Components (parent-ref family — RENAME prop)

- `packages/components/src/components/Reflection/*`
- `packages/components/src/components/LearningObjectives/*`
- `packages/components/src/components/RetrievalPrompt/*`
- `packages/components/src/components/SpacedReview/*`
- `packages/components/src/components/SkillReview/*`

### Components (artifact-ref family — NOT touched per D1)

- `packages/components/src/components/ChapterRef/*`
- `packages/components/src/components/ChapterGlossary/*` + 6 sibling chrome roll-ups

### Smoke

- `examples/smoke/src/content/sections/**/units/**/reading.mdx` (parent-ref callsites only — ~10 sites)
- `examples/smoke/e2e/*.spec.ts` test selectors that reference parent-ref props (if any)

### Docs (bundled per `feedback_docs_no_drift`)

- `docs/website/reference/chapter-components.md` (parent-ref tables + D1 split documented)
- `docs/website/reference/audit-baseline.md` (only if smoke audit counts shift — W3 is naming-only)
- `docs/website/status/validation.md` (regen if any ADR validation block touched)
- `docs/plans/2026-05-22-wedge-b-followup-w3-design.md` (this file)
- `docs/plans/2026-05-22-wedge-b-followup-w3.md` (engineer-facing plan)
- `docs/website/pilots/wedge-b-followup-w3-callsite-rename.md` (pilot report)

## 5. Verification

| Surface | Expected |
|---|---|
| `pnpm exec biome check` | 0 errors / 0 warnings (full-output grep-verified per `feedback_biome_verification`) |
| `pnpm turbo run test` (all 3 packages) | Pass (~2,005 unit tests + renamed fixtures, count-stable) |
| `pnpm turbo run build --force` | Smoke build: 12 pages, 125 pedagogy entries (count-stable; W3 is naming-only) |
| `pnpm turbo run audit --filter=examples/smoke` | 0 errors / 14 warnings / 7 infos (matches W2 post-merge baseline) |
| `pnpm turbo run e2e --filter=examples/smoke` | 157 e2e + 5 skipped |
| `pnpm install --frozen-lockfile` | Clean (no lockfile drift) |
| Manual dev open | `<ChapterRef chapter="…">` resolves; `<RetrievalPrompt unit="…">` persists; `<SpacedReview unit="…" section="…">` renders; `<LearningObjectives unit="…">` persists |
| `superpowers:requesting-code-review` | All Critical + Important addressed in same branch pre-PR-open |
| Final residue grep `rg -n '\bchapter:\s' packages/` | Returns only artifact-ref hits + `UnitEntry.chapter` (D7) + comments |

## 6. Out of scope (deferred to W4 or later)

- **W4** — Library room (top-level `/library/`), bridge rooms (Section[bridge] at Course root), 8 registry Spec pages, `<SkillReview>` self-closing topic-registry resolution.
- **Slides.mdx extraction** + `<LectureRef lecture>` component.
- **FSRS scheduler swap** (Wedge D).
- **BKT mastery + adaptive `<SkillReview>` prominence** (Wedge E).
- **Cockpit** (ADR 0076) — separate sprint.
- **Auth-server identity** — replaces `getUserId()` post-launch.
- **`<ChapterRef>` component-name rename to `<ReadingRef>`** — D7 vocabulary lock keeps the educator-facing name; defer indefinitely.
- **`chapter-meta.ts` filename rename to `objective-meta.ts`** — cosmetic; defer to a separate hygiene PR.
- **Multi-reading-per-unit shape** — D2's internal/external split makes this possible without further migration when the need arises.

## 7. References

- [ADR 0067 — Section / Subsection / Unit / Artifact](../decisions/0067-section-level-artifacts.md) — file-layout convention activated by W2; W3 normalizes the per-callsite vocabulary against it.
- [ADR 0064 — Chapter-Migration Playbook](../decisions/0064-chapter-migration-playbook.md) — pilot-report template (Shape α inherited from W2).
- [ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md) — eight-role taxonomy preserved across W3.
- [ADR 0007 — Persistence](../decisions/0007-persistence.md) — IDB key dimension `(profile, chapter, key)` → `(profile, unit, key)` rename happens at this layer.
- [W1 design doc](2026-05-22-wedge-b-followup-design.md) — canonical four-wedge sequence; W3 cited in W1 §3.
- [W2 design doc](2026-05-22-wedge-b-followup-w2-design.md) — W2/D4 1:1 convention enables W3's clean rename.
- [W2 pilot report](../website/pilots/wedge-b-followup-w2-smoke-migration.md) — recommendations R1 + R2 + R3 inform W3's process.
- [W3 plan](2026-05-22-wedge-b-followup-w3.md) — engineer-facing implementation tasks.
- [W3 pilot report](../website/pilots/wedge-b-followup-w3-callsite-rename.md) — Shape α (ADR 0064 §2 template adapted for platform self-migration).
- [Master plan (working artifact)](~/.claude/plans/sophie-wedge-b-followup-w3-immutable-fern.md)
