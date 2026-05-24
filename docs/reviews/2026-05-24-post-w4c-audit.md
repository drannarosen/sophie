# Post-W4c platform audit (2026-05-24)

**Branch:** `main` at `af6ef94` (Wedge B-followup W4c squash-merge,
PR #163, 2026-05-23). Audit run from `/Users/anna/Teaching/sophie/`.

**Scope:** code + architecture audit AFTER W4c lands the
`<LibraryCollectionShell>` + 3 OMIFlow rollups (Course Observables/
Models/Inferences) + 9 per-entry Spec routes + 3 new audit invariants
+ PRA-2 `audit_overrides` graduation. Catalog-only; no fixes. Anna
triages finding-by-finding.

**Authorship:** Claude (Opus 4.7 1M), Phase A of post-W4c session.
Plan at `~/.claude/plans/you-re-starting-a-fresh-jolly-hanrahan.md`.

---

## A1 — Pre-launch hygiene baseline

| Gate | Status | Detail |
|---|---|---|
| `pnpm install --frozen-lockfile` | ✅ PASS | exit 0; 1.2s |
| `pnpm exec biome check` | ✅ PASS | 742 files; 0 errors, 0 warnings (grep-verified, 331ms) |
| `pnpm turbo run typecheck --force` | ✅ PASS | 11/11 packages; 26.9s; 3 ts(6385) hints in smoke `content.config.ts` (informational only — see A6-X1) |
| `pnpm turbo run test --filter='@sophie/*' --force` | ✅ PASS | 4/4 tasks; 17.3s |
| `pnpm --filter smoke build` | ✅ PASS | 129 pages built in 14.5s; 125 pedagogy entries indexed; Pagefind index built |
| `npx mystmd build --html` (in `docs/website/`) | ⚠️ **WARN** | exit 0; **16 MyST warnings** (no errors); 185 HTML files — see A5 |
| `pnpm exec playwright test` (from worktree root) | ✅ PASS | **159 passed / 5 skipped / 0 failed** — exact match with W4c post-merge baseline (1.3m) |

**Diff vs. W4c post-merge baselines:**

- Smoke build: 16 → **129 pages** (the W4c batches landed 113 new pages: 6 OMI rollups + 9 Spec routes × ~13 entries + observable/model/inference per-slug Specs). ✓
- E2E: **159 passed / 5 skipped / 0 failed** — exact match. ✓
- All other gates green.

**A1-X1 — MyST 16-warning regression (measurement gap, not pure
regression).** The post-W4b audit reported "zero warnings/errors,"
but it used the grep pattern `grep -cE "(error|warning)"` which does
not match MyST's `⚠️ <message>` emoji output. The 16 warnings caught
in this audit are a mix of (a) pre-existing items that previous audit
gates missed, and (b) at least 2 W4c-adjacent items (broken cross-ref
`artifact-4-six-new-audit-invariants` and the W4c R6 residual in ADR
0079). Categorized in A5. Recommendation: harden audit gate to use
`grep -iE "(^|[^a-z])(error|warning|⚠)"` or pipe `mystmd build` with
`--strict` if supported.

**A1-X2 — Playwright requires CWD = worktree root.** Running
`pnpm exec playwright test` from inside `docs/website/` returns "No
tests found" silently (testDir resolves relative to CWD, not config
location). Worth a runbook callout; pre-existing.

---

## A2 — R6–R9 retroactive sweep

### R6 — MyST anchor verification

`grep -rEn "#L[0-9]+" docs/website --include="*.md"`

| File:line | Disposition | Severity |
|---|---|---|
| `docs/website/pilots/wedge-b-followup-w4b-affordances.md:252/355/408` | Narrative quotes describing prior `#L103` violation; not live links | OK |
| `docs/website/_build/html/build/*.md` (12 matches) | Build artifacts; `_build/` is `.gitignore`-ed | OK |

**R6 clean post-W4c.** The W4b violations cited in `wedge-b-followup-
w4b-affordances.md` were resolved before W4c shipped; the file
contains them only as narrative.

### R7 — Silent-skip extractor sites disposition

Extended grep per W4c Batch 0.5b doctrine:

```
grep -rEn "if \(!\w+\) (return|continue)|if \(\w+ === undefined\)|if \(\w+ === null\)" \
  packages/astro/src/lib/pedagogy-index/extractors/
```

| Site | Filter | Disposition | Severity |
|---|---|---|---|
| `omi-flow.ts:75` | `if (kind === undefined) continue;` — unknown OMIFlow slot child kind | **None — no paired-invariant comment, no `findings.push`.** Silently drops unknown JSX children inside `<OMIFlow>`. **NEW W4c code; doctrine codification slipped past its own wedge.** | **Important (I1)** |
| `figures.ts:47` | `if (!name) return; // inline-mode <Figure src="...">` | Inline comment explains: inline-mode figures legitimately don't index | OK |
| `retrieval-prompt.ts:43` | `if (target === undefined) return;` | Multi-line comment: prop-type gate is the better surface | OK |
| `biography.ts:172` | `if (!hasAnyBiography) return undefined;` | Function-level early return (nothing to extract); not a per-item filter | OK |
| `skill-review.ts:71` | `if (target === undefined) return;` | Multi-line comment matching `retrieval-prompt.ts:43` | OK |
| `inline-refs.ts:60` | `if (!el.name) return;` | No comment; silently drops unnamed JSX | **Minor (M1)** |
| `inline-refs.ts:63` | `if (!target) return;` | No comment; silently drops JSX names not in `INLINE_REF_TARGETS` lookup | **Minor (M2)** |

**Remediation:** add disposition comments to the 3 violations
explaining either (a) why the silent skip is correct, or (b) push
a `findings` entry. `omi-flow.ts:75` is the most W4c-relevant:
unknown slot child kind could indicate a malformed OMIFlow callsite
worth surfacing to the author.

### R8 — Module-scoped MDX caches with HMR strategy

`grep -rEn "^(const|let) \w+ = new (Map|Set|WeakMap)" packages/astro/src/lib/mdx-plugins/ packages/astro/src/lib/pedagogy-index/`

| Site | Kind | HMR header? | Severity |
|---|---|---|---|
| `mdx-plugins/skill-review-resolver.ts:58` (`topicPathCacheByDir`) | Resolver cache | ✅ Comprehensive header at lines 40-50 citing `skill-review-resolver-vite.ts` companion plugin + `invalidateTopicFile` hook | OK |
| `mdx-plugins/skill-review-resolver.ts:60` (`topicAstCache`) | Resolver cache | ✅ Same header (same module) | OK |
| `mdx-plugins/skill-review-resolver.ts:70` (`topicToDependentChapters`) | Dep-map cache | ✅ Same header | OK |
| `pedagogy-index/transforms/chapter-opener.ts:30` (`CHROME_HEADING_TEXTS`) | Static `const Set` — literal lookup, not runtime-mutated | N/A — false-positive of R8 grep; static data needs no HMR | OK |

**R8 clean post-W4c.** No new module-scoped caches introduced; the
3 W4b resolver caches retain their header.

### R9 — Canonical interface declarations

`grep -rEn "^(export )?(interface|type) <Name>" packages/*/src/ --include='*.ts' --exclude='*.test.ts'`

| Name | Declarations | Severity |
|---|---|---|
| `FindingSink` | 1 — `packages/astro/src/lib/pedagogy-audit/types.ts` | OK |
| `AuditContext` | 1 — `packages/astro/src/lib/pedagogy-audit/context.ts` | OK |
| `AuditFinding` | **2** — `packages/components/src/contract/types.ts:10` (`interface`) + `packages/core/src/schema/audit.ts:54` (`type ... = z.infer<...>`) | **Important (I2 — pre-existing M5)** |
| `IndexAccumulator` | 0 (renamed/inlined post-W4b) | OK |
| `ExtractorFinding` | 0 (renamed/inlined post-W4b) | OK |

**I2 / pre-existing M5 — `AuditFinding` dual-declaration.** The
canonical-declaration discipline (R9-production) names exactly 1
declaration per interface. `AuditFinding` is hand-synced between a
TypeScript interface in `@sophie/components/contract/types.ts` and
a Zod-derived type in `@sophie/core/schema/audit.ts`. 15 files
reference the name across `@sophie/astro` + `@sophie/components` +
`@sophie/core`. Structural fix is one direction — likely
`import type { AuditFinding } from "@sophie/core"` everywhere,
deleting the components-side interface. Was flagged in W4c R+CR as
M5 and deferred; still unresolved.

---

## A3 — Cross-cutting consistency after W4c expansion

### Axe test pattern consistency (container-axe.ts adoption)

Plan estimated "14 axe test files written by 14 different subagents
during W4c Batches 4–8." Actual count: **19 axe test files** under
`packages/astro/src/components/*.axe.test.{ts,tsx}` (the W4c-NEW
subset is 14; the total includes 5 pre-W4c). Sampled 3 (CourseObservables,
EquationSpecContent, LibraryCollectionShell):

| Pattern | Adopted? |
|---|---|
| `// @vitest-environment node` pragma at top of file | ✅ all 3 |
| `container-axe.ts` helper import + `setupAxeDom() / renderAstroToBody()` | ✅ all 3 |
| Structured JSDoc preamble (purpose, Batch, ADR mandate, scenarios) | ✅ all 3 |
| Singleton-seeding pattern (where applicable, e.g., Course\*) | ✅ all 3 |
| Component-split rationale (where applicable, e.g., \*SpecContent) | ✅ EquationSpecContent doc cites W4c Batch 7 split decision |

**No drift detected.** 14-subagent parallel authorship produced
near-identical test shape across the 14 W4c-NEW axe specs. The
`container-axe.ts` helper's comprehensive JSDoc (60+ lines of
preamble + setup + usage) acted as a strong template.

### 9 Spec routes — per-kind URL param consistency

Located under `examples/smoke/src/pages/library/`:

| Route | Param | Source-of-truth match (per W4c Surprise #7) |
|---|---|---|
| `equations/[id].astro` | `id` | EquationRegistryEntry `id` (direct match; no slugify) |
| `figures/[name].astro` | `name` | Figure registry `name` (raw match; no slugify) |
| `glossary/[slug].astro` | `slug` | `slugify(GlossaryEntry.term)` |
| `key-insights/[slug].astro` | `slug` | `slugify(KeyInsightEntry.title)` ?? `${unit}-${anchor}` |
| `misconceptions/[slug].astro` | `slug` | `slugify(MisconceptionEntry.label)` ?? `${unit}-${anchor}` |
| `observables/[slug].astro` | `slug` | `${unit}-${anchor}` from OMIFlowEntry |
| `models/[slug].astro` | `slug` | `${unit}-${anchor}` from OMIFlowEntry |
| `inferences/[slug].astro` | `slug` | `${unit}-${anchor}` from OMIFlowEntry |
| `topics/[topicId].astro` | `topicId` | TopicEntry `id` (direct match) |

Three matching strategies (direct-id / raw / slug-or-fallback)
correspond to three audit-invariant surfaces. Pattern is well-
modeled but consolidation into a `lookupByRefKey<TKind>` helper is
a future opportunity (carry-forward Surprise #7 → not Phase B).

### 4 new audit invariants — verification

| Invariant | Severity | Source | Tests | Baseline entry |
|---|---|---|---|---|
| `KI-slug-unique` | ERROR | `invariants/key-insights.ts:36+` | `key-insights.test.ts:45+` | `audit-baseline.md:84` ✅ |
| `Misconception-slug-unique` | ERROR | `invariants/misconceptions.ts` | `misconceptions.test.ts:48+` | `audit-baseline.md:85` ✅ |
| `PRA-2-grain` | WARNING | `invariants/topic-consistency.ts:48-67` | `topic-consistency.test.ts:211+` | `audit-baseline.md:83` ✅ |
| `PRA-2-honoring` | (not a separate invariant) | (graduates existing PRA-2 to honor `audit_overrides` in both directions A+B) | — | — |

**A3-X1 — Plan/prompt conflated "4 new invariants" count.** Only
**3 new named invariants** landed in W4c; the fourth ("PRA-2-honoring")
is a graduation of the existing PRA-2 invariant to honor
`audit_overrides` in both directions. Tests covering the bidirectional
honoring live at `topic.test.ts:132` (direction B, body→frontmatter
via extractor) + `topic-consistency.test.ts:125` (direction A,
frontmatter→body via audit). `audit-baseline.md:82` documents the
graduation in the existing PRA-2 entry. This is a documentation
discrepancy, not a code gap — the bidirectional honoring is correctly
implemented and tested.

---

## A4 — W4c carry-forward + deferred Minors + smoke fixture drift

Walking each of the 9 W4c carry-forward items + the 3 deferred
Minors + the smoke fixture drift:

| # | Item | Status | Triage |
|---|---|---|---|
| 1 | Structural option-b for PRA-1/PRA-2 grain asymmetry (M5 territory in W4c R+CR; ADR 0053 amendment) | Unresolved; ADR amendment required | **Defer** — Wedge D / ADR territory |
| 2 | 17 axe-in-e2e specs `.withTags("wcag21aa","best-practice")` sweep | **Count corrected to 21**; only `library-rooms-axe.spec.ts` has the new pattern; 21 specs need the sweep | **Phase B candidate (B4)** — mechanical sweep, high a11y payoff |
| 3 | Container API setup hardening (vite 7/8 augmentation seam) | Unresolved; upstream Vite work | **Defer** — too large; upstream-dependent |
| 4 | Back-link linkification across 9 Spec routes | All 9 routes show 0 `<a href>` tags and 0 backlink keywords | **Phase B candidate (B8)** if Unit→URL mapping is locked; else **Defer** |
| 5 | Figure registry getStaticPaths timing (W4c Surprise #8) | Unresolved; needs accumulator-exposes-FigureRegistry refactor | **Defer** — architectural |
| 6 | YAML→JSX scan leak in resolver (W4c Surprise #10) | Unresolved; real platform fragility | **Defer** — architectural; needs MDX parser boundary work |
| 7 | R10 codification (landmark choice doctrine) | Drafted verbatim in W4c pilot lines 503-523 | **Phase B candidate (B1)** — XS; pure text edit to AGENTS.md + memory mirror |
| 8 | R7 grep-pattern extension (`=== undefined` / `=== null`) | Drafted verbatim in W4c pilot lines 525-539 | **Phase B candidate (B2)** — XS; pure text edit |
| 9 | Per-card Spec routes per ADR 0079 | Unresolved; Wedge D territory | **Defer** — Wedge D scope |

**3 deferred Minors from W4c R+CR:**

| ID | Item | Verification | Triage |
|---|---|---|---|
| M1 | 3 OMIFlow rollups share ~95% code | ✅ Confirmed: 3 files each 99 lines; diff shows only role-substitution constants differ (`observable`/`model`/`inference`, heading defaults, `collection` prop). Structural code is identical. | **Phase B candidate (B5)** — DRY threshold clearly met (≥3 callers); ~30-line factory + 3 thin wrappers |
| M2 | 2 slug-unique invariants identical | ⚠️ Partial: `key-insights.ts` (119 lines) bundles K1 coverage + KI-slug-unique; `misconceptions.ts` (95 lines) has only Misconception-slug-unique. Slug-unique *logic* is duplicated but co-located with other concerns in one file. | **Phase B candidate (B6)** with care — extract `checkSlugUnique<T>(...)` helper; touch both invariant files |
| M5 | `AuditFinding` dual-declaration (R9-production) | ✅ Confirmed at A2-I2 | **Phase B candidate (B7)** — structural cleanup; touches 15 referencing files via codemod-style rename |

**Smoke fixture content drift:**

| Site | Problem | Triage |
|---|---|---|
| `examples/smoke/src/content/topics/math/logarithms.mdx:13` | References `stefan-boltzmann-luminosity`; actual equation id is `stefan-boltzmann` (other references in `inverse-square-law.mdx`, `wiens-law.mdx`, `reading.mdx` correctly use `stefan-boltzmann`) | **Phase B candidate (B3)** — trivial 1-line fix |

---

## A5 — Documentation health

### validation.md regen drift check

`pnpm tsx scripts/regenerate-validation-index.mts` produces **0 lines
of diff** vs. the committed `docs/website/status/validation.md`. 105
contracts indexed; 0 extractor findings. Status summary: 14 Validated,
17 In progress, 74 Unvalidated, 0 Re-validation needed, 0 Missing block.
✅ Per `feedback_validation_dashboard_regen` discipline.

### W4c ADR revision-history entries

Sampled 0058 (Epistemic Component Contract), 0070 (Library + Spec
Pages), 0079 (Topic Registry):

| ADR | W4c entries | Accuracy |
|---|---|---|
| 0058 | 6+ dated 2026-05-23 covering Observable/Model/Inference rollup chrome (§4 slot-name-binds-role), per-callsite Spec routes (`data-epistemic-role` attribution) | ✅ Match shipped code |
| 0070 | 9+ dated 2026-05-23 covering 9 Spec route landings, W4c D1 Objectives-rollup exception (no Spec route), shell-extraction landmark a11y fix | ✅ Match shipped code |
| 0079 | 8+ dated 2026-05-23 covering W4c PRA-2 graduation, `audit_overrides` directional honoring, Card inline-render upgrade (Task 8.4) | ✅ Match shipped code |

### chapter-components.md Library section

Table at lines 177-186 documents all **10 Library rooms** (Glossary,
Equations, Figures, Misconceptions, Key Insights, Objectives, Topics,
Observables, Models, Inferences) with rollup + Spec route URLs + per-
room rendering notes. Library hub callout at line 206 names "all 10
Course-level rooms above (6 W4a-era + Topics from W4b + 3 W4c OMIFlow
rollups)". ✅ Reflects shipped post-W4c surface.

### MyST 16 warnings (from A1) — categorized

| Category | Count | Items |
|---|---|---|
| Cross-ref-target-not-found | 6 | `0079:427 → audit_overrides-chapter-frontmatter` (known W4c R6 residual); `misconception-graph-schema.md:303 → artifact-4-six-new-audit-invariants` (W4c-adjacent: cites the 3 new invariants with wrong slug); `aas-epd-mini.md:16/36/86 → co-author-leads` (×3); `sdsu-internal.md:59/91 → thread-b--hsi-learning-outcomes-comparative-study` (×2) |
| Implicit-heading-ref preferences | 5 | `cli.md:35`; `validation-tracker.md:217/456`; `0079:255 §rationale`; `validation.md:65 §sophie` |
| Citation-not-found | 4 | `0026:128 §theme`; `0027:83 §astrojs/mdx`; `roadmap.md:35 §media`; `validation.md:67 §sophie/core` |
| Non-MyST node deprecation | 1 | `node:3994 [DEP0169]` `url.parse()` deprecation (downstream library, not user code) |

**A5-X1 — `status/validation.md` generator emits 2 of its own
MyST warnings** (`§sophie` implicit-heading + `sophie/core` citation
not linked). The regenerator (`packages/astro/src/lib/validation/
index-generator.ts`) should emit explicit heading anchors + citation-
linked package names. Meta-quality bug in the dashboard pipeline.

**A5-X2 — ADR 0079 W4c R6 residual** persists (`audit_overrides-
chapter-frontmatter` cross-ref doesn't resolve because the referenced
ADR 0053 anchor MyST-slugifies differently). Pre-W4c known issue;
classification "out-of-W4c scope" per pilot report. Could fix by
either renaming the anchor in 0053 or adjusting the cross-ref slug
in 0079. Either way ≤5-line edit; **Phase B candidate (B11)** if Anna
wants the 16-warning baseline at zero.

---

## A6 — Tech debt sweep (un-logged W4c items)

| ID | Item | Severity | Notes |
|---|---|---|---|
| A6-X1 | Smoke `content.config.ts` Astro-5 `z`-import deprecation (3 ts(6385) hints in typecheck output) | **Minor** | `import { defineCollection, z } from "astro:content"` is deprecated; recommended `import { z } from "astro/zod"` or use `zod` directly. Pre-existing Astro 5 migration loose end. |
| A6-X2 | `validation.md` generator emits 2 of its own MyST warnings | **Minor** | See A5-X1 |
| A6-X3 | A1 measurement-gap doctrine: prior `(error|warning)` grep missed 16 MyST ⚠️ warnings | **Important** | Doctrine fix for future audit gates: extend grep to `(error|warning|⚠)` OR pipe with explicit `--strict` flag. This makes future audits authoritative. |
| A6-X4 | OMIFlow extractor R7 violation (A2 I1, `omi-flow.ts:75`) ships W4c-NEW code that violates W4c-codified doctrine | **Important** | Doctrine self-application failure mode (mirrors W4c Surprise #1). Codification commits applied during a wedge don't retroactively scan code written in the *same wedge*. Class-of-issue lesson worth memory-mirror. |
| A6-X5 | `feedback_review_rules_r6_r9.md` memory mirror missing R10 + R7-extension (drafted in W4c pilot, never written) | **Minor** | Codification gap; memory file should mirror AGENTS.md additions. Anna's standing pattern is to drop the rule into AGENTS.md *and* the memory mirror in the same commit. **Phase B candidate** (bundles with B1 + B2). |

---

## A7 — Architecture forward-look

Questions for Anna at triage:

### A7-Q1 — Wedge D scope

ADR 0069 (FSRS Spaced Repetition Engine) **is landed** (correction to
plan note); `CardEntry` shipped in W4b at `packages/core/src/schema/
pedagogy-index-entries/card.ts`; per-card Spec routes deferred from
W4c (carry-forward #9). The Wedge D foundation is in place.

**Question:** what does Wedge D deliver?

- Per-card Spec routes (`/library/cards/<topic>/<card-id>/`)?
- FSRS scheduler implementation (consumes `CardEntry` + `<SkillReview>`
  callsites; persists per-card review state via `useInteractive` + IDB)?
- Both, as Wedge D batches?
- Sliced differently (e.g., scheduler in W5, card Specs in W6)?

### A7-Q2 — Tier 1 surface gaps before ASTR 201 migration

Per the 27-decision roadmap, Tier 1 must-ship includes Course Info /
Syllabus / Schedule / Resources routes (alongside the Content + Library
rooms that already ship). None of these have shipped routes yet.

**Question:** does Phase C migration require these to ship first, OR
can the ASTR 201 pilot migrate Content + Library only and stub the
other Tier 1 surfaces? The 27-decision roadmap may or may not have a
sequencing answer.

### A7-Q3 — Phase C migration timing

**Question:** migrate ASTR 201 with the current post-W4c platform
surface, OR wait for Wedge D (FSRS + per-card Specs)?

Pro-now: validates ADR 0064 migration playbook end-to-end with the
shipped Topic + SkillReview surface (W4b) + Library rooms (W4c). The
m2-l3 pilot already proved the GlossaryTerm-heavy density profile;
the next chapter exercises a different profile (per ADR 0064 §4
structural-density-rotation).

Pro-defer: per-card Spec routes per ADR 0079 would surface card-level
discoverability for the migrated ASTR 201 chapters. Without them, the
chapters still work but card-level reviews don't have stable URLs.

### A7-Q4 — AI authoring co-author UI surface (ADR 0030)

ADR 0030 names four AI roles (author / pedagogy / domain / brainstorming).
No shipped UI surface today — authors invoke AI via direct prompting
in `claude-code` or Claude.ai web.

**Question:** does Phase D documentation describe a future UI surface
(roadmap), OR capture only the workflow authors can run today
(MDX + prompting)?

### A7-Q5 — Roadmap decision-complete checkpoints

Per the 27-decision roadmap excerpt at lines ~40-50, **Decision 14
(single top-level Library room for all registries)** is now shipped
post-W4c (10 sub-rooms live; ADR 0070 W4c). That's the first
roadmap-decision-complete checkpoint worth flagging.

**Question:** which other roadmap decisions does Anna want to
checkpoint-mark as shipped on the roadmap doc itself (status update)?

---

## Triage summary — Phase B candidates vs defer

Listed by effort + payoff. Anna confirms scope before any Phase B
work begins.

### Recommended Phase B (high payoff, low risk)

| ID | Item | Effort | Source |
|---|---|---|---|
| B1 | R10 codification in AGENTS.md (verbatim language drafted) | XS | A4 #7 |
| B2 | R7 grep-pattern extension in AGENTS.md (verbatim language drafted) | XS | A4 #8 |
| B3 | Smoke fixture content fix (`stefan-boltzmann-luminosity` → `stefan-boltzmann`) | XS | A4 smoke drift |
| B-Doctrine | Memory-mirror update (`feedback_review_rules_r6_r9.md` gains R10 + R7-extension; bundles with B1 + B2) | XS | A6-X5 |
| B-3R7 | Fix 3 R7 violations (`omi-flow.ts:75`, `inline-refs.ts:60`, `inline-refs.ts:63`) — add disposition comments OR `findings.push` | S | A2 I1, M1, M2 |
| B4 | 21 axe-in-e2e specs `.withTags("wcag21aa","best-practice")` sweep | M | A4 #2 |

### Mid-size Phase B (Anna decides)

| ID | Item | Effort | Source |
|---|---|---|---|
| B5 | M1 — extract 3 OMIFlow rollups to factory helper | M | A4 M1 |
| B6 | M2 — consolidate slug-unique invariants helper | S | A4 M2 |
| B7 | M5 — resolve `AuditFinding` dual-declaration (codemod 15 files) | M | A2 I2 |
| B8 | Topic Spec back-link linkification across 9 routes (needs Unit→URL mapping confirmation first) | M | A4 #4 |
| B11 | ADR 0079 W4c R6 residual fix (rename anchor in ADR 0053 OR adjust cross-ref) | XS | A5-X2 |
| B12 | A1 doctrine fix: harden MyST gate grep to catch ⚠️ warnings | XS | A6-X3 |
| B13 | `validation.md` generator: emit explicit headings + citation-linked package names | S | A5-X1 |

### Defer (Wedge D or architectural)

| Item | Reason |
|---|---|
| Carry-forward #1 (PRA-1/PRA-2 grain asymmetry structural fix) | ADR amendment territory; Wedge D scope |
| Carry-forward #3 (Container API setup hardening) | Upstream Vite work; large |
| Carry-forward #5 (Figure registry getStaticPaths timing) | Architectural refactor |
| Carry-forward #6 (YAML→JSX scan leak in MDX parser) | Architectural; parser boundary work |
| Carry-forward #9 (Per-card Spec routes per ADR 0079) | Wedge D scope |
| Smoke `content.config.ts` Astro-5 `z` deprecation (A6-X1) | Migration loose end; not blocking |
| Spec route `lookupByRefKey<TKind>` consolidation (A3 Surprise #7 follow-on) | DRY-threshold met by 9 callsites but blends with carry-forward #5 |

---

## Notes for Phase C / D

These don't fix anything in Phase B — they inform the next sessions:

- **Phase C ASTR 201 migration**: the m2-l3 pilot is the lone existing
  worked example. Per ADR 0064 §4 structural-density-rotation, the
  next chapter must differ in dominant density. Picking a math-heavy
  or MultiRep-heavy chapter exercises a different density profile.
  Phase C C.2 (file-structure brainstorm) will surface this.
- **Phase D authoring docs**: the new `authoring/` directory has no
  existing scaffolding. `chapter-components.md` (715 lines) is
  audit-focused; `scientific-reasoning-os.md` covers epistemic roles
  but not chapter authoring end-to-end. The capabilities-tour +
  context-graph pages are highest-leverage starting points.

---

**End of audit.** Pause for Anna's review + triage decisions.
Phase B candidates (B1 / B2 / B3 / B4 / B-Doctrine / B-3R7) are the
high-confidence shortlist; B5 / B6 / B7 / B8 / B11 / B12 / B13 await
Anna's call.
