# Post-W4b platform audit (2026-05-23)

**Branch:** `feat/wedge-b-followup-w4c` tracking `origin/main` at
`e128316` (W4b squash-merge). Audit run from
`/Users/anna/Teaching/sophie/.worktrees/wedge-b-followup-w4c/`.

**Scope:** code + architecture audit BEFORE W4c lands its
`<LibraryCollectionShell>` extraction + 3 new CourseX siblings + 8
per-entry Spec routes on top. Catalog-only; no fixes. Anna triages
finding-by-finding.

**Authorship:** Claude (Opus 4.7 1M), Phase A of post-W4b session.
Plan at `~/.claude/plans/you-re-starting-a-fresh-memoized-starlight.md`.

---

## A1 — Pre-launch hygiene baseline

| Gate | Status | Detail |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ PASS | exit 0 |
| `pnpm exec biome check` | ✅ PASS | exit 0; 715 files checked; 0 errors, 0 warnings (grep verified) |
| `pnpm turbo run typecheck --force` | ✅ PASS | exit 0 |
| `pnpm turbo run test --filter='@sophie/*' --force` | ✅ PASS | exit 0; 4 tasks successful |
| `pnpm --filter smoke build` | ✅ PASS | exit 0; 16 pages (including `/math-fundamentals/` bridge route, `/library/topics/exponents/`, `/library/topics/logarithms/`); 125 pedagogy entries indexed; Pagefind built |
| `npx mystmd build --html` (in `docs/website/`) | ✅ PASS | exit 0; zero warnings/errors |
| `pnpm exec playwright test` | ✅ PASS | exit 0; **157 passed / 5 skipped / 0 failed** — exact match with W4b pilot baseline (after correcting smoke-build filter; see A1-X1) |

**Diff vs. W4b pilot baselines:**

- `@sophie/core`: 473/473 expected (the test-task tail showed
  `Tasks: 4 successful, 4 total` aggregated — per-package counts
  not reported in turbo output without `--verbose`; behavior green).
- `@sophie/astro`: 832/832 expected (same caveat).
- e2e: **157 passed / 5 skipped / 0 failed** — exact match. ✓

**All A1 gates PASS.** The platform is W4c-ready from a hygiene
standpoint.

**Plan-correction finding (A1-X1):** the Phase A plan listed the
smoke-build gate as
`pnpm turbo run build --filter=@sophie/astro-smoke`, but the actual
smoke fixture package is named `smoke` (per
`examples/smoke/package.json`). The mis-filter silently exited 0
without building the smoke fixture, then the e2e webServer
(`pnpm --filter smoke preview --port 4321`) crashed with
"Did you run `astro build`?". Recommendation: update the standing
pre-PR gate runbook to use `pnpm --filter smoke build` (or
`pnpm turbo run build --filter=smoke`). Affects any operator using
the published runbook; **address pre-W4c (docs-only one-liner).**

---

## A2 — R6–R9 retroactive sweep

### R6 — MyST anchor verification

`grep -rnE "#L[0-9]+" docs/website/**/*.md`

| File:line | Anchor | Severity |
|---|---|---|
| `docs/website/decisions/0004-component-contract-revisions.md:169` | `#L36-L53` in inline link to `packages/core/src/schema/pedagogy-index.ts` | **Important** |
| `docs/website/reference/component-contract.md:424` | same `#L36-L53` anchor | **Important** |

Both link to a source-file line range that MyST won't resolve. The
W4b pilot's three `#L103` mentions are intentional documentation
explaining R6 itself; not violations.

**Remediation per violation:** rewrite as either (a) named heading
slug if the linked source has one near the cited range, or (b) plain
file link without the anchor + add inline prose pointing readers to
the relevant lines. Pre-W4c: ~5 min, two single-line edits.

### R7 — Silent-skip extractor sites disposition

`grep -rnE "if \(!.*\) return;?$" packages/astro/src/lib/pedagogy-index/extractors/`

| Site | Filter | Disposition | Severity |
|---|---|---|---|
| `extractors/topic.ts:51` | missing/non-string `id` attr on `<SkillReview.Card>` | None; no paired invariant, no `findings.push`. A malformed `<SkillReview.Card>` (no `id=`) silently drops. | **Minor** |
| `extractors/figures.ts:47` | `if (!name) return; // inline-mode <Figure src="...">` | Comment explains: inline-mode figures legitimately don't index. ✓ | OK |
| `extractors/interventions.ts:71` | `if (!node || typeof node !== "object") return;` | Defensive type guard against unknown visitor input; not a content filter. ✓ | OK |
| `extractors/inline-refs.ts:51` | `if (!el.name) return;` | Defensive (unnamed element can't be a ref). ✓ | OK |
| `extractors/inline-refs.ts:53` | `if (!target) return;` | Intentional: only 4 inline-ref types match `INLINE_REF_TARGETS`. ✓ | OK |
| `extractors/inline-refs.ts:56` | `if (!refKey) return;` | Comment claims D4/E4/F2/C1 audit pairs (confirmed exist), but those check the *target collections* (e.g., missing glossary entry), NOT the source-side empty-prop case. A `<GlossaryTerm>` literal with no `name=` is silently dropped from the index; no audit can catch it. | **Minor** |
| `extractors/biography.ts:53` | `if (!child || typeof child !== "object") continue;` | Defensive type guard. ✓ | OK |
| `extractors/biography.ts:172` | `if (!hasAnyBiography) return undefined;` | Function-level early return, not a per-item filter. ✓ | OK |

**Remediation proposal — Minor R7 sites:**

- `topic.ts:51` — add a comment explaining the disposition gap, or
  push a `findings` entry for malformed `<SkillReview.Card>` (the
  W4b PRA-2 pattern would extend naturally).
- `inline-refs.ts:56` — fix the disposition comment (it
  mis-describes what D4/E4/F2/C1 catch) or add a `findings.push`
  for empty-prop case. Low priority because malformed JSX is
  TS-flagged at the prop level.

### R8 — Module-scoped MDX caches with HMR strategy

`grep -rnE "^(const|let) \w+\s*[:=].*(new (Map|Set|WeakMap)|Map<|Set<|WeakMap<)" packages/astro/src/lib/{mdx-plugins,pedagogy-index}/`

| Site | Cache | HMR-strategy comment? | Severity |
|---|---|---|---|
| `mdx-plugins/skill-review-resolver.ts:57, 59, 69` | `topicPathCacheByDir`, `topicAstCache`, `topicToDependentChapters` | YES — file header block lines 14–48 explicitly documents HMR strategy via companion Vite plugin. ✓ | OK |
| `pedagogy-index/transforms/chapter-opener.ts:30` | `CHROME_HEADING_TEXTS` — frozen lookup data, not a runtime cache | N/A — read-only constant Set; module-reload invalidates naturally; not in R8 scope. ✓ | OK |

**Zero R8 violations.**

### R9 — One canonical declaration per named interface

`grep -rnE "^(export )?interface [A-Z][A-Za-z0-9_]+" packages/*/src/`

| Interface | Sites | Severity | Note |
|---|---|---|---|
| `NavChapter` | `components/ModuleNav.astro:17` + `lib/module-nav-helpers.ts:17` | **Important** | W4b R+CR I5 extracted the helper but `ModuleNav.astro` still has its own copy. The helper file's comment claims "structural drift catches at tsc," but the literal R9 rule wants one home. Fix: `ModuleNav.astro` imports from `module-nav-helpers.ts`. |
| `NavModule` | same as above | **Important** | Same fix |
| `MdxJsxFlowElement` | `lib/pedagogy-index/jsx-utils.ts:11` (canonical export) + 6 test-mock sites: `snapshot.test.ts`, `biography.test.ts`, `multirep.test.ts`, `omi-flow.test.ts`, `intervention.test.ts`, `learning-objectives.test.ts` | **Minor** | Test-mock locals are a recognized isolation pattern but they CAN drift; the W4b R+CR C2 root cause was production-side drift, which doesn't apply here. Proposal: refine R9 — production code = exactly one declaration (enforced); test mocks = strongly prefer importing the canonical type unless deliberate narrowing is documented. |
| `MdxAttribute` | 5 test-mock sites (no canonical declaration) | **Minor** | Same R9 refinement applies |
| `Root` | 4 test-mock sites (canonical is from `mdast`) | **Minor** | Importing `Root` from `mdast` is straightforward; tests should use the import, not redeclare |
| `Props` | many component-local declarations | OK | Component-local Props are R9-exempt by convention (each `.astro` file owns its own Props) |

**FindingSink, AuditContext, HeadingGroup**: each has exactly one
declaration (the W4b R+CR C2 fix held). ✓

**Remediation proposal — Important R9 violations:**

`NavChapter` / `NavModule` — single 5-line refactor in
`ModuleNav.astro` to `import type { NavChapter, NavModule } from
"../lib/module-nav-helpers"`. Pre-W4c: ~10 min.

**Remediation proposal — Minor R9 (test-mock):**

Update `feedback_review_rules_r6_r9.md` to split R9 into
**R9-production** (hard rule) and **R9-test** (prefer import over
redeclare; redeclare only when documented isolation need exists).
Apply at AGENTS.md codification time; not pre-W4c.

---

## A3 — Cross-cutting consistency patterns

### audit_overrides honoring map

Scanned every invariant file. Only `retrieval-family.ts` (PRA-1)
currently honors `audit_overrides`. All others do not.

| Invariant file | Honors `audit_overrides`? | Reasonable to honor? | Disposition |
|---|---|---|---|
| `retrieval-family.ts` (PRA-1, etc.) | YES (W4b) | ✓ | ✓ |
| `bridge-uniqueness.ts` (BR-1) | NO | NO — course-wide structural | Defer; structural integrity |
| `chapter-title-collisions.ts` | NO | NO — structural | Defer |
| `chapter-status.ts` | NO | NO — structural | Defer |
| `biography.ts` | NO | Maybe (Unit-level INFO/WARN) | Surface as future work |
| `equation-registry.ts` (R1–R4) | NO | R2/R4 yes (WARN); R1/R3 no (registry integrity) | W4c / later |
| `extractor-findings.ts` | NO | NO — extractor-emitted findings | Defer |
| `inline-refs.ts` (D4/E4/F2/C1) | NO | YES — author may suppress in-flight broken refs | Surface as future work |
| `interventions.ts` (I1–I3) | NO | I1/I3 yes (WARN/INFO) | Surface as future work |
| `key-insights.ts` | NO | Possibly | Defer to evaluation |
| `misconception-graph.ts` (MG3–MG4) | NO | NO — structural | Defer |
| `misconception-pairing.ts` | NO | NO — structural | Defer |
| `multirep.ts` (MR1, MR2, MR4, MR6) | NO | MR2/MR4/MR6 yes (WARN/INFO); MR1 no | Surface as future work |
| `notation-registry.ts` | NO | Maybe | Defer to evaluation |
| `objectives.ts` | NO | Possibly | Defer to evaluation |
| `omi-flow.ts` (OF-1, OF-2) | NO | OF-1 yes (WARN); OF-2 maybe | Surface as future work |
| `orphans.ts` | NO | Yes likely (WARN) | Surface as future work |
| `topic-consistency.ts` (PRA-2) | NO | YES — author may suppress in-flight body↔frontmatter drift | **Pre-W4c candidate** — same family as PRA-1, same ADR (0079), should match severity escape |
| `validation.ts` | NO | NO — structural | Defer |

**Severity:** Minor cross-cutting drift; not a launch blocker.
**Pre-W4c candidate:** PRA-2 (`topic-consistency.ts`) honoring
`audit_overrides` is a 1-PR addition that mirrors PRA-1's W4b shape
and would consistent the topic-family audit story. ~30 LOC + tests.

### Bridge filtering completeness

`grep -rn "sections\.filter\|sections\.map\|type === \"bridge\"" packages/astro/src/ examples/smoke/src/pages/ examples/smoke/src/layouts/`

| Site | Behavior on bridge sections | Verdict |
|---|---|---|
| `lib/module-nav-helpers.ts:52` | Filters bridges out of module/chapter nav (W4b R+CR I5) | ✓ |
| `examples/smoke/src/layouts/ChapterLayout.astro:83` | Same filter as helper (W4b Batch 10 e2e regression fix) | ✓ |
| `examples/smoke/src/pages/[bridgeSlug].astro:31` | INCLUDES bridges intentionally (this is the bridge route) | ✓ |
| `lib/pedagogy-audit/invariants/bridge-uniqueness.ts:34,41` | INCLUDES bridges intentionally (audit IS about bridges) | ✓ |
| `components/TextbookLayout.astro:154` | Passes ALL sections to `indexAccumulator.setSections` (data setup) | ✓ Correct — accumulator needs all sections for downstream audits |
| `lib/pagefind-postbuild.ts:85` | Walks ALL sections including bridges; builds Pagefind facet keyed by slug | **Question — pre-W4c verify**: are bridge sections being indexed for Pagefind facets correctly? Should bridge slugs appear in the section facet? May be fine (bridges are real top-level URLs) but worth verifying. |
| `lib/pedagogy-audit/invariants/retrieval-family.ts:189` | `new Set(index.sections.map((s) => s.slug))` — includes bridges in "known sections" set for PRA-1 coverage check | **Question — pre-W4c verify**: PRA-1 coverage walks "this or prior Sections." Does "prior" iteration order include bridges? If a course has a Section-of-prereqs THEN a bridge THEN a content Section, does the bridge's `<SkillReview>` (if any) count as covering a later Section's prereq? Most likely YES (intentional) — bridges are where prereq drilling lives. But worth confirming the iteration order. |

**Severity:** Two open questions on bridge-handling intent (Pagefind
+ PRA-1). Neither is a known regression; both are
verify-then-document items.

### Dead-code audit pattern (W4b C1 root) — spot checks

Sampled 4 audit invariants beyond PRA-2 to confirm no extractor
silent-skip + invariant-can't-see pattern.

| Invariant | Reads index field | Extractor populates field via | Pattern check |
|---|---|---|---|
| OF-1, OF-2 (`omi-flow.ts`) | `index.omiFlows` | `extractOMIFlows` — no silent-skip; throws on missing required slots | ✓ Clean |
| MR1, MR2, MR4, MR6 (`multirep.ts`) | `index.multiReps`, gated on `notationRegistry` opt-in | `extractMultiReps` — no silent-skip beyond defensive type guards | ✓ Clean |
| R1, R2, R3, R4 (`equation-registry.ts`) | `index.equations`, `index.equationCitations` | `extractEquationRegistry` + `extractEquationCitations` — clean | ✓ Clean |
| I1, I2, I3 (`interventions.ts`) | `index.interventions` | `extractInterventions` — defensive type guards only | ✓ Clean |

**No new C1-shape dead-code audits surfaced in spot checks.** R7
sweep above caught the closest candidate (topic.ts:51) but it's a
defensive-guard case, not a content-silencer. Recommend broader
sweep be **deferred** until R9 codifies (Phase B branch can sweep
the remaining 13 invariants if a finding's worth surfacing).

---

## A4 — Component-pattern coherence

### Course* baseline (W4c shell-extraction readiness)

Read all 6 `packages/astro/src/components/Course*.astro`.

**Common shape (5 of 6 — Glossary, KeyInsights, Equations, Misconceptions, Figures):**

- Frontmatter imports `indexAccumulator` + entry type
- Destructure `{ X } = indexAccumulator.asPedagogyIndex()`
- `Props { heading?: string; order?: ... }`
- Empty-state paragraph (per-component empty-text)
- Outer wrapper: `<dl class="sophie-course-X" data-sophie-course-X="">` (Figures uses `<ol>`)
- Per-entry render: `<Fragment>` (or `<li>` for Figures) with BEM
  `__term` + `__body` + `__backlink`
- Backlink: `<a href={"/units/${unit}/reading#${anchor}"}><code>{unit}</code></a>`
- Pure Astro; no client JS; `set:html={entry.body}` for pre-rendered
  body content

**Structural outlier — CourseObjectives:**

- 3-level grouping (Module → Chapter → Objectives)
- `<section>` → `<article>` → `<ul>` instead of flat `<dl>`
- Own local `GroupedChapter` / `GroupedModule` interfaces
- Inline style block (`__body { display: inline }`)
- Backlink format diverges: `<a href={"/units/${chapter.id}/reading"}>`
  (no anchor — chapter-level)

**Axe-core test coverage:** **ZERO**. None of the 6 Course*
components has a `.test.ts` sibling or any axe assertion in any
test file.

**Pre-W4c implication for the shell extraction:**

- Common shell can wrap 5 of 6 (heading + empty-state + outer
  element with parameterized `data-` attr + slot)
- CourseObjectives may need either a special-case shell-variant
  OR stay outside the shell extraction (justified as "3-level
  grouping is structurally distinct").
- All 6 should get axe-core test coverage as part of W4c (per
  meta-plan Q4a "axe-core tests on shell + post-refactor
  components" — make sure this scope language extends to existing
  6 not just net-new 3).

**No refactor proposal here** — Phase C designs the shell.
Observation only.

### Resolver pattern reuse triggers

- `<EquationRef>` already exists at
  `packages/components/src/components/EquationRef/` with both
  inline-text AND self-closing forms (per
  `EquationRef.schema.ts:5-6`). BUT its self-closing case is a
  simple registry-title lookup — not a card-style children-lift.
  Not a resolver-pattern second caller.
- `<MisconceptionRef>` is REFERENCED in
  `Intervention.tsx:39` JSDoc as "documented in ADR 0044 §R8" but
  **no component file exists**. No code surface to factor against.
- The `<SkillReview target="topic:X" />` resolver in
  `mdx-plugins/skill-review-resolver.ts` is currently the only
  caller of the lift-children-from-another-file pattern.

**Verdict:** YAGNI. Don't pre-factor the resolver during W4c.
Wait for ADR 0044 R8 `<MisconceptionRef>` or ADR 0046 biography
self-closing — whichever ships first becomes the second caller,
and that PR can extract the shared utility from W4b's resolver +
its own resolver in one go. **No W4c action.**

### OMIFlow shape sufficiency for W4c rollups

`packages/core/src/schema/pedagogy-index-entries/omi-flow.ts` +
`packages/astro/src/lib/pedagogy-index/extractors/omi-flow.ts`.

OMIFlowEntry per callsite carries:
- `unit: Slug` (parent Unit id)
- `anchor: NonEmptyString`
- `concept?: string` (optional Notation Registry binding)
- `observable: { title: string; body: string }` — pre-rendered HTML
- `model: { title: string; body: string }`
- `inference: { title: string; body: string }`
- `sourceOrder: tuple` (for OF-1 audit)

**For CourseObservables / CourseModels / CourseInferences rollups:**

- Need: per-slot title + body + parent unit + anchor (for backlink)
- Have: ALL of these on each OMIFlowEntry. ✓
- Optional epistemicRole per slot: implicit from slot name
  (`OMIFlow.Observable` → role `observable`); ADR 0058 §4 codifies
  this for composites without requiring an explicit field.
- Cross-refs to MultiRep / EquationBiography: optional `concept`
  field links to Notation Registry; v2 enhancement.

**Verdict:** OMIFlow shape is sufficient for v1 rollups. **No
schema changes required for W4c.**

---

## A5 — Documentation health

### MyST build

`npx mystmd build --html` in `docs/website/` — exit 0, zero
warnings, zero errors. ✓

### validation.md drift

Ran `pnpm exec tsx scripts/regenerate-validation-index.mts`; result:
"Regenerated docs/website/status/validation.md from 105 contracts
(0 extractor findings)." `git diff` against committed: **empty**.

**Zero drift.** ✓ The W4b PR correctly regenerated validation.md
per `feedback_validation_dashboard_regen`.

### ADR cross-reference integrity

- ADRs 0001 through 0079 exist on disk (0050 reserved gap per
  AGENTS.md). ✓
- ADR 0080 is referenced exactly once: in
  `decisions/0079-topic-registry-and-resolution-pattern.md:587`
  ("Alternative for ADR scope: separate ADR 0080 for resolution-
  pattern"). This is a legitimate reference (naming a rejected
  alternative); not an orphan. ✓

### W1→W4b ADR chain coverage

| ADR | W4a revision entry? | W4b revision entry? | Note |
|---|---|---|---|
| 0067 (Sections) | N/A (W4a didn't touch sections) | N/A — verified by `git blame` | `git blame packages/core/src/schema/section.ts` shows `'bridge'` was added in commit `3d618286` (Wedge A.5, 2026-05-21), pre-dating W4b. ADR 0067:80 already listed `bridge` in the discriminator. **W4b's commit-message `Amends: ... 0067` claim is overclaiming** — no actual ADR 0067 change happened in W4b — but no doc-drift gap exists. Downgrade to **commit-message-discipline note** only. |
| 0068 (Bridges) | N/A | ✓ Has W4b entry | OK |
| 0070 (Library) | ✓ Has W4a entry | ✓ Has W4b entry | OK |
| 0079 (Topics/Resolver) | N/A (new in W4b) | ✓ (W4b ships) | OK |

**A5-V1 (Minor — resolved):** Verified via `git blame` —
`'bridge'` was added to `section.ts` in commit `3d618286` (Wedge
A.5, 2026-05-21), well before W4b. ADR 0067:80 already listed
`bridge` in the discriminator. **No doc-drift gap; no ADR 0067
amendment needed.** Downgrade severity: commit-message
discipline note only — W4b's `Amends: ... 0067` claim is
overclaiming.

### AGENTS.md stale ADR count

`AGENTS.md:156` reads:

> Full catalog (77 ADRs, 0001–0078 with 0050 a reserved gap) lives
> in `docs/website/decisions/`.

Reality (verified by `ls`): ADRs 0001–0079 (78 ADRs excluding
0050). **A5-V2 (Minor):** update the count to "78 ADRs, 0001–0079"
when next AGENTS.md edit lands. Trivial one-line fix.

---

## A6 — Deferred tech debt disposition

W4b's acknowledged-deferred list (pilot report §"Out of scope" +
R+CR Minors) with proposed Phase B / Phase C / defer triage:

| # | Item | Source | Recommended disposition |
|---|---|---|---|
| 1 | `audit_overrides` demo smoke fixture | W4b Q2 lock | **Defer-with-trigger** — W4c may demonstrate via a Topics Spec page render path; if not, ship a tiny smoke fixture in a follow-up PR. Not pre-W4c. |
| 2 | N3: `resetSkillReviewResolverCache` test-only export visibility | W4b R+CR N3 | **Defer** — ship-as-is per ADR 0061 (one-file focused module); revisit if a second test-only export emerges |
| 3 | N4: `RESERVED_PATHS` DRY between BR-1 + future routes | W4b R+CR N4 | **During-W4c-if-second-consumer-emerges** — W4c's per-entry Spec routes may need to know about reserved paths; revisit at design-doc time |
| 4 | N5: Topic Spec page renders labels only, not Prompt/Answer body | W4b R+CR N5 | **During-W4c** — when `<LibraryCollectionShell>` extracts, Topics Spec page should ALSO get the shell + render Prompt/Answer inline; fold into the W4c shell-extraction scope |
| 5 | N6: smoke vs test-fixture `exponents` card-count divergence | W4b R+CR N6 | **Defer** — no correctness issue; both fixtures exercise their intended path |
| 6 | N7: YAML pipe-block consistency in topic files | W4b R+CR N7 | **Defer-with-trigger** — revisit when topics expand to 10+ |
| 7 | A1-X1: smoke-build gate filter name mismatch | This audit | **Pre-W4c** — update standing runbook from `--filter=@sophie/astro-smoke` → `--filter=smoke` (one-line) |
| 8 | A2-R6: 2 `#L\d+` line anchors in MyST docs | This audit | **Pre-W4c** (Phase B) — two single-line edits |
| 9 | A2-R7: `topic.ts:51` missing-id silent skip + `inline-refs.ts:56` comment correction | This audit | **Defer** — Minor; surface in next audit-pass or fold into a doctrine-codification PR |
| 10 | A2-R9: NavChapter/NavModule duplicated in ModuleNav.astro | This audit | **Pre-W4c (Phase B)** — single 5-line import refactor; Important R9 violation |
| 11 | A3: PRA-2 honoring `audit_overrides` (consistency with PRA-1) | This audit | **During-W4c** — mirrors PRA-1 escape; same ADR (0079); ~30 LOC; fold into W4c since W4c touches Topics surface anyway |
| 12 | A5-V1: ADR 0067 W4b revision-history entry — RESOLVED | This audit | **Defer** — verified `bridge` predates W4b (Wedge A.5, 2026-05-21); no doc-drift; commit-message overclaim noted but not actionable |
| 13 | A5-V2: AGENTS.md stale ADR count "77 ADRs, 0001-0078" | This audit | **Defer-or-fold** — update at next AGENTS.md edit; not blocking |

---

## A7 — Architecture forward-look (questions for Anna)

The four questions below need Anna's input before Phase C scope
locks. Phrased as `AskUserQuestion`-ready forks.

### Q-FL1: Pre-W4c Phase B scope

Phase A surfaced 4 items recommended for "Pre-W4c (Phase B)" (A5-V1
resolved, dropped from list):

- A1-X1 smoke-build gate filter (docs)
- A2-R6 two `#L\d+` anchor fixes (docs)
- A2-R9 NavChapter/NavModule helper-import refactor (1 file, ~5 lines)
- (Optional) A5-V2 AGENTS.md stale count (1 line)

**Total estimate: 1 small commit per item, ~4-5 commits, 1 PR with
maybe 1 hr work.** Or skip Phase B entirely and fold all into W4c
docs-batch (W4c's Batch 9 docs sweep already exists per the W4b
precedent). **Fork:** dedicated Phase B PR, or fold into W4c?

### Q-FL2: PRA-2 audit_overrides honoring

A3 surfaced PRA-2 as the natural "same-family" sibling of PRA-1
that should also honor `audit_overrides`. ~30 LOC + tests; ADR 0079
revision-history entry. **Fork:** in-scope for W4c, or defer to a
follow-on PR after W4c?

### Q-FL3: KeyInsights Spec route (meta-plan Q4b §3 open)

Meta-plan flagged "consider whether KeyInsights warrant a Spec
route or stay rollup-only." Phase A observation: KeyInsightEntry
has `title?` + `body` + `unit` + `anchor` — enough to render a
Spec page like other rooms. But KeyInsights often have NO title
(unlike Equations / Glossary terms), so the Spec-page URL would
need to fall back to anchor. **Fork:** ship Spec route in W4c
(consistent with the other 5 W4a-era rooms), or defer with
documented reason?

### Q-FL4: 27-decision roadmap ordering vs W4c

Roadmap (`reference_course_website_roadmap`) names 27 decisions:
Tier 1/2/3 model, Library, slides↔readings, Schedule, Assessment
cluster, etc. W4c ships 9 Library rooms. **Fork:** does any
roadmap-decision EXPECT a piece of W4c that's deferred (e.g., Tier
2 Cheatsheet PDF export, ADR 0070 §"Auto-generated formula
sheets"), and if so, should W4c expand to include it? Or stays
out-of-scope?

---

## Triage proposal (Phase B vs Phase C vs Defer)

| Item | Severity | Phase | Notes |
|---|---|---|---|
| A1-X1 smoke-build gate filter | Minor | **Phase B** (docs-only) | 1-line runbook fix; or fold into W4c batch 9 |
| A2-R6 two `#L\d+` anchors | Important | **Phase B** (docs-only) | 2 single-line edits |
| A2-R7 topic.ts:51 missing-id | Minor | **Defer** | Defensive guard; surface in next audit |
| A2-R7 inline-refs.ts:56 comment | Minor | **Defer** | Comment correction; not load-bearing |
| A2-R9 NavChapter/NavModule | Important | **Phase B** | 5-line refactor; ModuleNav.astro imports from helpers |
| A2-R9 test-mock duplications | Minor | **Defer + codify R9 split** | Refine R9 into production-strict + test-flexible |
| A3 PRA-2 audit_overrides honoring | Minor | **Phase C (fold into W4c)** | Same family as PRA-1; mirror the W4b shape |
| A3 bridge filtering verification | Open question | **Phase C (verify during design)** | Pagefind + PRA-1 iteration order |
| A4 Course* axe-core test coverage | Important | **Phase C (W4c scope)** | Already in W4c per meta-plan Q4a; ensure scope language covers all 6 not just 3 new |
| A5-V1 ADR 0067 W4b revision entry | Minor (RESOLVED) | **Defer** | Verified: `bridge` predates W4b (Wedge A.5, commit 3d618286); no doc-drift |
| A5-V2 AGENTS.md count | Minor | **Defer-or-fold** | Update at next AGENTS.md edit |
| A6 #1 audit_overrides smoke fixture | Minor | **Defer with trigger** | Wait for natural surface |
| A6 #4 N5 Topic Spec body render | Important | **Phase C (W4c scope)** | Fold into shell-extraction work |

**Summary:**
- **Phase B candidates (4 items):** smoke-runbook fix, 2× R6 anchors, R9 NavChapter import refactor.
- **Phase C (W4c) folds (4 items):** PRA-2 audit_overrides, Course* axe-core coverage (already planned), N5 Topic Spec body render, bridge-filtering verification questions.
- **Defer (8 items):** A5-V1 (resolved — `bridge` predates W4b), test-mock R9, topic.ts:51 + inline-refs.ts:56 comments, AGENTS.md count, audit_overrides smoke fixture, N3, N6, N7.

---

## Verification posture

- Gates run from worktree `feat/wedge-b-followup-w4c` at HEAD =
  `origin/main` `e128316` (identical state — branch has no own
  commits yet).
- Audit conducted under W1–W4 working principles
  (`AGENTS.md` 2026-05-23). W1 — no assumptions; W2 — read-only
  audit; W3 — touched only `docs/reviews/` (this file); W4 —
  success criteria locked in the plan, all sections populated.
- This document lands directly on `main` per
  `feedback_branch_pr_scope` (reviews land on main).
- Anna's triage decisions drive Phase B/C/D execution.

---

## Open questions before Phase B/C kicks off

1. **Q-FL1** — Phase B as its own PR vs fold into W4c docs?
2. **Q-FL2** — PRA-2 audit_overrides honoring in W4c or after?
3. **Q-FL3** — KeyInsights Spec route in W4c or defer?
4. **Q-FL4** — 27-decision roadmap ordering: any blockers between
   W4c and downstream decisions?

PAUSE — awaiting Anna's triage.
