---
title: 'Pilot report: Wedge B-followup W4b — Topic registry + bridge rooms + SkillReview self-closing resolver + PRA-1 graduation'
short_title: 'Pilot: W4b affordances'
description: 'W4b platform self-migration pilot — ships ADR 0079 (topic registry + registry-resolution pattern), Scale 1 bridge rooms (ADR 0068), the `<SkillReview target="topic:…[#card]" />` self-closing MDX resolver, PRA-1 graduation WARN → ERROR with `audit_overrides` plumbing, new PRA-2 + BR-1 audits, and per-topic Spec pages. Shape α — platform self-migration framing per ADR 0064 §4.'
authors:
  - name: Anna Rosen
date: 2026-05-23
---

## Pilot context

**What W4b shipped.** Four net-new affordances + three audit
changes, all locked by [ADR 0079](../decisions/0079-topic-registry-and-resolution-pattern.md):

1. **Topic content registry** — new `topics` content collection
   at `src/content/topics/<category>/<topic-id>.mdx` (Design F:
   sub-grouped flat files with inline `<SkillReview.Card>` body
   blocks). `TopicEntry` + `CardEntry` Zod schemas join the
   `PedagogyIndex` shape. Two smoke fixtures:
   `topics/math/exponents.mdx` (2 cards) and
   `topics/math/logarithms.mdx` (3 cards).

2. **`<SkillReview target="topic:X[#card]" />` self-closing
   resolver** — MDX remark plugin at
   [`packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`](../../../packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts).
   Lifts a topic's matching `<SkillReview.Card>` body slots
   (Prompt + Answer) into the chapter MDX tree at compile time.
   Bare-form against multi-card topic = ERROR with curated
   available-cards message (per ADR 0079 Q6). Companion Vite
   plugin invalidates the resolver cache via `handleHotUpdate`
   on topic-file change (R+CR C3 follow-up).

3. **Bridge rooms (ADR 0068 Scale 1)** —
   [`examples/smoke/src/pages/[bridgeSlug].astro`](../../../examples/smoke/src/pages/[bridgeSlug].astro)
   single-param dynamic route. `getStaticPaths()` queries the
   sections content collection for `type: "bridge"` entries.
   Smoke fixture: `Section[type=bridge]` with slug
   `math-fundamentals` containing one `Unit[type=skill]`
   (`logarithms-skill`) referencing `topic_id: logarithms`.

4. **PRA-1 graduation + audit_overrides plumbing** — severity
   flips WARN → ERROR. Coverage check unchanged (fragment-strip
   means `topic:X#card` covers a prereq of `X`). New
   `AuditOverride` Zod schema; `UnitEntry.audit_overrides`
   field (`.optional()`); per-Unit override entries honor
   the three-grain ADR 0053 contract (invariant + anchor + TDR).

Plus two new audit invariants:

- **PRA-2** — topic frontmatter ↔ body card consistency. Split
  detection: extractor catches body→frontmatter orphans (emits
  via `extractorFindings`); audit catches frontmatter→body
  orphans (audit phase reads `index.topics`).
- **BR-1** — bridge slug uniqueness across Sections + Unit ids +
  reserved Library paths (`library`, `sections`, `units`,
  `topics`).

And one new affordance:

- **Topic Spec page** at `/library/topics/<topic-id>/` via
  [`pages/library/topics/[topicId].astro`](../../../examples/smoke/src/pages/library/topics/[topicId].astro)
  dynamic route. Library hub gains a Topics tile.

**Why now.** [W4a](./wedge-b-followup-w4a-library-routes.md) (PR
#161, merged 2026-05-23) locked `/library/<X>/` as the URL
convention; W4b populates the platform's prereq-pedagogy story
end-to-end. The W1→W4 sequence becomes functional: chapter
authors get a working `<SkillReview target="topic:..." />`
affordance with content-registry backing, course authors get a
Scale 1 bridge-room mechanic, and the audit catches the entire
class of "uncovered prereq → silent gap" issues at build time.

**Pre-launch posture.** Per
[`feedback_no_backcompat_prelaunch`](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md):
zero production students, PRA-1 ERROR has teeth, smoke fixture
ships its own covering callsites in the same PR (no transition
period).

**Per ADR 0064 §4 — structural-density-diversity criterion.**
W4b is a **platform self-migration**, not a consumer-chapter
migration. The structural profile differs from W4a (pure URL
renames), W3 (per-callsite schema rename), and W2 (file-layout
migration). W4b's profile is **design-pressure-heavy** —
1,800+ LOC across 35+ files, a net-new ADR (0079), four new
affordances, three new audit codes, and a Vite-plugin-shape
decision driven by R+CR. The pilot calibrates the
"new-ADR + cross-cutting-affordance" sub-wedge shape that W4c
will not match (W4c is chrome-extraction-heavy).

**What's explicitly out of scope.** W4c's missing CourseX chrome
(Observables / Models / Inferences from OMIFlowEntry slot data)
+ per-entry Spec pages + `<LibraryCollectionShell>` extraction;
ADR 0068 Scale 2 (inline mid-Section bridge blocks); the
`audit_overrides` demo smoke fixture (PRA-1 ERROR + override
plumbing is unit-tested with 24 tests, end-to-end smoke demo
deferred per [Q2 lock](../../../../.claude/plans/sophie-wedge-b-followup-logical-planet.md)).

## Shortcode → component dictionary

W4b touched seven implementation files in `@sophie/components` /
`@sophie/astro`:

| Component / module | Path | Purpose |
|---|---|---|
| `TopicEntry` + `CardEntry` schemas | [`packages/core/src/schema/pedagogy-index-entries/topic.ts`](../../../packages/core/src/schema/pedagogy-index-entries/topic.ts), [`card.ts`](../../../packages/core/src/schema/pedagogy-index-entries/card.ts) | New Zod entries in `PedagogyIndex` per ADR 0079 |
| `AuditOverride` schema | [`packages/core/src/schema/audit-override.ts`](../../../packages/core/src/schema/audit-override.ts) | Per-Unit override entry shape per ADR 0053 (three-grain: invariant + anchor + TDR) |
| `extractTopicAndCards` | [`packages/astro/src/lib/pedagogy-index/extractors/topic.ts`](../../../packages/astro/src/lib/pedagogy-index/extractors/topic.ts) | Walks topic MDX bodies; emits CardEntries + PRA-2 findings for orphan body cards |
| `skillReviewResolverRemarkPlugin` + companion Vite plugin | [`packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`](../../../packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts), [`skill-review-resolver-vite.ts`](../../../packages/astro/src/lib/mdx-plugins/skill-review-resolver-vite.ts) | MDX remark plugin lifts card slot children into chapter tree at compile time; Vite plugin invalidates resolver cache + dependent chapter modules on topic-file change in dev mode |
| `checkPRA2` + `checkBR1` | [`packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.ts`](../../../packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.ts), [`bridge-uniqueness.ts`](../../../packages/astro/src/lib/pedagogy-audit/invariants/bridge-uniqueness.ts) | New audit invariants per ADR 0079 |
| `buildModuleNavInputs` | [`packages/astro/src/lib/module-nav-helpers.ts`](../../../packages/astro/src/lib/module-nav-helpers.ts) | NEW (R+CR I5) — shared helper used by 10 routes; filters bridge sections from the module-tree nav |
| `[bridgeSlug].astro` + `library/topics/[topicId].astro` | smoke fixtures | NEW dynamic routes — Scale 1 bridge rooms + topic Spec pages |

## Migration touchpoint inventory

### Layer 1 — Net-new schema + content (8 files)

- `packages/core/src/schema/pedagogy-index-entries/topic.ts` +
  `card.ts` + `audit-override.ts` (3 new schema files).
- `examples/smoke/src/content/topics/math/exponents.mdx` +
  `logarithms.mdx` (2 fixture topics).
- `examples/smoke/src/content/sections/math-fundamentals.json` +
  `units/logarithms-skill.json` (bridge section + unit fixtures).
- `examples/smoke/src/content.config.ts` (topics collection
  registration).

### Layer 2 — `@sophie/astro` pipeline (9 files)

- New: `mdx-plugins/skill-review-resolver.ts` +
  `skill-review-resolver-vite.ts` + `skill-review-resolver.test.ts` +
  `skill-review-resolver-vite.test.ts` +
  `__fixtures__/topics/math/{exponents,logarithms}.mdx`.
- New: `pedagogy-index/extractors/topic.ts` +
  `topic.test.ts`.
- New: `pedagogy-audit/invariants/topic-consistency.ts` +
  `bridge-uniqueness.ts` (+ their `.test.ts`).
- New: `lib/module-nav-helpers.ts` + `.test.ts` (R+CR I5).
- Modified: `pedagogy-index/accumulator.ts` (addTopic /
  addCards / clearTopic / addExtractorFindings + split
  contractValidationFindings / appendedExtractorFindings
  storage); `pedagogy-index/orchestrator.ts` (topic-collection
  iteration); `pedagogy-audit/invariants/retrieval-family.ts`
  (PRA-1 ERROR severity + audit_overrides honoring);
  `pedagogy-audit/runner.ts` (wire PRA-2 + BR-1); `mdx-config.ts`
  (resolver plugin in chain after remarkMath, before pedagogy
  extractor); `integration.ts` (Vite plugin wiring).

### Layer 3 — Smoke fixtures (3 file modifications + 9 layout refactors)

- `spoiler-alerts/reading.mdx`: swapped 2 `<SkillReview>`
  callsites to self-closing form (`topic:exponents#power-laws`
  + `topic:logarithms#product-rule`).
- `ChapterLayout.astro` + 9 library route pages: refactored to
  use `buildModuleNavInputs(sections, units)` (R+CR I5 +
  bridge-filtering fix surfaced at e2e gate).

### Layer 4 — Docs (6 files)

- New: `docs/website/decisions/0079-topic-registry-and-resolution-pattern.md`.
- Modified: `docs/website/reference/chapter-components.md` (new
  Topics + bridge sections), `audit-baseline.md` (W4b
  graduation + new PRA-2 + BR-1 rows),
  `0068-bridge-rooms-and-prereq-pedagogy.md` (revision-history
  entry), `0070-library-room-and-registry-spec-pages.md`
  (Topics room revision entry), `status/validation.md`
  (regenerated).

### Layer 5 — Tests (across the surface)

- `@sophie/core`: 473/473 (was 473) — TopicEntry + CardEntry
  schema tests integrated in the existing run.
- `@sophie/astro`: 832/832 unit (was 198 + ~630 pre-W4b on the
  full suite; net +34 W4b-specific tests: 6 topic extractor
  + 9 resolver + 4 resolver-vite + 5 PRA-2 + 6 BR-1 + 7
  module-nav-helper + audit_overrides plumbing tests embedded
  in retrieval-family).
- e2e: 157 passed / 5 skipped / 0 failed (was 156 pre-W4b
  baseline; +1 e2e bridge-route spec opted-in via the new
  `math-fundamentals` smoke fixture).

## Estimates vs. actuals

| Phase | Engineer-plan estimate | Actual |
|---|---|---|
| Phase-1 enumeration (design doc + plan + ADR) | 3 docs | 3 docs (ADR 0079 + design + plan) |
| Batches 1–8 (schemas → resolver → audit → routes) | ~1200–1800 LOC, ~50–80 files | ~1700 LOC, 14 commits, 53 files modified |
| Batch 9 docs sweep | ~6 doc files | 6 doc files |
| Batch 10 pre-PR gates | Pass first try | 1 e2e regression caught (math-fundamentals bridge in ModuleNav); root-cause refactor (filter bridges in `buildModuleNavInputs` helper + ChapterLayout migration), 1 fix commit |
| R+CR (Phase 2) | "Maybe 2–3 Important findings" | 3 Critical + 5 Important + 7 Minor. APPROVE WITH FIXES. |
| Batch 11 R+CR follow-up | Not in original estimate | +1 substantial fix commit (~795 lines net diff covering C1+C2+C3+I1–I5+N1+N2) |
| Time to PR-ready | ~2 days estimated | ~2 days actual, all in one session |

The biggest delta vs. plan: **R+CR found three Critical issues
that desk verification (Phase 1) missed**. Those weren't
"reviewer wrong" findings — they were genuine class-of-issue
patterns desk verification structurally can't catch:

- **C1** (PRA-2 direction-B dead code in production): required
  reading the extractor's silent-skip + the invariant's
  consumed input side-by-side to see that the audit could
  never see the orphan blocks the comment claimed it would.
- **C2** (`FindingSink` shape drift): required cross-file
  pattern-matching (`grep -r "^interface FindingSink"`); single
  file Read wouldn't notice the redefinition.
- **C3** (resolver cache HMR staleness): required reasoning
  about runtime dynamics (dev-mode caching vs.
  one-shot-build caching) that static reads of the resolver
  code can't surface.

Lesson: desk verification covers *correctness against ADR* but
not *correctness against runtime dynamics* or *cross-file
consistency*. The two layers complement; both are needed.

## Doctrine review

### W3 R1 — Multi-pattern Phase-1 enumeration ✓

The W4b design doc §3 enumerated touchpoints across schema,
audit, accumulator, MDX plugin, Astro routes, content
collection, course/section YAML, smoke fixtures, e2e specs,
docs. The estimate matched actuals within ±20% on file count
and LOC.

**W4a R4 extension applied.** Design doc §3.10 explicitly
listed `docs/website/` updates as Phase-1 scope (chapter-
components, audit-baseline, ADR 0068/0079, validation.md).
All 6 doc files updated in the same PR per
[`feedback_docs_no_drift`](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_docs_no_drift.md).

### W3 R2 — Structural disambiguator on rewrites ✓ (N/A for net-new)

W4b is dominantly net-new code, not renames; the disambiguator
doctrine had limited application. The R+CR I5 refactor
(`buildModuleNavInputs` extraction across 10 callsites) is the
closest renaming-style move; the helper extraction +
mechanical refactor pattern matched W3's clean-rewrite shape.

### W3 R3 — JSX value-expression caveat ✓ (N/A)

W4b included no `prop={var}` rewrites.

### W4a R4 — `docs/website/` in Phase-1 scope ✓

Applied at design-doc time. The W4a-era miss (live-doc
references caught by R+CR) didn't repeat; W4b's docs sweep
landed all 6 files in the same PR.

### W4a R5 — Verify cited ADRs by reading ✓ (mostly)

Phase 1 read ADR 0053, 0068, 0070, 0079 in full before
locking scope. **One miss surfaced at R+CR I1**: ADR 0079's
citation of "ADR 0053 §`audit_overrides` chapter frontmatter"
used a GitHub `#L103` line-anchor that MyST doesn't resolve.
The cited heading exists; the *link target* doesn't. See R6
proposal below.

## Surprises

### Surprise #1: LaTeX JS-escape boundary in resolver (Batch 5)

When the resolver lifted card slot children containing LaTeX
math (`$\cdot$`, `$b^{m+n}$`) from topic files into chapter
MDX trees, the chapter compiler's JS-escape pass rejected
backslashes in JSX text content as invalid JS escape
sequences (`\c` is not a valid escape). Root cause: the topic
AST was parsed WITHOUT the math extension, so LaTeX
backslashes survived as raw text. Fix: parse topic files with
BOTH `mdxjs()` AND `math()` extensions so the resolver hands
the chapter compiler proper inline-math AST nodes, not raw
LaTeX strings.

### Surprise #2: `.default([])` → `.optional()` schema flip (Batch 8)

`AuditOverride` was initially designed as `audit_overrides:
z.array(...).default([])` on `UnitEntry`. The default cascaded
to every existing test fixture (~30 sites) demanding an
empty-array field that none of them had reason to know about.
Mid-Batch-8 flip to `.optional()` + `?? []` consumer fallback
in PRA-1 eliminated the cascade. The R+CR's I2 then caught
the one test fixture that DID explicitly set `[]` and
recommended dropping the line. **Schema-shape choices have
test-fixture-radius implications that don't surface until you
write the consumer.**

### Surprise #3: Cross-file position-info issue (Batch 5)

The resolver's `findSlotChild` initially declared a return
type of `MdxJsxFlowElement | null` even though it could
return an `mdxJsxTextElement` (MDX parses inline JSX
`<Slot>text</Slot>` as text-level). The mismatch survived
type-checking via an `as unknown as MdxJsxFlowElement` cast.
R+CR's N1 widened the return type to
`MdxJsxFlowElement | MdxJsxTextElement | null`; the call-site
cast remains (it's a documented widening to the parent's
`children` union shape) but the function's signature no
longer lies about what it returns.

### Surprise #4: PRA-2 direction-B was structurally dead (R+CR C1)

The W4b design defined PRA-2 as catching both directions of
frontmatter ↔ body card drift. But the topic extractor's
silent-skip pattern (`if (!declared) return;`) meant body
orphans never reached the audit phase — only hand-crafted
unit-test fixtures could exercise direction (B). The
extractor's docstring claimed "PRA-2 makes that drift LOUD"
but the code path didn't honor the claim. R+CR caught it; fix
moves direction-B detection into the extractor itself via
`addExtractorFindings`, with `topic-consistency.ts` retaining
direction-A only. **Both directions now emit findings under
the same `PRA-2` code so authors learn one concept.**

### Surprise #5: Resolver HMR cache staleness (R+CR C3)

Resolver caches (topic AST + id↔path map) lived for the
lifetime of the Vite dev-server process. Editing a topic file
in dev mode left the resolver serving stale prompts/answers
until restart — the exact authoring inner-loop the resolver
is designed to unlock. Fix: companion Vite plugin
(`skill-review-resolver-vite.ts`) with `handleHotUpdate` that
calls `invalidateTopicFile(filePath)` AND looks dependent
chapters up in Vite's module graph via a per-compile
chapter→topic dep map populated by the remark plugin.
Production builds (one-shot) are unaffected.

### Surprise #6: `FindingSink` schema drift (R+CR C2)

Two new audit invariants (`topic-consistency.ts`,
`bridge-uniqueness.ts`) locally redeclared `FindingSink` with
field `infos` (plural) instead of importing the canonical
`info` (singular) from `../types.ts`. The drift was latent —
both invariants only pushed to `sink.errors` — but any future
INFO push would have silently lost the finding. Two `as any`
casts in the runner papered over the type mismatch. Fix: drop
local declarations, import canonical, drop both casts.

### Surprise #7: Bridge sections in ModuleNav (Batch 10 e2e regression)

Adding a `Section[type=bridge]` (`math-fundamentals`) to the
sections collection made `<ModuleNav>` show 3 modules where
the baseline expected 2. **The e2e test caught the structural
issue, not just a count drift**: bridge Units don't have
`/units/<u>/reading` URLs, so surfacing them as ModuleNav
chapters would create dead links. Fix landed in the
`buildModuleNavInputs` helper (filter `type: "bridge"` from
both `modules` and `chapters` outputs); `ChapterLayout.astro`
also migrated to use the helper (the 10th callsite the R+CR
I5 helper extraction hadn't yet covered).

## Doctrine refinements

### R6 (proposed) — MyST anchor verification extends R5

W4a's R5 doctrine says "verify cited ADRs by reading." W4b's
R+CR I1 catches a case R5 misses: the cited ADR existed and
had the correct heading, but the *link target syntax* (GitHub
`#L103` line-anchor) didn't resolve in MyST. R6 extension:
when citing an ADR section, verify the link target syntax
matches MyST's heading-slug convention by either (a) building
the docs site locally before merge, or (b) using a grep gate
in CI for `#L\d+` patterns across `docs/website/decisions/`.

### R7 (proposed) — silent-skip extractor sites need paired invariant or push

R+CR C1's root pattern: an extractor silently filtered invalid
input + the invariant designed to catch that input never saw
it. R7 rule: every silent-skip site in an extractor must
declare (in a code comment) how the filtered case surfaces to
the user (either a paired audit invariant that reads the
populated index OR an `extractorFindings` push at the
filter site). Bare silent-skips without disposition violate
the contract and produce dead-code audits.

### R8 (proposed) — module-scoped caches in MDX pipeline declare HMR strategy

R+CR C3's root pattern: a module-scoped cache lived longer
than the dev-mode HMR cycle expected, producing stale results
for authors editing dependent files. R8 rule: any module-
scoped or `globalThis`-scoped cache in the MDX-compile
pipeline must declare (in a header comment near the cache
declaration) (a) when it's invalidated in production builds,
(b) when it's invalidated in dev-mode HMR, and (c) the
companion Vite-plugin or framework hook that does the
invalidation. Caches without declared HMR semantics violate
the contract.

### R9 (proposed) — local-vs-imported type drift detection

R+CR C2's root pattern: a type with a canonical home was
redeclared in two sibling files, drifted (field name `info`
vs `infos`), and the bridge code papered over the drift with
`as any` casts. R9 rule: CI gate enforces "every named
interface has exactly one declaration in `src/**/*.ts`" via a
`grep -r "^interface <Name>"` count check. New PRs adding a
local redeclaration of an existing type fail CI.

These four rules formalize the class-of-issue patterns
R+CR caught that desk verification cannot.

## R+CR findings + resolutions

The pre-PR `superpowers:requesting-code-review` subagent
returned **APPROVE WITH FIXES**:

| Severity | Finding | Resolution |
|---|---|---|
| **Critical (C1)** | PRA-2 direction-B dead in production | Extractor emits PRA-2 finding via `addExtractorFindings` for orphan body cards; audit invariant retains direction A only. Both directions emit under same `PRA-2` code. |
| **Critical (C2)** | `FindingSink` local-redeclaration drift (`infos` vs `info`) | Import canonical `FindingSink` from `../types.ts` in both new invariants; drop `as any` casts in runner. |
| **Critical (C3)** | Resolver cache HMR staleness | New `skill-review-resolver-vite.ts` companion Vite plugin; resolver tracks chapter→topic deps; `invalidateTopicFile` returns dependents from the map; `handleHotUpdate` surgically invalidates dependent chapter modules. |
| **Important (I1)** | ADR 0079:376 GitHub `#L103` anchor doesn't resolve in MyST | Replaced with kebab-case `#audit_overrides-chapter-frontmatter` slug. |
| **Important (I2)** | `audit_overrides: []` in BR-1 test fixture defeats `.optional()` schema intent | Dropped the explicit `[]` from the test helper. |
| **Important (I3)** | Resolver bare-multi-card error wording leads with symptom | Rewrote to lead with the rule ("bare topic targets auto-pick only when the topic has exactly one card") followed by available-cards list. |
| **Important (I4)** | Resolver test triple-casts past unified `Plugin<>` signature | Rewrote using `unified().use(plugin, opts).run(tree)` pipeline; exercises the same MDX-from-markdown + mdxjs parse the production pipeline uses. |
| **Important (I5)** | `chapter: undefined as number \| undefined` cast duplicated in 2 W4b sites | Extracted `buildModuleNavInputs(sections, units)` helper in `@sophie/astro`; refactored 10 callsites (2 W4b + 7 W4a + ChapterLayout). |
| **Minor (N1)** | `findSlotChild` return type lies about text-level return | Widened return type to `MdxJsxFlowElement \| MdxJsxTextElement \| null`. |
| **Minor (N2)** | No header-level comment about AST in-place mutation | Added file-level docstring covering AST mutation contract + module-scoped caches + HMR-companion Vite plugin reference. |
| Minor (N3) | `resetSkillReviewResolverCache` test-only export visibility | Acknowledged; ship-as-is per ADR 0061 (one-file focused module). |
| Minor (N4) | `RESERVED_PATHS` duplication potential between BR-1 + future routes | Acknowledged; YAGNI defer (W4c may surface a second consumer). |
| Minor (N5) | Topic Spec page renders labels only (not Prompt/Answer body) | Documented as v1 limitation; W4c may render inline. |
| Minor (N6) | Smoke vs test-fixture `exponents` card-count divergence | Acknowledged; test name accurate against fixture; no correctness issue. |
| Minor (N7) | YAML pipe-block consistency in topic files | Acknowledged; both forms are valid YAML; defer convention until topics expand. |

## Handoff to W4c

W4b inherits forward:

1. **Topic registry + Spec page route** at
   `/library/topics/<id>/` — W4c's shell extraction
   (`<LibraryCollectionShell>`) will refactor this route + 6
   other library/* pages to share chrome.
2. **`buildModuleNavInputs` helper** — new shared helper +
   ADR-0068-aware bridge filter. W4c routes can use it from
   day one.
3. **PRA-1 ERROR + `audit_overrides` plumbing** — Unit-level
   override surface ready for course authors to opt out
   per-callsite with TDR-anchored provenance.
4. **PRA-2 + BR-1 audit invariants** — quiet at the W4b
   baseline; ready to fire on future drift.
5. **Resolver pattern** — the MDX-remark-plugin shape +
   companion Vite plugin pattern (one for cache, one for HMR)
   is reusable. ADR 0044 misconception interventions (future)
   and ADR 0046 equation-biography refs (future) can amend
   ADR 0079's revision history with their own self-closing
   target prefixes.
6. **Doctrine bumps R6–R9 proposed.** W4c brainstorm should
   confirm or refine each, then they become standing review
   checklist items.

The next sub-wedge is W4c — missing CourseX chrome
(Observables / Models / Inferences from OMIFlowEntry slot
data) + per-entry Spec pages + `<LibraryCollectionShell>`
extraction. Per [W4 meta-plan
Q4a/Q4b](../../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md),
the 3 deferred rooms (Assumption, Approximation, Numerical)
wait until ADR 0058 role-tagging extends. After W4c lands,
Wedge B-followup is closed; the post-W4 milestone is the next
ADR-0064 chapter pilot, which will exercise the full Library
+ bridge + topic-registry + SkillReview-resolver stack
end-to-end against a real curriculum surface.
