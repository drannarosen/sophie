---
date: 2026-05-22T00:00:00.000Z
tags:
  - design
  - wedge-b-followup
  - pedagogy-index
  - section-unit
  - migration
  - course-website
status: accepted-design
related:
  - "[ADR 0067 — Section / Subsection / Unit / Artifact](../decisions/0067-section-level-artifacts.md)"
  - "[ADR 0064 — Chapter-Migration Playbook](../decisions/0064-chapter-migration-playbook.md)"
  - "[ADR 0068 — Bridge Rooms & Prereq Pedagogy](../decisions/0068-bridge-rooms-and-prereq-pedagogy.md)"
  - "[ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md)"
  - "[Course-Website Platform Roadmap](../status/course-website-roadmap.md)"
  - "[Wedge B1 Design — Retrieval Family](2026-05-21-wedge-b1-retrieval-family-design.md)"
  - "[Wedge B1 Quality Audit](../reviews/2026-05-22-wedge-b1-retrieval-family.md)"
---

# Wedge B-followup — Design (Section/Unit in PedagogyIndex + W1→W4 migration sequence)

## 1. Goal & Context

**Goal (W1 — this PR).** Surface `Section[]` + `Unit[]` collections in
`PedagogyIndex`, graduate the three Wedge-B1-deferred audit invariants
(PRA-1 → Unit-aware; SR-1 → section-validity; RET-1 unchanged), and
wire `<SpacedReview section="…">` end-to-end rendering against the
index. Lock [ADR 0067](../decisions/0067-section-level-artifacts.md)
as Sophie's canonical content shape and commit a four-wedge migration
sequence (W1 → W2 → W3 → W4) as the path to SoTA.

**Trigger.** Wedge B1 ([PR #156](https://github.com/drannarosen/sophie/pull/156),
squash-merged 2026-05-22 as commit `96e3d51`) shipped the retrieval
family (`<RetrievalPrompt>` + `<SpacedReview>` + `<SkillReview>` +
persistence layer). The
[2026-05-22 quality audit](../reviews/2026-05-22-wedge-b1-retrieval-family.md)
graded A− (90/100) and flagged three deferrals that all share one
upstream blocker: **PedagogyIndex carries `chapters[]` + `modules[]`,
but Wedge A.5 (PR #155) shipped `Section`/`Subsection`/`Unit` Zod
schemas without wiring them in**.

**The deferrals.**

1. **PRA-1 (Prereq Activation, WARN)** — currently checks "every
   `topic:` target_id surfaced via `<RetrievalPrompt>` or
   `<SpacedReview>` in a chapter has a `<SkillReview>` surface in the
   same chapter." Design-doc intent: **"every `UnitEntry.prereqs[]`
   topic has ≥1 `<SkillReview>` in the same Section or any prior
   Section (by `Section.order`)."**
2. **SR-1 (`<SpacedReview>` ref validity, ERROR)** — currently checks
   `target=` prefix shape only. `section=` ref validity is a no-op
   because no `Section` collection exists in the index.
3. **`<SpacedReview section="…">` rendering** — stubbed to empty-state
   at [packages/components/src/components/SpacedReview/SpacedReview.tsx:93-102](../../packages/components/src/components/SpacedReview/SpacedReview.tsx#L93-L102)
   (the `void max; return [];` line).

**Strategic framing.** Anna's 2026-05-22 decision was to lock
ADR 0067 as Sophie's canonical content shape *now* and execute the
migration on a sequenced timeline rather than coexist with the
pre-ADR-0067 shape. The roadmap and ADR 0067 already specify the
target; what's been missing is a forcing function. Wedge B-followup is
that forcing function.

**Pre-launch posture.** Per the saved `feedback_no_backcompat_prelaunch`:
zero production students; drop legacy shapes inside a single wedge;
no dual-shape bridges that live longer than one PR (the one exception
in W1 — keeping the pre-ADR-0067 `chapters/` + `modules/` content
collections in smoke for one wedge — is explicitly deleted in W2).

---

## 2. Canonical SoTA target (locked)

The shape below is the *target* Sophie content model — already specified
in [ADR 0067](../decisions/0067-section-level-artifacts.md) and the
[Course-Website Platform Roadmap](../status/course-website-roadmap.md).
This design doc recomposes it as the locked reference for the W1→W4
migration sequence.

### 2.1 Four-tier content hierarchy

```
Course (top level)
├── Course Info ........... About + instructor + philosophy
├── Syllabus
├── Schedule .............. Auto-aggregated from typed entity frontmatter
│                           + schedule.yaml (Tier 1; iCal export)
├── Content ............... Topic hierarchy
│   └── Section[module | phase | track | unit-block]
│       ├── intro.mdx ............... Artifact[scope=section, type=intro]
│       │                              ★ REQUIRED — advance organizer + LOs
│       ├── synthesis.mdx ........... Artifact[type=synthesis]
│       │                              ☆ recommended
│       ├── equation-collection.mdx . Artifact[type=equation-collection]
│       │                              ☆ recommended
│       ├── practice-set.mdx ........ Artifact[type=practice-set]
│       │                              ★ REQUIRED — interleaved + FSRS
│       ├── review-checklist.mdx .... Artifact[type=review-checklist]
│       │                              ☆ recommended
│       ├── (concept-map / misconception-summary / historical-context /
│       │     further-reading / reference-tables: ○ optional)
│       └── Subsection (auto-grouped by artifact type by default;
│                       explicit on opt-in)
│           └── Unit[lecture | project | lab | topic | skill]
│               ├── reading.mdx ..... Artifact[scope=unit, type=reading]
│               │                      ★ REQUIRED for lecture-shape
│               │                      Bound on UnitEntry as `unit.chapter`
│               ├── slides.mdx ...... Artifact[type=slides]
│               │                      ★ REQUIRED for lecture-shape
│               │                      Bound on UnitEntry as `unit.lecture`
│               ├── practice.mdx .... Artifact[type=practice]
│               │                      ○ optional Unit-level blocked practice
│               └── (spec / rubric / lab-notebook / worked-example /
│                     diagnostic / concept-review per Unit type)
├── bridge: "<custom>" .... Section[type=bridge] rendered at Course root
│                           (0..N per course; ADR 0068)
├── Assignments ........... Assessment[type=assignment]
├── Exams ................. Assessment[type=exam]
├── Computational Labs .... Pyodide + Plotly (Tier 2)
├── Library ............... Registry cheatsheets + Spec pages
│   ├── /equations/ /equations/<slug>/
│   ├── /glossary/ /glossary/<term>/
│   ├── /misconceptions/ /misconceptions/<slug>/
│   ├── /insights/, /figures/, /deep-dives/, /interventions/, /omi/
├── Resources ............. Utility (auto-generated formula PDFs +
│                           handouts + external links)
├── Discussions ........... Tier 3
├── Announcements ......... Tier 3
└── Instructor ............ Private; Tier 3 (Console + Prep tabs)
```

### 2.2 File-layout convention

Locked by ADR 0067 §Implementation:

```
src/content/courses/<course>/
├── course.yaml                # display-label overrides, semester meets, rooms
├── schedule.yaml              # non-entity events (holidays, guests)
├── sections/<section-id>/
│   ├── section.yaml           # type, slug, title, order, description
│   ├── intro.mdx              # Artifact[scope=section, type=intro]
│   ├── synthesis.mdx
│   ├── equation-collection.mdx
│   ├── practice-set.mdx
│   └── units/<unit-id>/
│       ├── unit.yaml          # type, id, title, order, prereqs,
│       │                       chapter, lecture?, topic_id?
│       ├── reading.mdx        # Artifact[scope=unit, type=reading]
│       ├── slides.mdx         # Artifact[scope=unit, type=slides]
│       └── practice.mdx       # Artifact[type=practice]
└── (bridges live as sections/<bridge-id>/ with section.yaml: type=bridge)
```

### 2.3 Routes (post-W2)

- `/sections/<section-id>/` — Section overview + Section-level Artifacts
- `/units/<unit-id>/reading` — Unit's reading Artifact (the "chapter")
- `/units/<unit-id>/slides` — Unit's slides Artifact (the "lecture")
- `/library/equations/<slug>/`, `/library/glossary/<term>/`, etc.
- `/bridges/<slug>/` — bridge rooms with custom display labels

### 2.4 PedagogyIndex shape post-W3 (full SoTA)

| Collection | Source | Notes |
|---|---|---|
| `sections: SectionEntry[]` | Consumer-supplied | Mirrors `SectionSchema` |
| `units: UnitEntry[]` | Consumer-supplied | `UnitSchema` + `section_id` + named artifact bindings |
| `artifacts: ArtifactEntry[]` | Consumer-supplied | `ArtifactSchema` + parent refs |
| Per-callsite entries (MultiRep, Misconception, OMIFlow, RetrievalPrompt, SpacedReview, SkillReview, etc.) | MDX-extracted | Keyed by `unit: string` (was `chapter` pre-W3) |

`ChapterEntry` and `ModuleEntry` are **deleted** from the schema at
the end of W2. Per-callsite keying renames `chapter` → `unit` in W3.

### 2.5 Type-driven display labels (ADR 0067, locked)

Internal types stay stable; per-course display labels are configurable
via `course.yaml`. Tooling (pedagogy graph, audit, curriculum-CI)
operates on internal types; instructor customization happens in
display layer only. See ADR 0067 §"Type-driven display labels."

---

## 3. Four-wedge migration sequence

| Wedge | Scope | Status |
|---|---|---|
| **W1** | `PedagogyIndex` `sections`/`units` surfacing + audit graduation (PRA-1, SR-1) + `<SpacedReview section=>` render. Smoke ADDS `sections/` + `units/` content collections; `chapters/` + `modules/` stay (transitional). `UnitEntry` carries `chapter` (reading binding) + optional `lecture` (slides binding). | **This PR** |
| **W2** | File-layout migration — smoke chapter MDX MOVES into `sections/<id>/units/<id>/reading.mdx`. `ChapterEntry` + `ModuleEntry` deleted from `PedagogyIndex`. `ArtifactEntry` surfaces. Routes rewrite `/chapters/<slug>` → `/units/<id>/reading`. Pilot report per [ADR 0064](../decisions/0064-chapter-migration-playbook.md). `UnitEntry.chapter` + `UnitEntry.lecture` field names persist; their string values now point at the moved artifact slugs/ids. | Next PR |
| **W3** | Per-callsite key rename — all ~13 extractors switch per-entry `chapter: string` → `unit: string`. All audit invariants rewritten. Components consuming `chapter` prop migrated to `unit`. `useInteractive` / `useInteractiveRange` / `useInteractiveRangeMulti` parameter rename. **`UnitEntry.chapter` and `UnitEntry.lecture` field names KEEP their meaning** (the reading/slides artifact bindings stay; only the per-callsite parent-ref name changes). | After W2 |
| **W4** | Library room (top-level) + bridge rooms (Section[bridge] rendered at Course root) + 8 registry Spec pages. `<SkillReview>` self-closing topic-registry resolution. | After W3 |

Each wedge gets its own design doc + plan doc + pilot report (ADR 0064
§2 template). This design doc is the canonical W1 reference; W2/W3/W4
get their own design docs at the start of their respective wedges.

---

## 4. W1 locked design decisions

### D1 — Unit-as-binding for Section ⟷ chapter-keyed callsite membership

`SectionEntry` mirrors `SectionSchema` verbatim (discriminated union
over `type`: `module` | `phase` | `track` | `unit-block` | `bridge`).
`UnitEntry` extends `UnitSchema` with `section_id` (parent ref to its
Section's `slug`) plus two named artifact bindings (see [D7](#d7--readingslides-artifact-bindings-on-unitentry)):
`chapter: string` (binding to the reading artifact) +
`lecture?: string` (binding to the slides artifact). `ChapterEntry`
stays unchanged in W1.

**Lookup chain** for the W1 audits + section-scope render:
`section.slug → units where section_id matches → unit.chapter slugs → chapter-keyed callsites`.

**Rationale.** When ADR 0067's eventual Chapter→Unit merge lands
(W2/W3), the only `section_id` in the codebase is already on the right
entity (`UnitEntry`). No future rename touches every consumer of
`ChapterEntry`. Build the best now, pay zero migration cost later.

### D2 — `useInteractiveRangeMulti` hook for cross-chapter range reads

New hook `useInteractiveRangeMulti(course, chapters, keyPrefix?)` in
`@sophie/components/runtime/`. Returns a unified `Record<key, T>`
merging across all chapters. New
`ResponseStore.getAllMulti(profile, chapters, keyPrefix?)` method on
the underlying store. Hand-rolled IDB cursor + per-chapter broadcast
subscription; no React hooks-in-loop carve-out. Second caller (Cockpit
per ADR 0076 reads `practice_attempts` across the course) makes DRY
pay off.

**Rationale.** Looping `useInteractiveRange` inside `<SpacedReview>`
per chapter works only because the chapter list is stable from
build-time PedagogyIndex, but trips React's "no hooks in loops" lint
rule, opens N IDB transactions, and pushes the merge into component
code. The hook is the SoTA shape.

### D3 — Minimal additive smoke fixture in W1 (chapter MDX stays in place)

Smoke ADDS `src/content/sections/` + `src/content/units/` content
collections. Existing `src/content/chapters/` + `src/content/modules/`
collections STAY. Two Sections (one per existing module: `intro` +
`stars` — matching `01-foundations.json` and `02-stars.json`). Five
Units (one per existing chapter; each carries `section_id` + `chapter`
binding via the YAML's `chapter:` field pointing at the existing
chapter slug). One Unit gets non-empty `prereqs: ["logarithms"]` to
exercise the graduated PRA-1 cleanly. One `<SpacedReview section="stars">`
callsite added to a smoke chapter to exercise the new section-scope
render path end-to-end.

**Rationale.** Without smoke-side content, the new audit invariants
regression-test only in unit tests. The smoke build (12 pages, 125
pedagogy entries) is Sophie's integration canary. W1 keeps chapter
MDX in place; W2 does the file-layout move.

### D4 — Subsection skipped in W1

No audit invariant in W1 needs `SubsectionEntry`. Add when needed
(probably W4 for explicit-subsection commentary rendering). Smoke uses
auto-grouped Subsections by default — zero authoring overhead per
ADR 0067.

### D5 — No new anchor prefixes

`SectionEntry` keys by `slug` (mirrors `ChapterEntry.slug` /
`ModuleEntry.slug`). `UnitEntry` keys by `id` (mirrors `UnitSchema.id`).
Neither has an "anchor" in the chapter-keyed callsite sense. The
canonical anchor prefix table at
[packages/core/src/schema/pedagogy-index.ts:36-53](../../packages/core/src/schema/pedagogy-index.ts#L36-L53)
gets no new rows in W1.

### D6 — Doc-staleness work bundled into the W1 PR

Per `feedback_docs_no_drift`: ADR / chapter-components.md /
audit-baseline.md / pedagogy-index.ts touch each other; update in the
same PR. W1's bundle:

- `audit-baseline.md` smoke counts regenerated (RET-1 firing on
  misconception-fixture; audit graduations may shift counts).
- `chapter-components.md` validation block: `unvalidated` →
  `in-progress` with evidence rows for the new `<SpacedReview section=>`
  documentation.
- `multirep-component.md` + `intervention-library.md` validation blocks
  escalated similarly.
- `validation.md` dashboard regenerated per
  `feedback_validation_dashboard_regen` (any ADR `validation:` change
  must regen).

### D7 — Reading/Slides artifact bindings on `UnitEntry`

`UnitEntry` carries two **named artifact-binding fields** that match
Sophie's educator vocabulary:

- **`chapter: string`** (required for `Unit[type=lecture]`) — slug of
  the reading artifact (the chapter-shaped reading.mdx). "Chapter" in
  textbook terminology = the reading content students study at home.
  In W1 this points at the existing chapter MDX slug; in W2 it points
  at the moved `sections/<id>/units/<id>/reading.mdx` artifact's
  slug/id.
- **`lecture?: string`** (optional in W1; required for
  `Unit[type=lecture]` post-W2) — slug of the slides artifact (the
  lecture-session slide deck). "Lecture" in classroom terminology =
  the slides delivered in person. Not populated in W1 (smoke has no
  slides.mdx yet); becomes the binding to `slides.mdx` when it lands.

**These two field names are PERMANENT.** Their meaning ("the reading"
+ "the slides") persists through every later wedge. Only their string
values change — in W2 they point at the moved artifact locations; in
W3+ they continue pointing at whatever the canonical artifact id
becomes. The two named bindings are first-class on Unit because they
are the two artifacts every lecture-shape Unit ALWAYS has.

**Rationale.** Anna's 2026-05-22 framing: "the reading IS the chapter;
the slides ARE the lecture." This mental model is what authors and
instructors actually think with. Encoding it as named fields on
`UnitEntry` makes the platform's vocabulary match the educator's
without sacrificing the typed `Artifact` schema underneath. Non-lecture
Unit types (`project`, `lab`, `topic`, `skill`) have their own
artifact bindings — `spec`, `rubric`, `lab_notebook`, etc. — which can
follow the same naming pattern when they're introduced (deferred to
the wedge that surfaces those Unit types).

**W1 Zod shape:**

```ts
export const UnitEntrySchema = UnitSchema.extend({
  section_id: NonEmptyString,
  chapter: NonEmptyString,         // reading-artifact slug binding
  lecture: NonEmptyString.optional(), // slides-artifact slug binding (future)
});
```

---

## 5. Out of scope for W1

- **W2 file-layout migration** — chapter MDX stays in
  `examples/smoke/src/content/chapters/` for W1.
- **W3 per-callsite `chapter` → `unit` rename** — all entry schemas
  keep their `chapter: string` field through W2.
- **W4 Library room + bridge rooms + Spec pages** — Wedge C territory;
  deferred.
- **RET-1 word-count-ratio enforcement** — requires chapter body-text
  in PedagogyIndex; not in scope.
- **`<SkillReview>` self-closing topic-registry resolution** — Wedge C
  (Library room).
- **FSRS replacing the LRU stub** — Wedge D; function-body swap only.
- **BKT mastery + adaptive `<SkillReview>` prominence** — Wedge E.
- **Cockpit (ADR 0076) consuming practice_attempt records** — separate
  sprint; W1 lays the `useInteractiveRangeMulti` groundwork.
- **Auth-server-backed identity** — replaces `getUserId()` post-launch.
- **Subsection rendering** — auto-grouping default suffices for W1;
  explicit subsections deferred.
- **ADR 0068 signature edit** (`<SkillReview topic="…">` →
  `<SkillReview target="topic:…">`) — separate docs PR.
- **Slides.mdx extraction** — `UnitEntry.lecture` field exists in W1
  but is optional and unused; slides extraction lands when slides.mdx
  files exist in smoke (post-W2).

---

## 6. Architectural assumptions & constraints

**Consumer-supplied vs. MDX-extracted.** `SectionEntry` and `UnitEntry`
are **consumer-app-owned** — populated from `getCollection('sections')`
+ `getCollection('units')` by `TextbookLayout.astro` at SSR-merge
time. They follow the same setter pattern as `ChapterEntry` /
`ModuleEntry` / `FigureRegistryEntry` (`setSections` / `setUnits`,
not touched by `clearChapter`). The remark extractor never writes
them. See
[packages/astro/src/lib/pedagogy-index/accumulator.ts](../../packages/astro/src/lib/pedagogy-index/accumulator.ts).

**Framework-pure components per ADR 0001.** `@sophie/components` cannot
import `virtual:sophie/pedagogy-index` (Astro-Vite-only). Sections +
Units flow into the component-side store via the existing
`__setSections` / `__setUnits` hydration setters at
`packages/components/src/internal/store-hydration.ts`, called from
`TextbookLayout.astro`. Components read via `useSections()` /
`useUnits()` hooks (mirroring the existing `useChapters()` pattern).

**Per-(course, chapter) IDB keying preserved.** The persistence layer
([ADR 0007](../decisions/0007-persistence.md)) keys `practice_attempt`
records by `(profile, chapter, key)`. `useInteractiveRangeMulti`
operates on a stable list of chapter slugs derived from
`unit.chapter` at component render time; it does **not** change the
IDB key scheme. W3 will rename the key dimension `chapter` → `unit`
(separate migration concern, out of W1 scope).

**PRA-1 + SR-1 are opt-in via authoring Sections + Units.** Consumers
with no Units in `PedagogyIndex` produce no PRA-1 findings (the
invariant has nothing to iterate against); consumers with no Sections
produce no SR-1 section-validity findings (no slugs to resolve
against). This is not a fallback — there is no chapter-level
approximation. Per `feedback_no_backcompat_prelaunch`: pre-launch
Sophie has zero production students; consumers without Sections/Units
either author them or accept that the corresponding audit invariants
stay silent.

**No back-compat past W3.** Per the saved
`feedback_no_backcompat_prelaunch` and Anna's explicit 2026-05-22
direction: shape transitions happen inside a single wedge; smoke's
`chapters/` + `modules/` content collections live exactly one wedge
(W1) and are deleted in W2. `UnitEntry.chapter` field-NAME persists
past W2 (its string value changes, but the field itself stays — it's
the permanent name for the reading-artifact binding).

---

## 7. References

- [ADR 0067 — Section / Subsection / Unit / Artifact content hierarchy](../decisions/0067-section-level-artifacts.md)
- [ADR 0064 — Chapter-Migration Playbook](../decisions/0064-chapter-migration-playbook.md)
- [ADR 0068 — Bridge Rooms & Prereq Pedagogy](../decisions/0068-bridge-rooms-and-prereq-pedagogy.md)
- [ADR 0058 — Epistemic Component Contract](../decisions/0058-epistemic-component-contract.md)
- [ADR 0038 — Pedagogy Index Pattern](../decisions/0038-pedagogy-index-pattern.md)
- [ADR 0007 — Persistence](../decisions/0007-persistence.md)
- [ADR 0029 — BroadcastChannel LWW](../decisions/0029-broadcast-channel-lww.md)
- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) — canonical 27-decision plan (2026-05-21)
- [Wedge B1 Design Doc](2026-05-21-wedge-b1-retrieval-family-design.md)
- [Wedge B1 Implementation Plan](2026-05-21-wedge-b1-retrieval-family.md)
- [Wedge B1 Quality Audit](../reviews/2026-05-22-wedge-b1-retrieval-family.md)
- [Master plan (working artifact)](~/.claude/plans/sophie-wedge-b-followup-graceful-thompson.md)
