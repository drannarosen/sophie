---
date: 2026-05-22T00:00:00.000Z
tags:
  - design
  - wedge-b-followup
  - w2
  - artifacts
  - file-layout-migration
  - pedagogy-index
status: accepted-design
related:
  - "[Wedge B-followup W1 Design](2026-05-22-wedge-b-followup-design.md)"
  - "[ADR 0067 — Section / Subsection / Unit / Artifact](../decisions/0067-section-level-artifacts.md)"
  - "[ADR 0064 — Chapter-Migration Playbook](../decisions/0064-chapter-migration-playbook.md)"
  - "[ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md)"
  - "[Course-Website Platform Roadmap](../status/course-website-roadmap.md)"
---

# Wedge B-followup W2 — Design (file-layout migration + ChapterEntry/ModuleEntry deletion + ArtifactEntry surfacing)

## 1. Goal & context

**Goal.** Move smoke chapter MDX into ADR 0067's canonical
`sections/<section-id>/units/<unit-id>/reading.mdx` file layout;
surface `ArtifactEntry` as a first-class collection in
`PedagogyIndex`; delete `ChapterEntrySchema` + `ModuleEntrySchema`
and every consumer in the same PR; rewrite routes from
`/chapters/<slug>` to `/units/<unit-id>/reading`; produce a pilot
report per ADR 0064.

**Trigger.** Wedge B-followup W1 ([PR #157](https://github.com/drannarosen/sophie/pull/157),
merged 2026-05-22 as commit `7f9b25f`) shipped Section + Unit in
`PedagogyIndex` and graduated PRA-1 (Unit-aware) + SR-1
(section-validity) + `<SpacedReview section=>` rendering. W1 left
`chapters/` + `modules/` content collections in smoke as a
transitional shape per its D3. W2 is the locked-in second wedge of
the four-wedge migration sequence (W1 → **W2** → W3 → W4).

**Pre-launch posture.** Per `feedback_no_backcompat_prelaunch`:
zero production students; every consumer of the deleted shapes
migrates in W2's single PR. No dual-shape bridges past this wedge.

## 2. Locked design decisions (settled in 2026-05-22 brainstorm)

### D1 — Path A: `ArtifactEntry` as first-class collection

Single `artifacts` content collection in smoke; glob loader walks
`sections/**/*.mdx`. Each MDX carries minimal frontmatter (`id`,
`title`, `references?`); the loader path-derives `type` (basename:
`reading.mdx` → `'reading'`), `scope` (under `units/` →
`'unit'`; directly under `sections/<sec>/` → `'section'`), and
parent refs (`unit_id`, `section_id` from path position).

`PedagogyIndexSchema.artifacts: ArtifactEntry[]` surfaces with
`.default([])` for forward compat. `ArtifactEntry` is a
discriminated union over `scope` (unit | section): unit-scope
variants carry `unit_id` + `section_id`; section-scope variants
carry `section_id` only.

**Rationale.** Matches ADR 0067 §"Implementation notes" verbatim.
Single discriminated schema scales to all 20 ArtifactType variants
without per-type collection bloat. Path-derivation means zero
redundant author metadata. Path A locked over Path B
("artifacts-only-for-non-readings") because pre-launch is the right
time to lock the SoTA shape; Path B front-loads tech debt for every
new artifact type.

### D2 — Placement 1: `status` + `framing` on `UnitEntry`

`UnitSchema` gains:

- `status: ChapterStatus` (required) — `draft | review | stable`,
  imported from `chapter.ts` per DRY
- `framing: ChapterFraming.optional()` — currently `OMI` only
- `description: z.string().optional()` — for `<ChapterRef>` hover-preview

All audit invariants currently iterating `index.chapters[]` rewrite
to iterate `index.units[]` (`u.status`, `u.framing`, etc.). CS2
draft-detection populates from `units.filter(status === 'draft')`
in `TextbookLayout`.

**Rationale.** W2 has no slides.mdx — per-artifact `status` is
YAGNI. Cleanest migration: rename `ch` → `u`, swap collections,
read same fields. If/when slides extraction surfaces per-artifact
maturity needs, Placement 1 → Placement 2 (status on ArtifactEntry)
is a mechanical follow-up.

### D3 — `<ChapterRef>` component-name preserved; prop renamed `slug` → `chapter`

D7's vocabulary lock (reading = chapter, slides = lecture) means
`<ChapterRef>` is semantically a *reading-artifact reference*, not
a Unit reference. Component name stays; prop renames `slug` →
`chapter` to match `UnitEntry.chapter` field + the inline-ref
convention (`<RetrievalPrompt target>`, `<SpacedReview chapter>`).

**Under the hood (W2):** `<ChapterRef chapter>` reads
`artifactStore.lookup(chapter)` → `unitStore.lookup(artifact.unit_id)`
→ `sectionStore.lookup(unit.section_id)`. Hover-preview: section
title → unit title → unit description. `href` →
`/units/<chapter>/reading`.

**Deletions in W2:** `chapters-store.ts` + `modules-store.ts` +
`__setChapters` + `__setModules` + `ChapterEntrySchema` +
`ModuleEntrySchema` + their test blocks.

**New:** `artifacts-store.ts` runtime + `__setArtifacts` setter +
`sophie-pedagogy-artifacts` script-tag payload + `artifactStore`
wired through ChapterRef.

`<LectureRef lecture>` is the future analog for slides; lands in
the wedge that ships slides extraction.

### D4 — Artifact id = unit id (W2's 1:1 convention)

For W2's strict one-reading-per-Unit case,
`ArtifactEntry.id === UnitEntry.id` for the reading artifact:

- `unit.chapter` value = unit id (== artifact id)
- per-callsite extractor `chapter: string` field values = unit id
- URLs of form `/units/<unit-id>/reading` resolve the same string

Future Units with multiple reading-shape artifacts (worked-example
+ primary reading) suffix the artifact id (`<unit-id>-worked-example`).
Not exercised in W2.

### D5 — URL shape `/units/<unit-id>/reading`; route `pages/units/[unit]/reading.astro`

Locked by ADR 0067 §2.3. Route file is one-per-artifact-type for
W2 (only `reading.astro`); promotes to
`pages/units/[unit]/[artifact].astro` when slides land. Existing
`pages/chapters/[...slug].astro` DELETED.

All `/chapters/<slug>` URL builders rewrite to
`/units/<unit-id>/reading` (and `/chapters/<slug>#anchor` →
`/units/<unit-id>/reading#anchor`) across:

- 7 chrome components: `CourseKeyInsights`, `CourseGlossary`,
  `CourseObjectives`, `ChapterPagination`, `ModuleNav`,
  `CourseFigures`, `CourseMisconceptions`
- 5 pagefind-converters
- 1 smoke entry: `pages/index.astro`

### D6 — Slides.mdx deferred

No slides.mdx in W2 fixtures. `UnitEntry.lecture?` field name
persists per W1/D7; field stays optional + unpopulated. Slides
extraction is a separate future wedge.

### D7 — Pilot report Shape α: adapted ADR 0064 template, framed as platform-migration pilot

File: `docs/website/pilots/wedge-b-followup-w2-smoke-migration.md`
(not a real consumer chapter slug).

Adapts the locked TDR template:

- *Pilot context* explicitly frames as platform self-migration.
  ADR 0064 §4's structural-density-diversity criterion applies to
  the NEXT real consumer migration (astr201-sp26 post-W2), not to
  this synthetic-fixture migration.
- *Shortcode dictionary* marked "N/A — no Quarto source; platform
  self-migration."
- *Pedagogy structure map* uses `spectra-and-composition` as the
  worked-example unit (highest MultiRep + OMI density in smoke).
- All other sections filled normally.

## 3. Implementation summary (26 numbered tasks across 8 batches)

Plan executed end-to-end on `feat/wedge-b-followup-w2`. Key
checkpoint commits:

| Batch | Tasks | Commit range |
|---|---|---|
| 1 | T1–T4 — worktree + schema foundation | `14c5d75 → ded7de4` |
| 2 | T5–T7 — accumulator + runtime stores | `00a5f70 → 95cbf94` |
| 3 | T8–T11 — file-layout move + content config + orchestrator | `a47ab6c → f7d2454` |
| 4 | T12 — 8 audit invariants migrated | `cbf5903` |
| 5 | T13–T17 — TextbookLayout + ChapterLayout + URL builders + routes | `cb60302 → b217e88` |
| 6 | T18–T19 — chapters-store/modules-store deletion + ChapterRef rewire | `130eb5f` |
| 7 | T20–T21 — schema deletions + chrome page cleanup | `2a241a2 → 0bfddb4` |
| 8 | T22–T23 — stale-doc sweep + pilot report | this PR |

## 4. Critical files modified

### Schema (`@sophie/core`)

- `packages/core/src/schema/unit.ts` — gained status/framing/description (W2/D2)
- `packages/core/src/schema/pedagogy-index-entries/artifact.ts` — new (W2/D1)
- `packages/core/src/schema/pedagogy-index-entries/chapter-meta.ts` — ChapterEntry+ModuleEntry deleted; ObjectiveEntry kept
- `packages/core/src/schema/pedagogy-index.ts` — artifacts slot added; chapters+modules slots removed

### Accumulator + audit (`@sophie/astro`)

- `packages/astro/src/lib/pedagogy-index/accumulator.ts` — setArtifacts added; setChapters+setModules deleted
- `packages/astro/src/lib/pedagogy-index/orchestrator.ts` — glob filter `content/chapters/**` → `content/sections/**/reading.mdx`
- `packages/astro/src/lib/pedagogy-audit/context.ts` + 6 invariant files — iterate index.units
- `packages/astro/src/lib/artifacts-from-collection.ts` — new path-derivation helper (W2/D1)
- `packages/astro/src/lib/get-student-chapters.ts` — DELETED

### Runtime (`@sophie/components`)

- `packages/components/src/runtime/artifacts-store.ts` — new (W2/D3)
- `packages/components/src/components/ChapterRef/` — prop rename + lookup chain rewire; chapters-store + modules-store DELETED

### Chrome (`@sophie/astro`)

- `packages/astro/src/components/TextbookLayout.astro` — drops getCollection('chapters'/'modules'); adds getCollection('artifacts')
- `packages/astro/src/components/CourseObjectives.astro` — iterates index.units + index.sections
- 7 chrome components + 5 pagefind-converters — URL builders rewritten

### Smoke (`examples/smoke`)

- `src/content/sections/<sec>/units/<unit>/reading.mdx` (5 NEW files; moved per ADR 0064 §1 step 5)
- `src/content/chapters/` + `src/content/modules/` — DELETED
- `src/content.config.ts` — rewritten; artifacts collection added
- `src/pages/units/[unit]/reading.astro` — NEW
- `src/pages/chapters/[...slug].astro` — DELETED
- `src/pages/{index,figures,glossary,key-insights,misconceptions,objectives,equations}.astro` — migrated to sections+units shape
- `src/layouts/ChapterLayout.astro` — rewired for sections+units
- `src/content/units/*.json` (5) — gained status + framing + description

## 5. Verification

| Surface | Result |
|---|---|
| `@sophie/core` unit (461 tests) | pass |
| `@sophie/components` unit (692 tests) | pass |
| `@sophie/astro` unit (audit + accumulator + helpers) | pass |
| typecheck (core + astro + components) | clean |
| biome check | clean (zero errors, zero warnings) |
| smoke build | **green: 12 pages, 125 pedagogy entries** |
| smoke audit | **0 errors, 14 warnings, 7 infos** (matches W1 projected post-W2 baseline) |
| W2 routes available | `/units/{spectra-and-composition,measuring-the-sky,spoiler-alerts,misconception-fixture,stellar-evolution}/reading` |

## 6. Out of scope (deferred to W3 / W4 / later wedges)

- **W3:** per-callsite `chapter: string` → `unit: string` field
  rename across all ~13 entry schemas + `useInteractive` /
  `useInteractiveRange` / `useInteractiveRangeMulti` parameter
  rename + audit-invariant per-callsite property rewrites
- **W4:** Library room (top-level `/library/`) + bridge rooms +
  8 registry Spec pages + `<SkillReview>` self-closing topic-registry
  resolution
- **Slides.mdx extraction** (and `<LectureRef lecture>`) —
  `UnitEntry.lecture?` stays optional + unused through W2
- **Per-artifact `status`** (Placement 2/3 migration) — mechanical
  follow-up if/when slides extraction exposes the need
- **`ArtifactRef` cross-artifact reference component** — future wedge
  once multiple artifact types coexist per Unit
- **Subsection rendering** — auto-grouping default suffices

## 7. References

- [ADR 0067 — Section / Subsection / Unit / Artifact](../decisions/0067-section-level-artifacts.md) — file-layout convention activated by W2
- [ADR 0064 — Chapter-migration playbook](../decisions/0064-chapter-migration-playbook.md) — pilot-report template (Shape α adapts it)
- [ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md) — eight-role taxonomy that the W2 audit migration respects
- [W1 design doc](2026-05-22-wedge-b-followup-design.md) — canonical four-wedge sequence; W2's mandate spelled out in §3
- [W1 plan](2026-05-22-wedge-b-followup.md) — 21-task plan that W2 mirrors in shape
- [W1 quality audit](../reviews/2026-05-22-wedge-b-followup.md) — A-grade A− (90/100); W2 picks up the backlog items P3.1 + P4.x
- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) — 27-decision plan; W2 lands the file-layout activation row
- [W2 pilot report](../pilots/wedge-b-followup-w2-smoke-migration.md) — Shape α (ADR 0064 §2 template adapted for platform self-migration)
