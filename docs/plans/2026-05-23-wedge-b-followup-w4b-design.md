---
date: 2026-05-23T00:00:00.000Z
tags:
  - design
  - wedge-b-followup
  - w4
  - w4b
  - topic-registry
  - cards
  - skill-review-resolver
  - bridge-rooms
  - pra-1-graduation
  - mdx-remark-plugin
status: accepted-design
related:
  - "[ADR 0079 — Topic registry + registry-resolution pattern](../website/decisions/0079-topic-registry-and-resolution-pattern.md)"
  - "[Wedge B-followup W4 meta-plan](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md)"
  - "[Wedge B-followup W4a Design](2026-05-22-wedge-b-followup-w4a-design.md)"
  - "[W4a Pilot Report](../website/pilots/wedge-b-followup-w4a-library-routes.md)"
  - "[ADR 0068 — Bridge Rooms + Prereq Pedagogy](../website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md)"
  - "[ADR 0053 — Conformance Failure Modes](../website/decisions/0053-conformance-failure-modes.md)"
  - "[ADR 0070 — Library Room (amended W4a)](../website/decisions/0070-library-room-and-registry-spec-pages.md)"
---

# Wedge B-followup W4b — Design (topic registry + bridge rooms + SkillReview resolver + PRA-1 graduation)

## 1. Goal & context

**Goal.** Stand up the three net-new affordances that ADR 0079
specifies + graduate PRA-1 from WARN to ERROR:

1. **Topic registry** as a Sophie content collection
   (`src/content/topics/<category>/<topic-id>.mdx`, Design F).
2. **Bridge rooms** (Scale 1) at Course root — Section[type=bridge]
   hoisted to `[bridgeSlug].astro`.
3. **`<SkillReview target="topic:..." />` self-closing resolver**
   as an MDX remark plugin at
   `packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`.
4. **PRA-1 graduation** (WARN → ERROR) honoring `audit_overrides`
   per ADR 0053; new BR-1 + PRA-2 audit invariants.

**Trigger.** W4a (PR #161, commit `95d5b4a`, merged 2026-05-23)
moved 6 rollup routes under `/library/<X>/` and amended ADR 0070
to lock the `/library/` URL prefix. W4 meta-plan splits W4 into
three sub-wedges (W4a routes; W4b net-new affordances; W4c
missing chrome). W4b is the highest-design-pressure sub-wedge —
it lands a new ADR (0079) and ships every affordance the
W1→W4 sequence was building toward.

**Pre-launch posture.** Per `feedback_no_backcompat_prelaunch`:
zero production students; PRA-1 ERROR has teeth; every consumer
of new affordances migrates in W4b's single PR. No back-compat
shims, no transitional WARN-mode toggle.

**Why now.** W4a's Library room exists but is empty of net-new
content. W4b populates it (Topics) and lights up the resolver
mechanic that the prior wedges (B1, B-followup W1) instrumented
for but never resolved. The platform's prereq-pedagogy story
(ADR 0068's three scales) becomes end-to-end functional.

## 2. Locked design decisions

[ADR 0079](../website/decisions/0079-topic-registry-and-resolution-pattern.md)
is the canonical source of truth for design choices. This
design doc summarizes the locks + adds W4b-implementation-
specific detail.

### D1 — Topic file shape (ADR 0079 §"Topic file shape")

```
src/content/topics/
├─ math/
│  ├─ logarithms.mdx          ← Topic + N <SkillReview.Card> inline
│  ├─ exponents.mdx
│  └─ ...
├─ physics/
│  └─ ...
```

Per-topic frontmatter: `id`, `label`, `summary`,
`prereq_topic_ids[]`, `linked_equation_ids[]`,
`linked_misconception_ids[]`, `cards: [{id, label, difficulty?}]`.

Per-topic body: N `<SkillReview.Card id="X">` JSX blocks each
containing `<SkillReview.Prompt>` + `<SkillReview.Answer>` slot
children.

### D2 — Pedagogy-index entries

Two new entry types in `packages/core/src/schema/
pedagogy-index-entries/`:

- `TopicEntrySchema` mirrors topic frontmatter + `cards` array.
- `CardEntrySchema` per-card: `id` (within topic), `topic_id`,
  `label`, `difficulty?`. Body slots NOT stored in index
  (resolver re-fetches at compile time).

### D3 — Resolver plugin (ADR 0079 §"Resolver behavior")

`packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`,
wired in `mdx-config.ts` AFTER `remarkMath`, BEFORE
`pedagogyIndexRemarkPlugin`. Expansion order: resolver lifts
slot children into self-closing `<SkillReview>` → pedagogy-index
extractor then walks the expanded tree as if author had written
the children inline.

### D4 — Bridge route shape

`examples/smoke/src/pages/[bridgeSlug].astro` single-param
dynamic. `getStaticPaths()` queries `sections` collection for
`type: bridge`, returns one path per bridge. Reuses
`<Section>` chrome (or equivalent) for rendering.

### D5 — Audit invariants

Three audit changes:

- **PRA-1** severity flipped WARN → ERROR. Coverage rule
  unchanged (any `<SkillReview>` referencing topic counts).
  Honors `audit_overrides` per ADR 0053.
- **PRA-2** (NEW) — topic frontmatter ↔ body card consistency.
  ERRORs if `cards: [{id: X, ...}]` is declared in frontmatter
  but no `<SkillReview.Card id="X">` block exists in body (or
  vice-versa).
- **BR-1** (NEW) — bridge-slug uniqueness. ERRORs if a bridge
  slug collides with any other Section slug, any Unit slug, OR
  any reserved Library path (`library`, `sections`, `units`,
  `topics`).

### D6 — Smoke fixture exercises both audit paths

Smoke gets:

1. **Real topic content** covering existing prereqs.
   `src/content/topics/math/exponents.mdx` (single-card, exists
   as `topic:exponents` coverage), `topics/math/logarithms.mdx`
   (multi-card, covers `topic:logarithms` and exercises bare-
   topic ERROR + explicit-card-fragment resolver paths).
2. **Self-closing form in a chapter** — at least one
   `<SkillReview target="topic:..." />` callsite in
   `spectra-and-composition` reading, exercising the resolver.
3. **Bridge room** — `src/content/sections/math-fundamentals/
   section.yaml` (type: bridge) + `course.yaml` display-label
   override + N Unit[skill] entries referencing topics.
4. **audit_overrides demo fixture** — deliberately-broken Unit
   declaring `prereqs: [nonexistent-topic]` with
   `audit_overrides: [{invariant: PRA-1, anchor: nonexistent-
   topic, tdr: TDR-XX, reason: "..."}]`. Build must succeed
   because the override is present; tests verify PRA-1 fires
   without the override.

## 3. Phase-1 touchpoint enumeration (applies W3 R1 + W4a R4)

Per W3 doctrine R1 (multi-pattern grep) + W4a doctrine R4
(include `docs/website/` in scope) + R5 (verify cited ADRs by
reading — already done in brainstorm).

### 3.1 `@sophie/core` schema changes

- **NEW:** `packages/core/src/schema/pedagogy-index-entries/topic.ts`
- **NEW:** `packages/core/src/schema/pedagogy-index-entries/card.ts`
- Entries barrel export (`packages/core/src/schema/pedagogy-
  index-entries/index.ts`) — add `topic` + `card`.
- Possibly extend `SectionEntrySchema` `type` enum to include
  `'bridge'` if not already there (verify in implementation).

### 3.2 `@sophie/core` accumulator + audit

- `packages/astro/src/lib/pedagogy-index/orchestrator.ts` or
  similar — accumulator needs `addTopic(t)` + `addCard(c)`
  methods.
- `packages/astro/src/lib/pedagogy-index/accumulator.ts` (or
  wherever indexAccumulator lives) — track `topics[]` +
  `cards[]` in state, surface via `asPedagogyIndex()`.
- `packages/astro/src/lib/pedagogy-index/extractors/` — new
  extractor for topic MDX files. Walks `<SkillReview.Card>`
  JSX blocks; emits `CardEntry[]`. Reads frontmatter for
  `TopicEntry`.
- `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-
  family.ts` — PRA-1 severity flip; respect `audit_overrides`.
- `packages/astro/src/lib/pedagogy-audit/invariants/topic-
  consistency.ts` (NEW) — PRA-2 frontmatter↔body check.
- `packages/astro/src/lib/pedagogy-audit/invariants/bridge-
  uniqueness.ts` (NEW) — BR-1 slug-collision check.
- Audit runner (`packages/astro/src/lib/pedagogy-audit/runner.ts`)
  — register PRA-2 + BR-1; ensure `audit_overrides` plumbed
  through for PRA-1.

### 3.3 `@sophie/astro` MDX plugin

- **NEW:** `packages/astro/src/lib/mdx-plugins/skill-review-
  resolver.ts` — the resolver plugin.
- **NEW:** `packages/astro/src/lib/mdx-plugins/skill-review-
  resolver.test.ts` (TDD'd).
- `packages/astro/src/mdx-config.ts` — wire the resolver into
  `sophieMdxOptions.remarkPlugins` in the right position
  (after `remarkMath`, before `pedagogyIndexRemarkPlugin`).

### 3.4 Astro route — bridge rooms

- **NEW:** `examples/smoke/src/pages/[bridgeSlug].astro` —
  bridge-room dynamic route with `getStaticPaths()`.
- Possibly reuse `<Section>` chrome from existing section
  rendering (verify in implementation).
- `examples/smoke/src/pages/library/index.astro` — Library
  hub adds Topics tile + (optional) bridge-rooms tile.

### 3.5 Astro route — topic Spec page

- **NEW:** `examples/smoke/src/pages/library/topics/[topicId].astro`
  — topic Spec page (lists cards inline, cross-refs).

### 3.6 Content-collection config

- `examples/smoke/src/content.config.ts` — add `topics`
  collection with `glob("topics/**/*.mdx")` loader + Zod schema
  matching `TopicEntrySchema`.
- `examples/smoke/src/content.config.ts` — extend `sections`
  collection schema if needed for `type: bridge` discriminator.

### 3.7 Course / Section YAML

- `examples/smoke/src/content/course.yaml` (if exists) — bridge
  display-label override + ordering.
- `examples/smoke/src/content/sections/math-fundamentals/
  section.yaml` (NEW) — `type: bridge`, slug, units listed.

### 3.8 Smoke fixture content

- **NEW:** `examples/smoke/src/content/topics/math/exponents.mdx`
  (single-card topic).
- **NEW:** `examples/smoke/src/content/topics/math/logarithms.mdx`
  (multi-card topic — 2-3 cards: product-rule, power-rule,
  change-of-base).
- Modified: 1 chapter MDX swaps explicit-children
  `<SkillReview>` → self-closing form.
- **NEW:** `src/content/sections/math-fundamentals/...` bridge
  fixture (unit.yamls + artifacts).
- Modified: 1 unit gets deliberate broken prereq +
  `audit_overrides` entry.
- TDR fixture for the audit_overrides entry (a real TDR file
  the override `tdr:` field points to).

### 3.9 E2e tests

- **NEW:** e2e spec for bridge-room route render.
- **NEW:** e2e spec for topic Spec page.
- **NEW:** e2e spec for self-closing SkillReview → resolved
  prompt+answer interaction.
- Existing tests potentially affected: any chapter spec that
  references the modified chapter MDX.

### 3.10 Docs (per `feedback_docs_no_drift`)

- `docs/website/reference/chapter-components.md` — Topics-room
  section + `<SkillReview target="topic:..." />` self-closing
  documentation + bridge-room author guidance.
- `docs/website/reference/audit-baseline.md` — PRA-1 severity
  column WARN → ERROR; new PRA-2 + BR-1 rows.
- `docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md`
  — revision-history entry (bridge type extension shipped;
  SkillReview self-closing resolver shipped; Scale 2 deferred).
- `docs/website/status/validation.md` — regen (ADR 0079
  validation block touched if status flips
  proposed → accepted on merge).

## 4. Implementation strategy

W3 + W4a doctrine applied:

- **R1** Phase-1 grep covers declaration + access + prop +
  key-shape patterns + `docs/website/` scope.
- **R2** Bulk rewrites paired with structural disambiguators
  where applicable (most W4b additions are net-new, not
  renames).
- **R3** JSX value-expression caveat — N/A for net-new code;
  applies if W4b includes prop renames (it doesn't).
- **R4** docs/website/ scope in Phase-1 enumeration — done in
  §3 above.
- **R5** Verify cited ADRs before scope locks — done in
  brainstorm (read ADRs 0053, 0068, 0070).

### Batch 1 — Schema + accumulator + topic content

TDD: write TopicEntry + CardEntry schema tests first; implement
schemas; extend accumulator; extractor walks topic MDX
collection. Smoke fixture: 1 topic file with 1 card. End of
batch: index includes TopicEntry + CardEntry; audit baseline
still green.

### Batch 2 — Self-closing resolver MDX plugin

TDD: write resolver tests (single-card auto-pick; multi-card
explicit fragment; bare-topic-multi-card ERROR; missing-topic
ERROR; missing-card ERROR; explicit-children form non-
destructive). Implement plugin. Wire in `mdx-config.ts`.
Convert one smoke chapter callsite to self-closing form.
End of batch: build succeeds with resolved children; manual
inspection of compiled output confirms slot lift.

### Batch 3 — PRA-1 graduation + PRA-2 + audit_overrides

TDD: write tests for PRA-1 ERROR severity, PRA-1 honoring
audit_overrides per ADR 0053, PRA-2 frontmatter↔body
consistency. Implement. Update smoke fixture: cover existing
prereqs via real topics; add deliberately-broken Unit with
audit_overrides entry; add TDR fixture file. Update
audit-baseline.md. End of batch: smoke build green with
PRA-1 ERROR; deliberate-break fixture demonstrates escape
path.

### Batch 4 — Bridge rooms + BR-1 audit

TDD: write tests for `[bridgeSlug].astro` getStaticPaths, BR-1
slug-collision invariant. Implement bridge route. Smoke
fixture: math-fundamentals bridge section + 1-2 Unit[skill]
entries. Library hub gains optional bridge tile. End of
batch: bridge URL accessible; BR-1 fires on deliberate
collision fixture; smoke routes all green.

### Batch 5 — Topic Spec page + Library hub Topics tile

TDD: write tests for `[topicId].astro` topic Spec page render.
Implement. Library hub gains Topics tile. End of batch:
`/library/topics/<id>/` resolves; topic page shows cards
inline; Library hub lists Topics among the 7 rooms.

### Batch 6 — Docs sweep + pre-PR gates

Update chapter-components.md (topics + bridge + resolver),
audit-baseline.md (PRA-1 ERROR + PRA-2 + BR-1 rows),
ADR 0068 revision-history. Regen validation.md. Run all
pre-PR gates (biome 0/0, typecheck --force, unit suite, e2e,
build).

### Batch 7 — R+CR + pilot report

Dispatch `superpowers:requesting-code-review`. Address
Critical + Important findings. Write pilot report at
`docs/website/pilots/wedge-b-followup-w4b-affordances.md`
(Shape α). Open PR (needs Anna text confirm).

## 5. Verification

After Batches 1–6, before R+CR:

1. `pnpm install --frozen-lockfile` clean.
2. `pnpm exec biome check 2>&1 | grep -E "(error|warning)"` —
   empty.
3. `pnpm turbo run typecheck --force` — all turbo tasks green.
4. `pnpm turbo run test --filter='@sophie/*'` — full unit suite
   green; new tests for schemas + resolver + audits.
5. `pnpm turbo run build --filter=smoke` — smoke builds; new
   topic Spec routes + bridge route render; Pagefind
   regenerated covering new URLs.
6. `pnpm exec playwright test` from worktree root — full e2e
   green; new specs for bridge + topic-Spec + resolver pass.
7. Counter-pass grep — verify no remaining placeholder
   branches in SkillReview component; verify ADR 0079
   referenced everywhere relevant.
8. Manual smoke (per `feedback_aesthetic_unlocked_prelaunch`):
   navigate to `/library/topics/logarithms/`, render expected;
   navigate to bridge room URL, render expected.

## 6. Risk + mitigation

- **Risk: resolver plugin breaks pedagogy-index extractor.**
  The resolver expands self-closing forms; the extractor
  needs to walk the *expanded* tree, not the original.
  Mitigation: plugin order in `mdx-config.ts` puts resolver
  BEFORE extractor. TDD verifies extractor sees resolved
  card content.
- **Risk: card-frontmatter / card-body desync.** PRA-2 catches
  this at build time. Tests cover both directions
  (frontmatter card without body block; body block without
  frontmatter entry).
- **Risk: bridge-room slug collisions silently shadow other
  routes.** BR-1 fires at build time before Astro routing
  evaluates. Mitigation: BR-1 ERROR is fail-loud + names
  colliding entities.
- **Risk: PRA-1 ERROR breaks existing smoke baseline.** Mitigation
  by W4b design: smoke gets real covering topics so PRA-1
  no longer fires WARN→ERROR. Existing `topic:exponents`
  reference becomes covered by real `topics/math/exponents.mdx`.
- **Risk: turbo cache silently skips changed files.** Per W3
  surprise #6: always run typecheck with `--force` before
  pre-PR.
- **Risk: scope creep into W4c chrome.** The Topics Spec page
  uses a minimal layout in W4b; shell extraction +
  CourseTopics chrome is W4c work. Resist temptation to
  ship shared shell here.

## 7. Pilot report (Shape α)

Per ADR 0064 + W2/W3/W4a precedent. After W4b merges, draft
pilot report at `docs/website/pilots/wedge-b-followup-w4b-
affordances.md` with sections:

1. What shipped: topic registry + bridge rooms + resolver +
   PRA-1 ERROR + PRA-2 + BR-1.
2. Estimates vs. actuals.
3. W3 + W4a doctrine review (R1–R5).
4. Surprises (TBD; will document during execution).
5. Doctrine refinements (if any new patterns surface).
6. Handoff to W4c.

## 8. Discipline reminders (W4b-specific)

- **HITL on architectural decisions:** ADR 0079 already
  Anna-sign-off'd; revisit Anna before any net-new ADR
  proposal.
- **Playwright from worktree root** (W3 surprise #5).
- **Port 4321 clean before e2e** (`project_local_dev_pagefind_e2e_pitfall`).
- **Biome full-output grep** (`feedback_biome_verification`).
- **Turbo typecheck force** (W3 surprise #6).
- **Pre-PR lockfile check** (`feedback_pre_pr_lockfile_check`).
- **No back-compat shims** (`feedback_no_backcompat_prelaunch`).
- **Squash-merge** (ADR 0055).
- **Side-effects** need explicit text confirm per occurrence
  (`feedback_no_questions_mode_scope`): push, merge, gh pr
  create.
- **Docs in same PR** (`feedback_docs_no_drift`) — chapter-
  components.md + audit-baseline.md + ADR 0068 revision + new
  ADR 0079 (already shipped) + pilot report + this design doc
  + plan + validation.md regen if any ADR validation block
  status changes.
- **R5 doctrine** — every ADR cited in this design doc was
  read during the brainstorm (verified ADRs 0053, 0068, 0070,
  0061, 0069). Cross-file claims in this doc are grep-
  verified against the actual code.
