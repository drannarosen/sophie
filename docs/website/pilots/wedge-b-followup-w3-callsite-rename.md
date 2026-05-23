---
title: 'Pilot report: Wedge B-followup W3 — per-callsite `chapter` → `unit` rename'
short_title: 'Pilot: W3 callsite rename'
description: 'W3 platform self-migration pilot — renaming the per-callsite parent-ref field `chapter` → `unit` across 15 entry schemas, 14 extractors, accumulator, ~10 audit invariants, persistence layer (useInteractive* + ResponseStore + IDB key dimension + BroadcastChannel), 12 parent-ref component props, and ~138 test fixtures. Shape α — platform self-migration framing per ADR 0064 §4.'
authors:
  - name: Anna Rosen
date: 2026-05-22
---

## Pilot context

**What this pilot migrated.** Every per-callsite parent-ref field in
the Sophie codebase that pointed to "which Unit does this callsite
live in" graduated from name `chapter` to `unit`. The rename
propagated through 5 layers: Zod schemas (`@sophie/core`), MDX
extractors + accumulator + audit invariants (`@sophie/astro`),
runtime hooks + ResponseStore + IDB key dimension + BroadcastChannel
(`@sophie/components/runtime`), 12 parent-ref React component prop
schemas + their `.tsx` implementations + tests + stories, and 4
smoke MDX `reading.mdx` callsites. The artifact-ref family
(`<ChapterRef>` + 7 chrome `Chapter*` roll-up components,
`UnitEntry.chapter` D7 reading-binding) preserved the literal name
`chapter` per W3/D1's semantic-role split.

**Why now.** W2 ([PR #159](https://github.com/drannarosen/sophie/pull/159),
2026-05-22) made the W2/D4 1:1 convention (UnitEntry.id == reading-
artifact slug) into Sophie's canonical content shape. Holding the
per-callsite `chapter:` field name past W3 created a vocabulary
mismatch (UnitEntry.chapter = reading-binding under D7; per-callsite
entry.chapter = parent-unit-id) that confused every author, AI
extraction, and reviewer. W3 collapses the ambiguity inside one wedge
per `feedback_no_backcompat_prelaunch`.

**Per ADR 0064 §4 — structural-density-diversity criterion.** This
pilot is a *platform self-migration*, not a consumer-chapter
migration. The synthetic smoke fixture changes alone exercise ~32 JSX
prop renames across 4 reading.mdx files; the next real consumer
migration (astr201-sp26 first chapter to re-migrate) inherits the
post-W3 shape transparently — no further author action needed.

**What's explicitly out of scope.** W4 Library room + bridge rooms +
8 registry Spec pages (Wedge C territory), slides.mdx extraction +
`<LectureRef lecture>` component, FSRS scheduler swap (Wedge D), BKT
mastery + adaptive `<SkillReview>` prominence (Wedge E), Cockpit per
ADR 0076, auth-server identity (replaces `getUserId()` post-launch),
`<ChapterRef>` component-name → `<ReadingRef>` (D7 vocabulary lock
keeps the educator-facing name).

## Shortcode → component dictionary

**N/A — platform self-migration.** This pilot does not convert
Quarto / `.qmd` / `.tex` source to Sophie MDX. The 4 smoke reading
MDX files were already Sophie-shape from W2; W3 renames JSX prop
names on parent-ref components and rewires every consumer of the
renamed type-system surface. No new authoring shortcodes were
introduced or eliminated.

(Per ADR 0064 §2's "not applicable, because…" instruction: the
section appears explicitly with a reason rather than being omitted.)

## Pedagogy structure map

W3 is structural — no new eight-role assignments. The renamed parent-
ref fields are persistence keys (Unit-scoped IDB writes); the
epistemic roles authored at callsites (Observable/Model/Inference,
Misconception, Intervention, etc.) are unaffected. The W2-locked
component-role assignments persist verbatim.

### Multi-representation usage

Unchanged. Smoke fixture preserves its 5 MultiRep bindings (3 in
`spectra-and-composition`, 2 in `spoiler-alerts`); the
`MultiRepIndexEntry.chapter` field renamed to `.unit` and `Slug`-
refinement applied per W3/D3, but the per-callsite count is
count-stable.

### Eight-role component-mapping decisions

W3's D1 split locks the semantic distinction the codebase had been
collapsing under W2/D4 1:1:

- **Parent-ref components (12)** carry an IDB key dimension on the
  JSX surface. Post-W3 prop name: `unit`. The value is the parent
  Unit's id (matching `UnitEntry.id`). Persistence is scoped to
  `(profile, course, unit, key)` per ADR 0007.
- **Artifact-ref components (1 + 7 chrome roll-ups + 1 in-progress)**
  reference a reading-artifact slug (== `UnitEntry.chapter` per D7).
  Post-W3 prop name: `chapter` (KEEPS). The value is the reading-
  artifact id. Lookups resolve `artifact → unit → section` per W2/D3.

The two roles point at the same string in production (W2/D4 1:1).
Decoupling them at the type/prop layer keeps multi-reading-per-unit
shapes open without a second user-facing migration.

## Pedagogical decisions log

W3 is a platform structural migration; pedagogy decisions inherit
from W1 + W2 + earlier wedges. W3-specific calls:

- **CLI/audit output vocabulary preserved.** `Finding.location.unit`
  is the internal field name; the CLI formatter still prints
  `chapter:<id>:<line>` as the prefix word per W3/D2. Educators think
  in chapter terminology (D7 lock); the field-name rename is internal.
- **Slug normalization (W3/D3).** Pre-W3 the 15 renamed fields mixed
  `chapter: NonEmptyString` (5 files) and `chapter: Slug` (10 files);
  all became `unit: Slug`. Two test fixtures used legacy slash-bearing
  values (`module-02/lecture-04`, `01-foundations/spoiler-alerts`)
  that failed the tightened Slug refinement; aligned to W2 file-layout
  shapes (`module-02-lecture-04`, `spoiler-alerts`).
- **`AuditExtras.draftChapterSlugs` → `draftUnitIds`.** Explicit W3
  debt comment at `chapter-status.ts:15` (pre-W3) cleared.
- **PRA-1 invariant semantic refinement.** Pre-W3 stored
  `chapterSectionOrder.set(u.chapter, ord)` (D7 reading-binding as
  key); post-W3 uses `unitSectionOrder.set(u.id, ord)` matching the
  per-callsite `entry.unit` value (which is the Unit's id under
  W2/D4 1:1). Test fixtures that previously diverged from 1:1 were
  aligned (UnitEntry.id = UnitEntry.chapter) to match production
  semantics.

## Time spent per phase

Captured across the focused W3 implementation session
(2026-05-22):

| Phase | Original estimate | Actual |
|---|---|---|
| Phase 1 brainstorm + touchpoint enumeration | 1.5h | ~1.5h (single Explore agent + targeted greps) |
| Batch 1 — worktree + design + plan docs | 0.5h | ~0.5h |
| Batch 2 — schema layer (`@sophie/core`) | 0.75h | ~0.75h (python regex + 4 surgical reverts) |
| Batches 3+4+5+6 — astro extractors + audit + runtime + 12 component props (merged because the field rename's blast radius forced a single coherent commit) | 4h | ~5h (the discovery of additional consumer touch points — UnitEntry-fixture inverse-rename, `u.unit` audit bug, ResponseStore/IDB layer rename — extended this batch substantially) |
| Smoke MDX + astro `.astro` components + e2e tests | 0.5h | ~0.75h |
| Docs (chapter-components.md + ADR 0067 revision + pilot report) | 1h | ~1h |
| Pre-PR gates + code review | 1h | (in progress at time of writing) |

**Conversion vs platform-shaping split.** N/A — this is a 100%
platform-shaping pilot.

## Surprises

**1. The W2 pilot's surprise #1 doctrine (enumerate consumer touch
points first) held + extended.** Phase 1 enumeration estimated
~260–270 sites + ~138 fixture lines. Actual touch points came in at
**~340 sites + ~150 fixture lines** — the Explore agent's bucket
table missed: (a) the 13 `*.astro` server-side aggregator components
that read `entry.chapter` to filter pedagogy-index slices,
(b) `format.ts` + `validation/index-generator.ts` + `pagefind-postbuild.ts`
consumer reads, (c) 4 in-component `<X chapter={…}>` JSX-expression
pass-throughs (Callout/Predict referencing internal sub-components),
(d) 7 component schema test files with `["course", "chapter", "id"]`
field-iteration literals that needed array-literal-aware migration.
**Doctrine refinement:** Phase 1 enumeration should grep BOTH
`packages/` AND `examples/smoke/` AND `docs/` BOTH for the field
name AND for property access patterns (`.chapter`, `?.chapter`,
`u.chapter` etc.) — the schema-field grep alone undercounts by
~25%.

**2. The python-regex bulk-rewrite pattern's blast radius cuts both
ways.** W2 pilot R2 recommended python regex for 10+ similarly-
shaped fixtures. W3 applied this for ~250 of the ~340 sites. But:
the same regex pattern that renamed parent-ref fixtures *also* hit
UnitEntry fixtures (which have a `chapter` D7-locked binding that
must NOT rename) and per-callsite props inside artifact-ref
components (which must KEEP `chapter`). Required THREE counter-passes:
(a) UnitEntry-revert script (heuristic: `section_id:` nearby + Unit-
discriminating fields `type: "lecture"`/`prereqs:`/`status:`),
(b) artifact-ref-component-skip in the JSX rename pass, and
(c) 1:1-alignment script (change UnitEntry.id to match UnitEntry.chapter
where the test fixture had diverged). **Doctrine bump:** the bulk
regex's first pass should be paired with a structural disambiguator
(brace-depth tracking or explicit type-tag check), not a positional
heuristic. The W2 pilot R2 stands; W3 adds a "discriminator-first"
caveat.

**3. Sub-component pass-through `prop={var}` JSX expressions broke
silently.** Pre-W3, `<Callout>` had:
`<ReviewedRow course={course} chapter={chapter} />` — both the JSX
attribute name AND the value expression were `chapter`. My JSX-
attribute regex renamed the LHS (`chapter=` → `unit=`) but left the
RHS (`{chapter}`) intact, producing `unit={chapter}` where `chapter`
was undefined (outer destructure had been renamed to `unit`). The
TypeScript compiler caught one in Callout.tsx (line 204) but axe-
clean tests ran further before failing. Three components affected
(Callout, Predict line 61, Predict line 75); SpacedReview.test.tsx
seedAttempt helper had the same shape. **Doctrine bump:** the JSX-
attribute regex must rename both sides of `={X}` value expressions
when the prop name renames.

**4. The runtime layer's `entry.chapter` reads in
`equation-citations-store` + `figure-usages-store` were upstream
build blockers that masked the next layer of issues.** When the
schema field renamed at Batch 2, `@sophie/components` failed to
build (TS error: "Property 'chapter' does not exist"). The build
break was visible at `EquationRef/equation-citations-store.ts:28`
and `FigureRef/figure-usages-store.ts:35` first. Forced bringing
parts of Batches 5 + 6 forward into Batch 3 to keep the dep graph
buildable. **Lesson:** in a multi-layer rename, the strict-build
gate at each layer catches inconsistencies faster than running tests,
but only if the regex covers EVERY consumer of the renamed shape.
Batch granularity should match `pnpm turbo run build --filter=…`
boundaries, not arbitrary "layer" labels.

**5. The dev preview e2e port surfaced a config-discovery surprise.**
First e2e run from `examples/smoke/` produced "Cannot navigate to
invalid URL" because Playwright's `webServer` didn't auto-start —
the `playwright.config.ts` lives at the worktree root, not in
`examples/smoke/`. Running `pnpm exec playwright test` from the
worktree root (so playwright finds its config) made all 157 e2e tests
pass cleanly. **Lesson:** Sophie's Playwright config is repo-root-
scoped; sub-package directory navigation breaks server discovery.
The `feedback_pre_pr_lockfile_check` doctrine extends naturally to
"and run Playwright from the worktree root" for any wedge that
exercises e2e.

## Recommendations + ADR backlog

**Recommendations for the next pilot:**

- **R1.** Extend the W2 Phase-1 enumeration grep to cover BOTH
  property-access (`entry.X`, `obj?.X`) AND prop-name (`X="..."`)
  AND key-shape (`${X}#${Y}`) patterns, not just the field-name
  declaration grep. W3's undercount was structurally the same as
  W2's "5 chunks → 14+ touch points" miss, just at a different
  layer.
- **R2.** Pair python-regex bulk-rewrites with a structural
  discriminator (brace-depth or explicit type-tag check). W3
  needed three counter-pass scripts to fix the regex's over-application.
- **R3.** When renaming a prop name, the JSX-attribute regex must
  rewrite both sides of `prop={var}` value expressions in the same
  pass. The TS compiler catches some misses but not all (the value
  reference can resolve to a different scope).

**Candidate ADRs (not drafted here — Anna's call on which earn an ADR):**

- *Document the "regex + structural disambiguator" pattern for
  multi-layer renames.* Could be a §addendum on ADR 0064 or a
  standalone ADR.
- *Document the "platform-pilot Shape α" template explicitly* —
  with each W1/W2/W3 pilot landing in the same shape, the template
  is now de-facto canon. Promote to an ADR or to ADR 0064 §2's
  template variants.

## Platform issues to file

W3 surfaced **zero platform-component gaps** (ADR 0064 §3 halt-on-gap
rule was not triggered). Every consumer-side fix landed in this PR.

## Success criteria

- ✅ All 15 per-callsite entry schemas renamed: `chapter` →
  `unit: Slug` (W3/D3 normalization bundled).
- ✅ UnitEntry.chapter (D7 reading-binding) preserved unchanged.
- ✅ `<ChapterRef chapter>` + 7 chrome `Chapter*` roll-up artifact-ref
  props preserved unchanged.
- ✅ 14 extractor emitters: `chapter: chapterSlug` → `unit: unitId`
  (param + field).
- ✅ Accumulator: `clearChapter` → `clearUnit`,
  `clearChapterCitations` → `clearUnitCitations`; ~28 internal Map-key
  reads renamed.
- ✅ ~10 audit invariants: `entry.chapter` → `entry.unit`,
  `location: { chapter: ... }` → `location: { unit: ... }`.
- ✅ `AuditExtras.draftChapterSlugs` → `draftUnitIds`.
- ✅ Audit Finding.location.chapter → location.unit (internal type);
  CLI output keeps `chapter:` prefix word per W3/D2.
- ✅ Runtime hooks renamed: `useInteractive(course, chapter, key)`,
  `useInteractiveRange`, `useInteractiveRangeMulti`, `useSelfAssessment`.
- ✅ `ResponseStore` interface + 3 implementations: `clearChapter` →
  `clearUnit`; param names renamed.
- ✅ `compositeKey` + `chapterKeyRange` → `unitKeyRange`; IDB key
  dimension semantic preserved (no data migration needed pre-launch).
- ✅ `BroadcastChannel.chapterChannelName` → `unitChannelName`.
- ✅ 12 parent-ref component schemas + .tsx files + tests + stories
  renamed.
- ✅ 4 smoke MDX `reading.mdx` files: 32 JSX prop renames on
  parent-ref components.
- ✅ 13 `*.astro` server-side aggregator components: internal
  `.chapter` property reads renamed to `.unit`; prop NAMES preserved
  for artifact-ref family.
- ✅ E2e proving-chapter.spec.ts type defs + filter callbacks updated.
- ✅ chapter-components.md updated with W3/D1 prop-name convention
  callout box.
- ✅ ADR 0067 gained a W3 revision-history entry.
- ✅ This pilot report at `docs/website/pilots/wedge-b-followup-w3-callsite-rename.md` per Shape α.
- ✅ Smoke build green: **12 pages, 125 pedagogy entries** —
  count-stable with W2 baseline.
- ✅ 461 `@sophie/core` unit tests pass.
- ✅ 790 `@sophie/astro` unit tests pass.
- ✅ 692 `@sophie/components` unit tests pass.
- ✅ 157 e2e + 5 skipped — matches W2 baseline.
- ✅ Biome 0/0 (full-output grep-verified).
- ✅ Typecheck clean (5 packages).
- ⏳ Pre-PR gates (lockfile + final biome + final builds) — requires
  Anna's explicit text-confirm per `feedback_no_questions_mode_scope`.
- ⏳ Code review request via `superpowers:requesting-code-review`.
- ⏳ PR open — requires Anna's explicit text-confirm.
