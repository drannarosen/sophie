---
title: 'Pilot report: Wedge B-followup W2 — smoke platform self-migration'
short_title: 'Pilot: W2 smoke migration'
description: 'W2 file-layout activation pilot — moving the smoke fixture chapter MDX into ADR 0067 sections/<sec>/units/<unit>/reading.mdx, deleting ChapterEntry+ModuleEntry, surfacing ArtifactEntry, and rewriting routes. Shape α — adapts ADR 0064 template for platform self-migration (not a consumer chapter migration).'
authors:
  - name: Anna Rosen
date: 2026-05-22
---

## Pilot context

**What this pilot migrated.** The Sophie repo's `examples/smoke`
fixture — all 5 synthetic chapters and the surrounding platform —
graduated to ADR 0067's canonical content shape. Per W2/D1 (Path A)
the chapter MDX moved from `examples/smoke/src/content/chapters/`
to `examples/smoke/src/content/sections/<section-id>/units/<unit-id>/reading.mdx`;
`ArtifactEntry` surfaces as a first-class collection in
`PedagogyIndex`; `ChapterEntrySchema` + `ModuleEntrySchema` are
deleted with every consumer migrated in the same PR; routes
graduate to `/units/<unit-id>/reading`. The eight audit invariants
that previously iterated `index.chapters[]` now iterate
`index.units[]`.

**Why now.** Wedge B-followup W1 ([PR #157](https://github.com/drannarosen/sophie/pull/157),
merged 2026-05-22) surfaced `Section[]` + `Unit[]` in
`PedagogyIndex` and graduated PRA-1 + SR-1 + the `<SpacedReview section>`
render path. W1 left the legacy `chapters/` + `modules/` content
collections in smoke as a transitional shape per its D3, scheduled
to land in W2. This PR is the lock-in.

**Per ADR 0064 §4 — structural-density-diversity criterion.** This
pilot is a *platform self-migration*, not a consumer-chapter
migration. The synthetic smoke fixtures are designed to exercise
platform invariants, not to teach physics; the structural-density
profile question (M2-L3 was OMI-heavy + GlossaryTerm-dense) applies
to the NEXT *real* consumer chapter migration (ASTR 201's first
chapter to re-migrate to the W2 file shape, post-W2). The W2 pilot
report deliberately adapts ADR 0064's TDR template for the
platform-pilot case rather than the consumer-chapter case.

**What's explicitly out of scope.** W3 per-callsite
`chapter: string` → `unit: string` rename, W4 Library / bridge rooms
/ registry Spec pages, slides extraction (`UnitEntry.lecture?` stays
optional + unused), per-artifact `status`, and any
content-shape evolution beyond what ADR 0067 + the W1 design doc
already locked.

## Shortcode → component dictionary

**N/A — platform self-migration.** This pilot does not convert
Quarto / `.qmd` / `.tex` source to Sophie MDX. The 5 chapter MDX
files were already Sophie-shape from earlier work; W2 moves them
on disk and rewires the surrounding platform. No new authoring
shortcodes were introduced or eliminated.

(Per ADR 0064 §2's "not applicable, because…" instruction: the
section appears explicitly with a reason rather than being omitted.)

## Pedagogy structure map

### OMI arcs

The worked-example unit `spectra-and-composition` carries the OMI
arcs first locked in the M2-L3 pilot ([pilots/m2-l3-spectra-composition.md](m2-l3-spectra-composition.md))
and inherited verbatim by smoke. W2 does not change the OMI arcs;
it changes where the unit declares them (now under
`sections/stars/units/spectra-and-composition/reading.mdx` instead
of `chapters/02-stars/spectra-and-composition.mdx`).

| Arc | Observable | Model | Inference | `<OMIFlow id=…>` |
|---|---|---|---|---|
| (inherited from M2-L3 pilot — see that report) | — | — | — | — |

### Eight-role component-mapping decisions

W2 is structural — no new eight-role assignments. The audit migration
(Task 12) preserves OF-2 (`framing: "OMI"` → must render ≥1
`<OMIFlow>`) verbatim: framing now lives on `UnitEntry` instead of
`ChapterEntry`, but the invariant fires on the same set of units
that previously fired as chapters. Per W2/D4 1:1, the
`location.chapter` field in audit findings preserves the same
string values.

### Multi-representation usage

W2 does not change `<MultiRep>` callsites. The smoke fixture
preserves its 5 MultiRep bindings (3 in `spectra-and-composition`,
2 in `spoiler-alerts`) unchanged; the extractor's per-callsite
`chapter: string` field continues to key by unit id (per W2/D4
1:1 convention).

## Pedagogical decisions log

W2 is a platform structural migration; pedagogy decisions are
inherited from W1 + earlier wedges. Relevant W2-specific authoring
calls:

- **Smoke `spectra-and-composition.json` prereqs kept as
  `["exponents", "logarithms"]`** (W1 close + cleanup PR #158
  decision; not changed in W2). The two prereqs exercise BOTH halves
  of the PRA-1 Unit-aware audit: `exponents` is covered by
  `spoiler-alerts`'s `<SkillReview target="topic:exponents">` (prior
  Section, no WARN); `logarithms` has no covering SkillReview
  (uncovered, WARN). The audit baseline expects 1 PRA-1 WARN.
- **Unit JSONs gained `description` field** (W2/D2). Each smoke
  unit.yaml's description carries forward the prose previously on
  the chapter MDX frontmatter, so `<ChapterRef>` hover-preview
  text is unchanged for students.
- **Frontmatter `module:` and `slug:` fields stripped from
  reading.mdx files** (W2 Task 8). Both are path-derivable post-W2
  (`section_id` derives from path-position-1; unit id derives from
  path-position-3 == file basename's parent dir); the artifact-
  collection schema requires only `id`, `title`, `references?`
  plus `.passthrough()` for chapter-display fields.

## Time spent per phase

Captured across the focused W2 implementation session
(2026-05-22):

| Phase | Original estimate | Actual |
|---|---|---|
| Phase 1 inventory + design (brainstorm) | 1.5h | ~2h (3 rounds of Q&A on D1/D2/D3/D4/D7) |
| Phase 2 conversion (Tasks 2–21: schema + accumulator + runtime + smoke + audit + URL + routes + ChapterRef + cleanup) | 4h | ~5h (across 21 commits) |
| Phase 3 verification (typecheck + tests + biome + smoke build) | 1h | ~1h |
| Platform-shaping (artifacts-from-collection helper + chrome-page migrations + 6 invariant rewrites + chrome-bug-hunt for /chapters references in 6 chrome pages) | n/a (platform-pilot) | ~1.5h |
| Pilot report + design doc | 1h | ~1h (this doc + the W2 design doc) |

**Conversion vs platform-shaping split.** For this *platform*
pilot, the ratio doesn't reflect a future consumer-chapter
migration — the conversion work *was* the platform work. The first
real consumer-chapter migration on the W2 shape will be a much
lighter touch (mostly just moving MDX into the new layout; the
schema + accumulator + audit + chrome are already migrated).

## Surprises

**1. The deletion blast radius was substantially larger than the
W1 design doc's W2 row implied.** The W1 design doc's W2 row
described "ChapterEntry + ModuleEntry deleted from PedagogyIndex;
ArtifactEntry surfaces; routes rewrite" as 5 chunks. The actual
chunks were 14+ consumer touch points: 6 audit invariants iterating
`index.chapters`, 7 chrome components writing `/chapters/<slug>`
URLs, 5 pagefind-converters, 6 smoke chrome pages calling
`getCollection('modules'/'chapters')`, the `orchestrator.ts` glob
filter, `get-student-chapters.ts`, the `CourseObjectives.astro`
roll-up, the `tsup.config.ts` entry-point list, and 50+ test
fixtures. **Doctrine bump:** future wedge-design docs should
explicitly enumerate consumer touch points before estimating wedge
size. Bug 1 of W2: I estimated 5 distinct tasks; actual was 21.

**2. The smoke build was intentionally broken between Tasks 10 and
13.** After Task 10 (`content.config.ts` rewrite removed
`chapters` + `modules` collections) but before Task 13
(TextbookLayout rewire), the smoke build could not load because the
chrome layer still called `getCollection('chapters')`. This was
expected and signaled in each commit message ("Build will fail
between Tasks 10 and 13 — expected intermediate state"). The
turbo-driven incremental verification path made the intermediate
state cost-free: per-batch unit-test gates kept the package surfaces
green while the smoke build sat broken. **Lesson:** transitional
build-broken states are fine in a long migration as long as the
unit-test surfaces stay green and the commit messages call out the
break window.

**3. The python regex bulk-rewrite saved hours on test fixtures.**
Tasks 12 + 18 + 19 required migrating ~40 inline ChapterEntry /
UnitEntry literals from the old shape to the new. Using a small
python script to apply regex transforms to specific patterns
(`{slug: …, title: …, module: …, status: "stable" as const}` →
`{id: …, type: "lecture" as const, …}`) avoided 40 individual
Edits and the biome auto-format pass picked up the indentation
afterwards. **Lesson:** for any wedge that touches 10+ similarly-
shaped test fixtures, a one-shot python regex pass is faster than
TDD'ing each fixture by hand.

**4. The `astro:content` virtual module can't be imported from
plain `.ts` files in `packages/astro/src/lib/`.** When I wrote
`artifacts-from-collection.ts` initially with
`import type { CollectionEntry } from "astro:content"`, the typecheck
failed because that virtual module only exists in Astro-config
contexts. Solution: define a structural `ArtifactCollectionEntryLike`
type with the minimal shape the helper needs; the Astro-side caller
(TextbookLayout.astro) structurally satisfies it. This pattern is
already established by `get-student-chapters.ts`'s `ChapterLike`
shape. **Lesson:** any helper that processes content-collection
entries should be structural rather than nominally tied to
`astro:content`.

**5. The build cache had to be busted twice during the migration.**
Turbo cached intermediate build outputs from before Task 13's
TextbookLayout rewire; running `pnpm turbo run build --force` was
required to actually exercise the W2-shape chrome. Without
`--force`, the smoke build green-lit a stale dist that still
referenced the deleted chapters/modules collections. **Lesson:**
during a multi-batch structural migration, always run
`pnpm turbo run build --force` for the final per-batch verification;
the cache is a faithful liar.

## Recommendations + ADR backlog

**Recommendations for the next pilot:**

- **R1.** Make consumer-touch-point enumeration a required Phase 1
  step. Before any wedge estimate, grep the codebase for every
  reference to the shapes being deleted; the count of touch points
  is the actual task count.
- **R2.** Adopt the python-regex pattern for bulk test-fixture
  migrations. Document the shape in the W2 plan's "Reusable
  utilities" section so future wedges know to reach for it.
- **R3.** ADR 0064's §5 PR convention says "bundle platform changes
  with the chapter PR by default." W2 demonstrates that for a
  *fat* bundle (14+ consumer touch points), the single PR is still
  the right shape — the alternative (split-by-touch-point) would
  produce ~14 PRs that must all merge in lockstep. **Bundle wins.**

**Candidate ADRs (not drafted here — Anna's call on which earn an ADR):**

- *Tighten ADR 0064 §1's seven-step protocol with an explicit
  "consumer-touch-point enumeration" step.* W2's surprise #1 says
  this should be Phase 1 step 0.
- *Doctrine for "transitional build-broken states are fine."* W2's
  surprise #2 demonstrates the pattern; ADR-able if a third wedge
  follows the same shape.

## Platform issues to file

W2 surfaced **zero platform-component gaps** (ADR 0064 §3 halt-on-gap
rule was not triggered). Every consumer-side fix landed in this PR.

One *follow-up* for the W2 review pass:

- The `audit-baseline.md` SR-1 resolution message ("Check
  `src/content/sections/<slug>.json` exists") is W1-era; post-W2
  the layout is `sections/<sec>/section.yaml` per ADR 0067 (deferred
  to a future wedge when section.yaml is canonicalized over the
  current `*.json` shape). Defer.

## Success criteria

- ✅ All 5 smoke chapter MDX moved to `sections/<sec>/units/<unit>/reading.mdx` (Task 8).
- ✅ `chapters/` + `modules/` content directories + collections DELETED (Tasks 10 + 21).
- ✅ `ChapterEntrySchema` + `ModuleEntrySchema` + `setChapters` + `setModules` + `chapters-store` + `modules-store` + `__setChapters` + `__setModules` all DELETED (Tasks 18 + 20).
- ✅ `ArtifactEntrySchema` + `artifacts` slot in PedagogyIndex + `artifacts-store` + `__setArtifacts` + payload script tag wiring added (Tasks 3 + 4 + 6 + 7 + 13).
- ✅ All 8 audit invariants iterating `index.chapters` migrated to iterate `index.units` (Task 12).
- ✅ All 14 URL builders rewriting `/chapters/<slug>` → `/units/<unit-id>/reading` (Task 14 + Task 25 code-review follow-up). The W2-code-review subagent caught two production callsites that Task 14 had missed: `GlossaryTerm.tsx:79` and `FigureRef.tsx:59`. Both fixed in the same PR pre-PR-open per the requesting-code-review skill discipline; their unit tests + the e2e suite's `/chapters/<slug>` CHAPTER_URL constants (32 spec files) graduated alongside.
- ✅ Route `pages/chapters/[...slug].astro` DELETED; `pages/units/[unit]/reading.astro` added (Tasks 15 + 16).
- ✅ `<ChapterRef>` prop renamed `slug` → `chapter`; reads from `artifactStore` + `unitStore` + `sectionStore`; smoke MDX callsites updated (Task 19).
- ✅ `UnitSchema` gained `status`, `framing?`, `description?`; smoke unit JSONs populated (Tasks 2 + 9).
- ✅ Stale docs updated in same PR — `chapter-components.md`, `audit-baseline.md` revision, `validation.md` regen, ADR 0067 revisions note, this pilot report (Task 22 + Task 23).
- ✅ This pilot report at `docs/website/pilots/wedge-b-followup-w2-smoke-migration.md` per Shape α (Task 23).
- ✅ Smoke build green: **12 pages, 125 pedagogy entries, audit 0 errors / 14 warnings / 7 infos** (matches W1's projected post-W2 baseline).
- ⏳ Pre-PR gates (Task 24): lockfile + biome + full build + full unit + e2e + smoke (requires Anna's explicit text-confirm per `feedback_no_questions_mode_scope`).
- ⏳ Code review request (Task 25): `superpowers:requesting-code-review` against the W2 branch.
- ⏳ PR open (Task 26): requires Anna's explicit text-confirm.
